import type { FastifyPluginAsync } from "fastify";
import { requireOfficer } from "../../../middleware/auth.guard.js";
import { returnRequestSchema, distributeRequestSchema } from "../officer.dto.js";
import { officerDispositionService } from "../officer-disposition.service.js";
import { z } from "zod";

const itemIdParamSchema = z.object({
  item_id: z.string().uuid("Format ID barang harus berupa UUID valid"),
});

export const officerDispositionRoutes: FastifyPluginAsync = async (app) => {
  /**
   * B/J.1.0: POST /officer/items/:item_id/return
   */
  app.post(
    "/officer/items/:item_id/return",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const paramParse = itemIdParamSchema.safeParse(request.params);
      if (!paramParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format ID barang tidak valid",
            request_id: request.id,
          },
        });
      }

      const bodyParse = returnRequestSchema.safeParse(request.body);
      if (!bodyParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format data serah terima pemilik tidak valid",
            request_id: request.id,
            details: bodyParse.error.issues,
          },
        });
      }

      const returnRecord = await officerDispositionService.returnItem(
        request.officerContext!,
        paramParse.data.item_id,
        bodyParse.data
      );

      return reply.status(201).send({ data: returnRecord });
    }
  );

  /**
   * B/J.1.2: POST /officer/items/:item_id/distribute
   */
  app.post(
    "/officer/items/:item_id/distribute",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const paramParse = itemIdParamSchema.safeParse(request.params);
      if (!paramParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format ID barang tidak valid",
            request_id: request.id,
          },
        });
      }

      const rawBody =
        request.body === undefined || request.body === null || request.body === ""
          ? {}
          : request.body;
      const bodyParse = distributeRequestSchema.safeParse(rawBody);
      if (!bodyParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format catatan penyaluran tidak valid",
            request_id: request.id,
            details: bodyParse.error.issues,
          },
        });
      }

      const item = await officerDispositionService.distributeItem(
        request.officerContext!,
        paramParse.data.item_id,
        bodyParse.data.notes
      );

      return reply.status(200).send({ data: item });
    }
  );
};
