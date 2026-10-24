import type { FastifyPluginAsync } from "fastify";
import { requireOfficer } from "../../middleware/auth.guard.js";
import { itemCreateRequestSchema, itemCreateResponseSchema } from "./officer.dto.js";
import { officerService } from "./officer.service.js";

export const officerRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /officer/items
   * Direct found item registration by authenticated officer (OpenAPI v1.0)
   */
  app.post(
    "/officer/items",
    {
      preHandler: [requireOfficer],
    },
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

      const item = await officerService.registerFoundItem(
        request.officerContext!,
        parsed.data
      );

      const response = itemCreateResponseSchema.parse({
        data: item,
      });

      return reply.status(201).send(response);
    }
  );
};
