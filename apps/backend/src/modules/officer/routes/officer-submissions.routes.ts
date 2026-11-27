import type { FastifyPluginAsync } from "fastify";
import { requireOfficer } from "../../../middleware/auth.guard.js";
import {
  receiveRequestSchema,
  reasonRequestSchema,
} from "../officer.dto.js";
import { submissionListQuerySchema } from "../../submissions/submissions.dto.js";
import { officerSubmissionsService } from "../officer-submissions.service.js";
import { z } from "zod";

const submissionIdParamSchema = z.object({
  submission_id: z.string().uuid("Format ID laporan harus berupa UUID valid"),
});

export const officerSubmissionsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * B/I.1.0: GET /officer/submissions
   */
  app.get(
    "/officer/submissions",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const parsedQuery = submissionListQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsedQuery.error.issues[0]?.message || "Parameter query daftar laporan tidak valid",
            request_id: request.id,
            details: parsedQuery.error.issues,
          },
        });
      }

      const result = await officerSubmissionsService.getSubmissions(
        request.officerContext!,
        parsedQuery.data
      );

      return reply.status(200).send(result);
    }
  );

  /**
   * B/I.1.1: POST /officer/submissions/:submission_id/receive
   */
  app.post(
    "/officer/submissions/:submission_id/receive",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const paramParse = submissionIdParamSchema.safeParse(request.params);
      if (!paramParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format ID laporan tidak valid",
            request_id: request.id,
          },
        });
      }

      const bodyParse = receiveRequestSchema.safeParse(request.body);
      if (!bodyParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format payload penerimaan barang tidak valid",
            request_id: request.id,
            details: bodyParse.error.issues,
          },
        });
      }

      const item = await officerSubmissionsService.receiveSubmission(
        request.officerContext!,
        paramParse.data.submission_id,
        bodyParse.data
      );

      return reply.status(201).send({ data: item });
    }
  );

  /**
   * B/I.2.0: POST /officer/submissions/:submission_id/reject
   */
  app.post(
    "/officer/submissions/:submission_id/reject",
    { preHandler: [requireOfficer] },
    async (request, reply) => {
      const paramParse = submissionIdParamSchema.safeParse(request.params);
      if (!paramParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format ID laporan tidak valid",
            request_id: request.id,
          },
        });
      }

      const bodyParse = reasonRequestSchema.safeParse(request.body);
      if (!bodyParse.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Alasan penolakan wajib diisi",
            request_id: request.id,
            details: bodyParse.error.issues,
          },
        });
      }

      const submission = await officerSubmissionsService.rejectSubmission(
        request.officerContext!,
        paramParse.data.submission_id,
        bodyParse.data.reason
      );

      return reply.status(200).send({ data: submission });
    }
  );
};
