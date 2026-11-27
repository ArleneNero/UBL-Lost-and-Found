import type { FastifyPluginAsync } from "fastify";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.guard.js";
import {
  MAX_UPLOAD_SIZE_BYTES,
  uploadIntentRequestSchema,
  uploadIdParamSchema,
  uploadIntentResponseSchema,
  uploadFinalizedResponseSchema,
} from "./uploads.dto.js";
import { uploadsService } from "./uploads.service.js";
import { intentRegistry } from "./intent.registry.js";
import { validateIntentForFinalize } from "./upload.validator.js";
import { r2Provider } from "./storage/r2.provider.js";

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
      const intent = await uploadsService.createUploadIntent(
        request.currentUser!,
        purpose,
        content_type,
        size_bytes
      );

      const response = uploadIntentResponseSchema.parse({ data: intent });
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
      const finalized = await uploadsService.finalizeUpload(
        request.currentUser!,
        upload_id
      );

      const response = uploadFinalizedResponseSchema.parse({ data: finalized });
      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /uploads/:upload_id/content
   * Authenticated relay endpoint when direct browser-to-R2 PUT is blocked by CORS.
   */
  app.put(
    "/uploads/:upload_id/content",
    {
      preHandler: [authenticate],
      bodyLimit: MAX_UPLOAD_SIZE_BYTES,
    },
    async (request, reply) => {
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
      const rawIntent = await intentRegistry.get(upload_id);
      const intent = validateIntentForFinalize(rawIntent, request.currentUser!);

      const rawContentType = request.headers["content-type"];
      const normalizedContentType =
        typeof rawContentType === "string"
          ? rawContentType.split(";")[0].trim().toLowerCase()
          : "";

      if (!normalizedContentType || normalizedContentType !== intent.contentType) {
        return reply.status(422).send({
          error: {
            code: "CONTENT_TYPE_MISMATCH",
            message: `Header Content-Type harus tepat ${intent.contentType}`,
            request_id: request.id,
          },
        });
      }

      const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      if (body.length === 0) {
        return reply.status(422).send({
          error: {
            code: "EMPTY_UPLOAD",
            message: "Payload gambar tidak boleh kosong",
            request_id: request.id,
          },
        });
      }

      if (body.length > intent.sizeBytes) {
        return reply.status(422).send({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Ukuran file (${body.length} bytes) melebihi batas intent (${intent.sizeBytes} bytes)`,
            request_id: request.id,
          },
        });
      }

      await uploadsService.putRelayObject(intent.storagePath, body, intent.contentType);
      return reply.status(200).send({ data: { success: true } });
    }
  );

  // Mock PUT endpoint strictly limited to isolated test runs without live R2 credentials
  if (env.NODE_ENV === "test" && !r2Provider.isConfigured) {
    app.put<{ Params: { bucket: string; "*": string } }>(
      "/mock-r2/:bucket/*",
      async (request, reply) => {
        const rawKey = request.params["*"];
        const contentType = request.headers["content-type"] as string;
        const body = request.body as Buffer;

        await uploadsService.simulatePut(
          rawKey,
          Buffer.isBuffer(body) ? body : Buffer.from(body || ""),
          contentType || "application/octet-stream"
        );

        return reply.status(200).send();
      }
    );
  }
};
