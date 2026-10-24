import Fastify, { FastifyInstance, FastifyError } from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "crypto";
import { env } from "./config/env.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
    },
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
    requestIdHeader: "x-request-id",
  });

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

  return app;
}
