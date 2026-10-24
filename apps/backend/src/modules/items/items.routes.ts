import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { itemsService } from "./items.service.js";
import { listItemsQuerySchema, itemParamSchema } from "./items.dto.js";

export const itemsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * B/C.2.0: GET /items
   * Listing public stored items with defensive filtering, sorting, pagination, and stable tie-breaker.
   */
  fastify.get("/items", async (request, reply) => {
    const parseResult = listItemsQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Parameter query tidak valid";
      return reply.status(400).send({
        error: {
          code: "INVALID_QUERY_PARAMS",
          message: firstError,
          request_id: request.id,
        },
      });
    }

    const response = await itemsService.listPublicItems(parseResult.data);
    return reply.status(200).send(response);
  });

  /**
   * B/C.2.1: GET /items/:item_id
   * Get single public found item detail.
   * Returns 404 if item does not exist, status != 'STORED', or is_visible = false.
   */
  fastify.get("/items/:item_id", async (request, reply) => {
    const parseResult = itemParamSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_PARAMETER",
          message: "ID barang harus berupa UUID yang valid",
          request_id: request.id,
        },
      });
    }

    const { item_id } = parseResult.data;
    const item = await itemsService.getPublicItemById(item_id);

    if (!item) {
      return reply.status(404).send({
        error: {
          code: "ITEM_NOT_FOUND",
          message: "Barang temuan tidak ditemukan atau tidak tersedia untuk publik",
          request_id: request.id,
        },
      });
    }

    return reply.status(200).send({
      data: item,
    });
  });
};
