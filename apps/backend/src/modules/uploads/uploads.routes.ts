import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middleware/auth.guard.js";
import {
  uploadIntentRequestSchema,
  uploadIdParamSchema,
  uploadIntentResponseSchema,
  uploadFinalizedResponseSchema,
} from "./uploads.dto.js";
import { uploadsService } from "./uploads.service.js";

export const uploadsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /uploads/intents
   * Request R2 image upload intent (OpenAPI v1.0)
   */
  app.post(
    "/uploads/intents",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      // 1. Validate request body
      const parsed = uploadIntentRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format request intent upload tidak valid",
            request_id: request.id,
            details: parsed.error.issues,
          },
        });
      }

      const { purpose, content_type, size_bytes } = parsed.data;

      // 2. Create upload intent via uploads service
      const intent = await uploadsService.createUploadIntent(
        request.currentUser!,
        purpose,
        content_type,
        size_bytes
      );

      const response = uploadIntentResponseSchema.parse({
        data: intent,
      });

      return reply.status(201).send(response);
    }
  );

  /**
   * POST /uploads/:upload_id/finalize
   * Finalize verified R2 image upload (OpenAPI v1.0)
   */
  app.post(
    "/uploads/:upload_id/finalize",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      // 1. Validate route params
      const parsedParams = uploadIdParamSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter upload_id harus berupa UUID valid",
            request_id: request.id,
          },
        });
      }

      const { upload_id } = parsedParams.data;

      // 2. Finalize upload via uploads service
      const finalized = await uploadsService.finalizeUpload(
        request.currentUser!,
        upload_id
      );

      const response = uploadFinalizedResponseSchema.parse({
        data: finalized,
      });

      return reply.status(200).send(response);
    }
  );

  /**
   * Mock PUT endpoint for local testing and direct upload verification
   */
  app.put("/mock-r2/:bucket/*", async (request, reply) => {
    const rawKey = (request.params as any)["*"];
    const contentType = request.headers["content-type"] as string;
    const body = request.body as Buffer;

    await uploadsService.simulatePut(
      rawKey,
      Buffer.isBuffer(body) ? body : Buffer.from(body || ""),
      contentType || "application/octet-stream"
    );

    return reply.status(200).send();
  });
};
