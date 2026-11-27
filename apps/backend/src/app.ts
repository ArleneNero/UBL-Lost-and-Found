import Fastify, { FastifyInstance, FastifyError, FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { env, isMockTestDatabaseUrl } from "./config/env.js";
import { APP_VERSION, getDeployCommit } from "./config/version.js";
import { pool } from "./db/index.js";
import { AppError } from "./utils/errors.js";
import { ALLOWED_RASTER_MIME_TYPES, validateStorageKey, verifyStorageSignature } from "./utils/photoResolver.js";
import { postsRoutes } from "./modules/posts/posts.routes.js";
import { itemsRoutes } from "./modules/items/items.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { uploadsRoutes } from "./modules/uploads/uploads.routes.js";
import { officerRoutes } from "./modules/officer/officer.routes.js";
import { submissionsRoutes } from "./modules/submissions/submissions.routes.js";
import { r2Provider } from "./modules/uploads/storage/r2.provider.js";
import { OPENAPI_YAML_CONTRACT } from "./openapi.contract.js";

export interface BuildAppOptions {
  enableRateLimit?: boolean;
  useInMemoryRateLimit?: boolean;
}

const RASTER_EXT_MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const SWAGGER_DOCS_HTML = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CampusFind API Documentation — Swagger UI</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
<style>body{margin:0;padding:0;background:#fafafa}.topbar{display:none!important}</style></head>
<body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
<script>window.onload=()=>{window.ui=SwaggerUIBundle({url:'/openapi.yaml',dom_id:'#swagger-ui',deepLinking:true});};</script>
</body></html>`;

const RATE_LIMIT_UPSERT_SQL = `INSERT INTO rate_limit_buckets (bucket_key, hits, expires_at)
VALUES ($1, 1, NOW() + ($2::double precision * interval '1 millisecond'))
ON CONFLICT (bucket_key) DO UPDATE SET
  hits = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hits + 1 END,
  expires_at = CASE WHEN rate_limit_buckets.expires_at <= NOW() THEN NOW() + ($2::double precision * interval '1 millisecond') ELSE rate_limit_buckets.expires_at END
RETURNING hits, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (expires_at - NOW())) * 1000))::int AS ttl_ms`;

function isProductionRuntime(): boolean {
  return env.NODE_ENV === "production" || process.env.NODE_ENV === "production";
}

function sendErrorEnvelope(reply: FastifyReply, request: FastifyRequest, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({ error: { code, message, request_id: request.id } });
}

function buildAllowedCorsOrigins(): Set<string> {
  const allowed = new Set<string>();
  const isProd = isProductionRuntime();
  for (const rawEntry of env.FRONTEND_ORIGIN.split(",")) {
    const trimmed = rawEntry.trim();
    if (!trimmed) continue;
    try {
      const origin = new URL(trimmed).origin;
      if (isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) continue;
      allowed.add(origin);
    } catch {
      // Ignore malformed origin entries
    }
  }
  if (!isProd) {
    for (const port of [5173, 3000, env.PORT]) {
      allowed.add(`http://localhost:${port}`);
      allowed.add(`http://127.0.0.1:${port}`);
    }
  }
  return allowed;
}

function isSensitiveRateLimitPath(rawUrl: string | undefined): boolean {
  const pathOnly = (rawUrl || "").split("?")[0];
  return pathOnly.startsWith("/api/v1/auth/") || pathOnly.startsWith("/api/v1/student/") || pathOnly.startsWith("/api/v1/uploads/");
}

class ServerlessRateLimitStore {
  private readonly timeWindow: number;
  private readonly memoryBuckets = new Map<string, { current: number; expiresAt: number }>();
  private readonly useInMemory: boolean;

  constructor(options: { timeWindow?: number; useInMemory?: boolean }) {
    this.timeWindow = typeof options.timeWindow === "number" ? options.timeWindow : 60_000;
    this.useInMemory = options.useInMemory ?? (env.NODE_ENV === "test" && isMockTestDatabaseUrl(env.DATABASE_URL));
  }

  public child(routeOptions: RouteOptions & { path: string; prefix: string }): ServerlessRateLimitStore {
    const customWindow = (routeOptions as { timeWindow?: number }).timeWindow;
    return new ServerlessRateLimitStore({
      timeWindow: typeof customWindow === "number" ? customWindow : this.timeWindow,
      useInMemory: this.useInMemory,
    });
  }

  public incr(key: string, callback: (error: Error | null, result?: { current: number; ttl: number }) => void, timeWindow?: number): void {
    const windowMs = typeof timeWindow === "number" && timeWindow > 0 ? timeWindow : this.timeWindow;
    if (this.useInMemory) {
      const now = Date.now();
      const existing = this.memoryBuckets.get(key);
      if (!existing || existing.expiresAt <= now) {
        this.memoryBuckets.set(key, { current: 1, expiresAt: now + windowMs });
        return callback(null, { current: 1, ttl: windowMs });
      }
      existing.current += 1;
      return callback(null, { current: existing.current, ttl: Math.max(0, existing.expiresAt - now) });
    }
    pool
      .query<{ hits: number; ttl_ms: number }>(RATE_LIMIT_UPSERT_SQL, [key, windowMs])
      .then((res) => callback(null, { current: res.rows[0]?.hits ?? 1, ttl: res.rows[0]?.ttl_ms ?? windowMs }))
      .catch((err: Error) => callback(err));
  }
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const isTestRuntime = env.NODE_ENV === "test";
  const enableRateLimit = options.enableRateLimit ?? !isTestRuntime;
  const app = Fastify({
    trustProxy: true,
    logger: {
      level: isTestRuntime ? "silent" : "info",
      redact: ["req.headers.authorization", "req.headers.cookie", "*.email", "*.student_number", "*.token"],
    },
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
    requestIdHeader: "x-request-id",
  });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    try {
      if ((req as { body?: unknown }).body && typeof (req as { body?: unknown }).body === "object") {
        return done(null, (req as { body?: unknown }).body);
      }
      done(null, typeof body === "string" && body.trim().length > 0 ? JSON.parse(body) : body || {});
    } catch (err) {
      (err as FastifyError).statusCode = 400;
      done(err as Error, undefined);
    }
  });

  app.addContentTypeParser(
    ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  const allowedOrigins = buildAllowedCorsOrigins();
  app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  });

  if (!isProductionRuntime()) {
    app.addHook("onSend", async (_request, reply) => {
      if (!isProductionRuntime()) reply.header("Access-Control-Allow-Private-Network", "true");
    });
  }

  class ConfiguredRateLimitStore extends ServerlessRateLimitStore {
    constructor(storeOpts: { timeWindow?: number }) {
      super({ ...storeOpts, useInMemory: options.useInMemoryRateLimit });
    }
  }

  app.register(rateLimit, {
    global: true,
    timeWindow: 60_000,
    max: (req) => ((req.url || "").startsWith("/api/v1/uploads/") ? 30 : 20),
    skipOnError: true,
    allowList: (req) => !enableRateLimit || !isSensitiveRateLimitPath(req.url),
    keyGenerator: (req) => `${(req.url || "").split("?")[0].startsWith("/api/v1/uploads/") ? "uploads" : "auth"}:${req.ip}`,
    store: ConfiguredRateLimitStore,
    errorResponseBuilder: () => new AppError("RATE_LIMIT_EXCEEDED", "Terlalu banyak permintaan. Silakan coba lagi beberapa saat.", 429),
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    const code = error.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
    const message = statusCode === 500 ? "Terjadi kesalahan internal server" : error.message;
    return sendErrorEnvelope(reply, request, statusCode, code, message);
  });

  app.get("/openapi.yaml", async (_request, reply) => {
    reply.header("Content-Type", "text/yaml; charset=utf-8");
    return reply.send(OPENAPI_YAML_CONTRACT);
  });

  app.get("/docs", async (_request, reply) => {
    reply.header("Content-Type", "text/html; charset=utf-8");
    return SWAGGER_DOCS_HTML;
  });

  const healthHandler = async (request: FastifyRequest) => ({
    status: "ok",
    version: APP_VERSION,
    commit: getDeployCommit(),
    timestamp: new Date().toISOString(),
    request_id: request.id,
  });
  for (const healthPath of ["/", "/health", "/api/v1/health", "/api/health", "/api/v1"]) {
    app.get(healthPath, healthHandler);
  }

  // Storage endpoint: HMAC-signed read proxy with strict path traversal & raster MIME guard
  app.get<{ Params: { "*": string }; Querystring: { exp?: string; sig?: string } }>(
    "/storage/*",
    async (request, reply) => {
      const rawKey = request.params["*"];
      if (!rawKey) return sendErrorEnvelope(reply, request, 404, "NOT_FOUND", "Not Found");

      const safeKey = validateStorageKey(rawKey);
      if (!safeKey) return sendErrorEnvelope(reply, request, 400, "INVALID_STORAGE_KEY", "Storage key tidak valid");

      const sigCheck = verifyStorageSignature(safeKey, request.query?.exp, request.query?.sig);
      if (!sigCheck.valid) {
        const code = sigCheck.reason === "EXPIRED" ? "STORAGE_URL_EXPIRED" : "INVALID_STORAGE_SIGNATURE";
        return sendErrorEnvelope(reply, request, 403, code, "Tautan gambar tidak valid atau kedaluwarsa");
      }

      if (r2Provider.isConfigured) {
        try {
          const stream = await r2Provider.getObjectStream(safeKey);
          if (stream && stream.body) {
            const mime = stream.contentType.split(";")[0].trim().toLowerCase();
            if (!ALLOWED_RASTER_MIME_TYPES.has(mime)) {
              return sendErrorEnvelope(reply, request, 415, "UNSUPPORTED_MEDIA_TYPE", "Tipe media tidak diizinkan");
            }
            reply.header("Content-Type", mime);
            reply.header("X-Content-Type-Options", "nosniff");
            reply.header("Content-Security-Policy", "default-src 'none'");
            reply.header("Cache-Control", "private, max-age=300");
            return reply.send(stream.body);
          }
        } catch (err) {
          request.log.warn({ err }, "R2 stream error");
        }
      }

      if (isProductionRuntime()) return sendErrorEnvelope(reply, request, 404, "NOT_FOUND", "File not found");

      const storageRoot = path.resolve(process.cwd(), "storage");
      const fullPath = path.resolve(storageRoot, safeKey);
      if (!fullPath.startsWith(storageRoot + path.sep)) {
        return sendErrorEnvelope(reply, request, 400, "INVALID_STORAGE_KEY", "Storage key tidak valid");
      }
      if (!fs.existsSync(fullPath)) return sendErrorEnvelope(reply, request, 404, "NOT_FOUND", "File not found");

      const mimeType = RASTER_EXT_MIME_MAP[path.extname(fullPath).toLowerCase()];
      if (!mimeType || !ALLOWED_RASTER_MIME_TYPES.has(mimeType)) {
        return sendErrorEnvelope(reply, request, 415, "UNSUPPORTED_MEDIA_TYPE", "Tipe media tidak diizinkan");
      }
      reply.header("Content-Type", mimeType);
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("Content-Security-Policy", "default-src 'none'");
      return reply.send(fs.createReadStream(fullPath));
    }
  );

  app.register(postsRoutes, { prefix: "/api/v1" });
  app.register(itemsRoutes, { prefix: "/api/v1" });
  app.register(authRoutes, { prefix: "/api/v1" });
  app.register(uploadsRoutes, { prefix: "/api/v1" });
  app.register(officerRoutes, { prefix: "/api/v1" });
  app.register(submissionsRoutes, { prefix: "/api/v1" });

  return app;
}

let defaultAppInstance: FastifyInstance | null = null;
const appHandler = async function (req: unknown, res: unknown) {
  if (!defaultAppInstance) {
    defaultAppInstance = buildApp();
  }
  await defaultAppInstance.ready();
  defaultAppInstance.server.emit("request", req as never, res as never);
};

export default appHandler;
