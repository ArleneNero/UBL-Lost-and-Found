import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middleware/auth.guard.js";
import { authService } from "./auth.service.js";
import { Me, officerLoginSchema } from "./auth.dto.js";

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
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
  const handleOfficerLogin = async (request: any, reply: any) => {
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
};
