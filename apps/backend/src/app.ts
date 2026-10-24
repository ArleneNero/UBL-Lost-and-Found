import Fastify, { FastifyInstance, FastifyError } from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "crypto";
import { env } from "./config/env.js";
import { postsRoutes } from "./modules/posts/posts.routes.js";
import { itemsRoutes } from "./modules/items/items.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { uploadsRoutes } from "./modules/uploads/uploads.routes.js";
import { officerRoutes } from "./modules/officer/officer.routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.email",
        "*.student_number",
        "*.token",
      ],
    },
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
    requestIdHeader: "x-request-id",
  });

  // Support binary content types for direct image PUT simulation
  app.addContentTypeParser(
    ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
    { parseAs: "buffer" },
    (_req, body, done) => {
      done(null, body);
    }
  );

  // CORS
  app.register(cors, {
    origin: [env.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  });

  // Uniform Error Envelope: { error: { code, message, request_id } }
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    const code = error.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
    const message = statusCode === 500 ? "Terjadi kesalahan internal server" : error.message;

    reply.status(statusCode).send({
      error: {
        code,
        message,
        request_id: request.id,
      },
    });
  });

  // Health check endpoint (Internal)
  app.get("/health", async (request, reply) => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      request_id: request.id,
    };
  });

  // APIs (/api/v1)
  app.register(postsRoutes, { prefix: "/api/v1" });
  app.register(itemsRoutes, { prefix: "/api/v1" });
  app.register(authRoutes, { prefix: "/api/v1" });
  app.register(uploadsRoutes, { prefix: "/api/v1" });
  app.register(officerRoutes, { prefix: "/api/v1" });

  return app;
}
