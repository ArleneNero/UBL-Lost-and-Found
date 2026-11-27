import type { FastifyPluginAsync } from "fastify";
import { requireOfficer } from "../../../middleware/auth.guard.js";
import {
  itemCreateRequestSchema,
  inventoryQuerySchema,
  visibilityRequestSchema,
  postSettingsUpdateSchema,
  cleanInventoryRequestSchema,
} from "../officer.dto.js";
import { officerInventoryService } from "../officer-inventory.service.js";
import { z } from "zod";

const itemIdParamSchema = z.object({
  item_id: z.string().uuid("Format ID barang harus berupa UUID valid"),
});

export const officerInventoryRoutes: FastifyPluginAsync = async (app) => {
  /**
   * B/F.1: POST /officer/items
   */
  app.post(
    "/officer/items",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const parsed = itemCreateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format payload registrasi barang tidak valid",
            request_id: request.id,
            details: parsed.error.issues,
          },
        });
      }

      const item = await officerInventoryService.registerFoundItem(
        request.officerContext!,
        parsed.data
      );

      return reply.status(201).send({ data: item });
    }
  );

  /**
   * B/G.1.0: GET /officer/inventory
   */
  app.get(
    "/officer/inventory",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const parsedQuery = inventoryQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsedQuery.error.issues[0]?.message || "Parameter query inventaris tidak valid",
            request_id: request.id,
            details: parsedQuery.error.issues,
          },
        });
      }

      const query = parsedQuery.data;

      const result = await officerInventoryService.getInventory(
        request.officerContext!,
        {
          status: query.status,
          category: query.category,
          q: query.q,
          sort: query.sort,
          page: query.page,
          limit: query.limit,
          includeArchived: query.include_archived,
          archivedOnly: query.archived_only,
        }
      );

      return reply.status(200).send(result);
    }
  );

  /**
   * B/G.2.0: GET /officer/inventory/overdue
   */
  app.get(
    "/officer/inventory/overdue",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const overdueList = await officerInventoryService.getOverdue(request.officerContext!);
      return reply.status(200).send({ data: overdueList });
    }
  );

  /**
   * B/G.1.1: GET /officer/items/:item_id
   */
  app.get(
    "/officer/items/:item_id",
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

      const item = await officerInventoryService.getItemDetail(
        request.officerContext!,
        paramParse.data.item_id
      );

      return reply.status(200).send({ data: item });
    }
  );

  /**
   * B/G.1.2: PATCH /officer/items/:item_id/visibility
   */
  app.patch(
    "/officer/items/:item_id/visibility",
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

      const bodyParse = visibilityRequestSchema.safeParse(request.body);
      if (!bodyParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format visibility tidak valid",
            request_id: request.id,
            details: bodyParse.error.issues,
          },
        });
      }

      const item = await officerInventoryService.updateVisibility(
        request.officerContext!,
        paramParse.data.item_id,
        bodyParse.data.is_visible
      );

      return reply.status(200).send({ data: item });
    }
  );

  /**
   * GET /officer/post-settings
   */
  app.get(
    "/officer/post-settings",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const settings = await officerInventoryService.getPostSettings(request.officerContext!);
      return reply.status(200).send({ data: settings });
    }
  );

  /**
   * PATCH /officer/post-settings
   */
  app.patch(
    "/officer/post-settings",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const parsed = postSettingsUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Nilai batas simpan tidak valid (1–730 hari)",
            request_id: request.id,
            details: parsed.error.issues,
          },
        });
      }

      const updated = await officerInventoryService.updatePostSettings(
        request.officerContext!,
        parsed.data.storage_limit_days
      );

      return reply.status(200).send({ data: updated });
    }
  );

  /**
   * POST /officer/inventory/clean
   */
  app.post(
    "/officer/inventory/clean",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const parsed = cleanInventoryRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(422).send({
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Format filter arsip tidak valid",
            request_id: request.id,
            details: parsed.error.issues,
          },
        });
      }

      const result = await officerInventoryService.cleanCompletedInventory(
        request.officerContext!,
        parsed.data.month
      );

      return reply.status(200).send({ data: result });
    }
  );
};
