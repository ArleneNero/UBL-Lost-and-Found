import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireStudent } from "../../middleware/auth.guard.js";
import { authService } from "../auth/auth.service.js";
import {
  submissionCreateRequestSchema,
  submissionListQuerySchema,
  reasonRequestSchema,
} from "./submissions.dto.js";
import { submissionsService } from "./submissions.service.js";
import { z } from "zod";

const submissionIdParamSchema = z.object({
  submission_id: z.string().uuid("Format ID laporan harus berupa UUID valid"),
});

export const submissionsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * B/H.1.1: POST /submissions
   * Create found item report by authenticated student
   */
  app.post(
    "/submissions",
    {
      preHandler: [requireStudent],
    },
    async (request, reply) => {
      const parsed = submissionCreateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Format payload laporan temuan tidak valid",
            request_id: request.id,
            details: parsed.error.issues,
          },
        });
      }

      const submission = await submissionsService.createSubmission(
        request.currentUser!,
        parsed.data
      );

      return reply.status(201).send({
        data: submission,
      });
    }
  );

  /**
   * B/H.1.2: GET /submissions/me
   * List reports submitted by authenticated student
   */
  app.get(
    "/submissions/me",
    {
      preHandler: [authenticate],
    },
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

      const result = await submissionsService.getReporterSubmissions(
        request.currentUser!,
        parsedQuery.data
      );

      return reply.status(200).send(result);
    }
  );

  /**
   * B/H.2.0: GET /submissions/:submission_id
   * Get report details and audit history (Owner student or assigned officer)
   */
  app.get(
    "/submissions/:submission_id",
    {
      preHandler: [authenticate],
    },
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

      let officerPostId: number | undefined;
      if (request.currentUser!.role === "OFFICER") {
        const post = await authService.getOfficerPost(request.currentUser!.userId);
        officerPostId = post?.postId;
      }

      const detail = await submissionsService.getSubmissionDetail(
        paramParse.data.submission_id,
        request.currentUser!,
        officerPostId
      );

      return reply.status(200).send({
        data: detail,
      });
    }
  );

  /**
   * B/H.2.1: POST /submissions/:submission_id/cancel
   * Cancel report by owner student (only while PENDING_RECEIPT)
   */
  app.post(
    "/submissions/:submission_id/cancel",
    {
      preHandler: [authenticate],
    },
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
            message: "Alasan pembatalan wajib diisi",
            request_id: request.id,
            details: bodyParse.error.issues,
          },
        });
      }

      const updated = await submissionsService.cancelSubmission(
        paramParse.data.submission_id,
        request.currentUser!,
        bodyParse.data.reason
      );

      return reply.status(200).send({
        data: updated,
      });
    }
  );
};
