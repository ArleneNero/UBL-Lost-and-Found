import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../../middleware/auth.guard.js";
import { authService } from "./auth.service.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import {
  Me,
  officerLoginSchema,
  bootstrapRequestSchema,
  studentLoginSchema,
  studentRegisterRequestOtpSchema,
  studentRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.dto.js";

/**
 * Resolves a trusted frontend origin for password reset links, preventing Origin/Referer header poisoning.
 */
function resolveTrustedFrontendOrigin(
  originHeader?: string,
  refererHeader?: string
): string {
  const fallbackOrigin = (() => {
    try {
      return new URL(env.FRONTEND_ORIGIN).origin;
    } catch {
      return "https://lostandfound-budiluhur.web.id";
    }
  })();

  const allowedOrigins = new Set<string>([
    fallbackOrigin,
    "https://lostandfound-budiluhur.web.id",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);

  for (const candidate of [originHeader, refererHeader]) {
    if (!candidate) continue;
    try {
      const parsedOrigin = new URL(candidate).origin;
      if (allowedOrigins.has(parsedOrigin)) {
        return parsedOrigin;
      }
    } catch {
      // Ignore malformed Origin or Referer headers
    }
  }

  return fallbackOrigin;
}

/**
 * Maps caught route errors into uniform API envelopes without leaking raw exception details on 500s.
 */
function handleAuthCatchError(
  request: FastifyRequest,
  reply: FastifyReply,
  err: unknown,
  logContext: string
) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        request_id: request.id,
      },
    });
  }

  request.log.error(err, logContext);
  return reply.status(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal server",
      request_id: request.id,
    },
  });
}

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * B/H.1.0: POST /me/bootstrap
   * Create student profile after verified session
   */
  fastify.post("/me/bootstrap", async (request, reply) => {
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
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Input tidak valid",
          request_id: request.id,
          details: parseResult.error.issues,
        },
      });
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

    return reply.status(201).send({
      data: result.data,
    });
  });
  /**
   * B/D.2.0: GET /me
   * Get current verified profile for authenticated user.
   * Returns 401 UNAUTHORIZED if not logged in.
   * Returns 404 PROFILE_NOT_FOUND when session is valid but user is not in database.
   * No profile is created implicitly.
   */
  fastify.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
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

    return reply.status(200).send({
      data: meData,
    });
  });

  /**
   * B/D.2.1: POST /auth/officer-login
   * Server-Side Officer Authentication & Bcrypt Verification
   * Zero-Trust: Backend is the sole validator of credentials and role.
   */
  const handleOfficerLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = officerLoginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Input tidak valid",
          request_id: request.id,
        },
      });
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

    return reply.status(200).send({
      data: loginResult.data,
    });
  };

  fastify.post("/auth/officer-login", handleOfficerLogin);
  fastify.post("/officer/login", handleOfficerLogin);

  /**
   * B/H.1.3: POST /auth/student-login
   * Server-Side Student Authentication & Bcrypt Verification
   */
  const handleStudentLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = studentLoginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0]?.message || "Input tidak valid",
            request_id: request.id,
          },
        });
      }

      const { email, password } = parseResult.data;
      const loginResult = await authService.studentLogin(email, password);

      if (!loginResult.success) {
        return reply.status(loginResult.statusCode || 401).send({
          error: {
            code: loginResult.code,
            message: loginResult.message,
            request_id: request.id,
          },
        });
      }

      return reply.status(200).send({
        data: loginResult.data,
      });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during student login");
    }
  };

  /**
   * v1.4.0: POST /auth/student-register/request-otp
   * Validates strict 10-digit NIM campus email and delivers a 6-digit OTP via Resend
   */
  const handleStudentRegisterRequestOtp = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = studentRegisterRequestOtpSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0]?.message || "Input tidak valid",
            request_id: request.id,
          },
        });
      }

      const { full_name, email, password } = parseResult.data;
      const otpResult = await authService.requestStudentRegisterOtp(full_name, email, password);

      if (!otpResult.success) {
        if (otpResult.retryAfter !== undefined) {
          reply.header("Retry-After", String(otpResult.retryAfter));
        }
        return reply.status(otpResult.statusCode || 400).send({
          error: {
            code: otpResult.code,
            message: otpResult.message,
            request_id: request.id,
            ...(otpResult.retryAfter !== undefined
              ? { retry_after: otpResult.retryAfter }
              : {}),
          },
        });
      }

      return reply.status(200).send({
        data: otpResult.data,
      });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during student OTP request");
    }
  };

  /**
   * B/H.1.4 (v1.4.0): POST /auth/student-register
   * Server-Side Student Registration with Stateful Signed OTP & Strict Email NIM Extraction
   */
  const handleStudentRegister = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = studentRegisterSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.issues[0]?.message || "Input tidak valid",
            request_id: request.id,
          },
        });
      }

      const { full_name, email, password, otp, challenge_token } = parseResult.data;
      const registerResult = await authService.studentRegister(
        full_name,
        email,
        password,
        otp,
        challenge_token
      );

      if (!registerResult.success) {
        return reply.status(registerResult.statusCode || 400).send({
          error: {
            code: registerResult.code,
            message: registerResult.message,
            request_id: request.id,
          },
        });
      }

      return reply.status(201).send({
        data: registerResult.data,
      });
    } catch (err) {
      return handleAuthCatchError(
        request,
        reply,
        err,
        "Unhandled error during student registration"
      );
    }
  };

  fastify.post("/auth/student-login", handleStudentLogin);
  fastify.post("/student/login", handleStudentLogin);
  fastify.post("/auth/student-register/request-otp", handleStudentRegisterRequestOtp);
  fastify.post("/student/register/request-otp", handleStudentRegisterRequestOtp);
  fastify.post("/auth/student-register", handleStudentRegister);
  fastify.post("/student/register", handleStudentRegister);

  /**
   * POST /auth/forgot-password:
   * Requests a password reset link sent to student email via Resend
   */
  fastify.post("/auth/forgot-password", async (request, reply) => {
    const parseResult = forgotPasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Input tidak valid",
          request_id: request.id,
        },
      });
    }

    const origin = resolveTrustedFrontendOrigin(
      request.headers.origin as string | undefined,
      request.headers.referer as string | undefined
    );
    const result = await authService.requestPasswordReset(parseResult.data.email, origin);

    return reply.status(200).send({
      data: result,
    });
  });

  /**
   * POST /auth/reset-password:
   * Resets password using verified token
   */
  fastify.post("/auth/reset-password", async (request, reply) => {
    const parseResult = resetPasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Input tidak valid",
          request_id: request.id,
        },
      });
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

    return reply.status(200).send({
      data: result,
    });
  });
};
