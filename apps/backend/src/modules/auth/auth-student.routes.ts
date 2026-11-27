import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authService } from "./auth.service.js";
import {
  studentLoginSchema,
  studentRegisterRequestOtpSchema,
  studentRegisterSchema,
} from "./auth.dto.js";
import {
  authProbeLimiter,
  handleAuthCatchError,
  sendValidationError,
} from "./auth-route.helpers.js";

export function registerStudentAuthRoutes(fastify: FastifyInstance): void {
  const handleStudentLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = studentLoginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid"
        );
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

      return reply.status(200).send({ data: loginResult.data });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during student login");
    }
  };

  const handleStudentRegisterRequestOtp = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const probeCheck = authProbeLimiter.check(request.ip);
      if (!probeCheck.allowed) {
        reply.header("Retry-After", String(probeCheck.retryAfter));
        return reply.status(429).send({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Terlalu banyak percobaan pendaftaran. Mohon tunggu ${probeCheck.retryAfter} detik.`,
            request_id: request.id,
            retry_after: probeCheck.retryAfter,
          },
        });
      }

      const parseResult = studentRegisterRequestOtpSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid"
        );
      }

      const { full_name, email, password } = parseResult.data;
      const otpResult = await authService.requestStudentRegisterOtp(full_name, email, password);

      if (!otpResult.success) {
        if (otpResult.code === "EMAIL_EXISTS" || otpResult.code === "STUDENT_NUMBER_EXISTS") {
          authProbeLimiter.recordDuplicateProbe(request.ip);
        }
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

      return reply.status(200).send({ data: otpResult.data });
    } catch (err) {
      return handleAuthCatchError(request, reply, err, "Unhandled error during student OTP request");
    }
  };

  const handleStudentRegister = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = studentRegisterSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(
          request,
          reply,
          parseResult.error.issues[0]?.message || "Input tidak valid"
        );
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

      return reply.status(201).send({ data: registerResult.data });
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
}
