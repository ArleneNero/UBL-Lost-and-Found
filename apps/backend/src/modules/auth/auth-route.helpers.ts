import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

/**
 * Resolves a trusted frontend origin for password reset links, preventing Origin/Referer header poisoning.
 */
export function resolveTrustedFrontendOrigin(
  originHeader?: string,
  refererHeader?: string
): string {
  const fallbackOrigin = (() => {
    try {
      return new URL(env.FRONTEND_ORIGIN).origin;
    } catch {
      return "https://lostandfound-budiluhur.web.id";
    }
  })();

  const allowedOrigins = new Set<string>([
    fallbackOrigin,
    "https://lostandfound-budiluhur.web.id",
    ...(env.NODE_ENV !== "production"
      ? ["http://localhost:5173", "http://127.0.0.1:5173"]
      : []),
  ]);

  for (const candidate of [originHeader, refererHeader]) {
    if (!candidate) continue;
    try {
      const parsedOrigin = new URL(candidate).origin;
      if (allowedOrigins.has(parsedOrigin)) {
        return parsedOrigin;
      }
    } catch {
      // Ignore malformed Origin or Referer headers
    }
  }

  return fallbackOrigin;
}

export function sendValidationError(
  request: FastifyRequest,
  reply: FastifyReply,
  message: string,
  details?: unknown
) {
  return reply.status(400).send({
    error: {
      code: "VALIDATION_ERROR",
      message,
      request_id: request.id,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

/**
 * Maps caught route errors into uniform API envelopes without leaking raw exception details on 500s.
 */
export function handleAuthCatchError(
  request: FastifyRequest,
  reply: FastifyReply,
  err: unknown,
  logContext: string
) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        request_id: request.id,
      },
    });
  }

  request.log.error(err, logContext);
  return reply.status(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal server",
      request_id: request.id,
    },
  });
}

/**
 * Sliding-window per-IP anti-enumeration guard for student registration OTP duplicate probes (FIND-17).
 * Preserves 409 EMAIL_EXISTS / STUDENT_NUMBER_EXISTS for legitimate users while throttling scanners.
 */
export class AuthProbeLimiter {
  private readonly hitsByIp = new Map<string, number[]>();

  constructor(
    private readonly maxProbes: number = 5,
    private readonly windowMs: number = 15 * 60 * 1000,
    private readonly maxTrackedIps: number = 2000
  ) {}

  private pruneTimestamps(timestamps: number[], now: number): number[] {
    const cutoff = now - this.windowMs;
    return timestamps.filter((ts) => ts > cutoff);
  }

  check(
    clientIp: string,
    now: number = Date.now()
  ): { allowed: true } | { allowed: false; retryAfter: number } {
    const key = clientIp || "unknown";
    const existing = this.hitsByIp.get(key);
    if (!existing || existing.length === 0) {
      return { allowed: true };
    }

    const recent = this.pruneTimestamps(existing, now);
    if (recent.length === 0) {
      this.hitsByIp.delete(key);
      return { allowed: true };
    }

    this.hitsByIp.set(key, recent);
    if (recent.length >= this.maxProbes) {
      const oldestInWindow = recent[0];
      const retryAfter = Math.max(1, Math.ceil((oldestInWindow + this.windowMs - now) / 1000));
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  recordDuplicateProbe(clientIp: string, now: number = Date.now()): void {
    const key = clientIp || "unknown";
    const recent = this.pruneTimestamps(this.hitsByIp.get(key) ?? [], now);
    recent.push(now);

    if (!this.hitsByIp.has(key) && this.hitsByIp.size >= this.maxTrackedIps) {
      const oldestKey = this.hitsByIp.keys().next().value;
      if (oldestKey !== undefined) {
        this.hitsByIp.delete(oldestKey);
      }
    }

    this.hitsByIp.set(key, recent);
  }

  reset(): void {
    this.hitsByIp.clear();
  }
}

export const authProbeLimiter = new AuthProbeLimiter();
