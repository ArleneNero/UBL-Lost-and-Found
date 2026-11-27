import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../../middleware/auth.guard.js";
import { authService } from "./auth.service.js";
import {
  Me,
  officerLoginSchema,
  bootstrapRequestSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.dto.js";
import {
  handleAuthCatchError,
  resolveTrustedFrontendOrigin,
  sendValidationError,
} from "./auth-route.helpers.js";
import { registerStudentAuthRoutes } from "./auth-student.routes.js";

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/me/bootstrap", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Token autentikasi tidak ditemukan atau format tidak valid",
            request_id: request.id,
          },
        });
      }

      const token = authHeader.slice(7).trim();
      const payload = authService.verifyToken(token);
      if (!payload || !payload.sub || payload.purpose) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Token autentikasi tidak valid atau sudah kedaluwarsa",
            request_id: request.id,
          },
        });
      }

      if (typeof payload.email !== "string" || payload.email.trim().length === 0) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Token tidak memiliki klaim email yang valid",
            request_id: request.id,
          },
        });
      }

      const parseResult = bootstrapRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid",
          parseResult.error.issues
        );
      }

      const result = await authService.bootstrapStudent(
        payload.sub,
        payload.email,
        parseResult.data.full_name
      );

      if (!result.success) {
        return reply.status(result.statusCode || 400).send({
          error: {
            code: result.code,
            message: result.message,
            request_id: request.id,
          },
        });
      }

      return reply.status(201).send({ data: result.data });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during student bootstrap");
    }
  });

  fastify.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const user = request.currentUser!;

      let assignedPostId: number | null = null;
      if (user.role === "OFFICER") {
        const post = await authService.getOfficerPost(user.userId);
        assignedPostId = post?.postId ?? null;
      }

      const meData: Me = {
        user_id: user.userId,
        full_name: user.fullName,
        email: user.email,
        student_number: user.studentNumber,
        role: user.role,
        assigned_post_id: assignedPostId,
        nim_verification_status: "NOT_VERIFIED",
      };

      return reply.status(200).send({ data: meData });
    } catch (err) {
      return handleAuthCatchError(
        request,
        reply,
        err,
        "Unhandled error while fetching current user profile"
      );
    }
  });

  const handleOfficerLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = officerLoginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid"
        );
      }

      const { email, password } = parseResult.data;
      const loginResult = await authService.officerLogin(email, password);

      if (!loginResult.success) {
        return reply.status(401).send({
          error: {
            code: loginResult.code,
            message: loginResult.message,
            request_id: request.id,
          },
        });
      }

      return reply.status(200).send({ data: loginResult.data });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during officer login");
    }
  };

  fastify.post("/auth/officer-login", handleOfficerLogin);
  fastify.post("/officer/login", handleOfficerLogin);

  registerStudentAuthRoutes(fastify);

  fastify.post("/auth/forgot-password", async (request, reply) => {
    try {
      const parseResult = forgotPasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid"
        );
      }

      const origin = resolveTrustedFrontendOrigin(
        request.headers.origin as string | undefined,
        request.headers.referer as string | undefined
      );
      const result = await authService.requestPasswordReset(parseResult.data.email, origin);

      return reply.status(200).send({ data: result });
    } catch (err) {
      return handleAuthCatchError(
        request,
        reply,
        err,
        "Unhandled error during forgot password request"
      );
    }
  });

  fastify.post("/auth/reset-password", async (request, reply) => {
    try {
      const parseResult = resetPasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid"
        );
      }

      const { token, new_password } = parseResult.data;
      const result = await authService.resetPassword(token, new_password);

      if (!result.success) {
        return reply.status(result.statusCode || 400).send({
          error: {
            code: result.code || "BAD_REQUEST",
            message: result.message,
            request_id: request.id,
          },
        });
      }

      return reply.status(200).send({ data: result });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during password reset");
    }
  });
};
