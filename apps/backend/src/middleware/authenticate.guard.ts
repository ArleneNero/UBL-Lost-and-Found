import { FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../modules/auth/auth.service.js";

/**
 * B/D.1.0 & B/D.1.1: Fastify preHandler to authenticate Bearer token and map identity to local user
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

  if (!payload) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Token autentikasi tidak valid atau sudah kedaluwarsa",
        request_id: request.id,
      },
    });
  }

  // B/D.1.1: Map identity to users table in Neon DB
  const user = await authService.getUserByAuthId(payload.sub);

  if (!user) {
    return reply.status(404).send({
      error: {
        code: "PROFILE_NOT_FOUND",
        message: "Profil pengguna belum terdaftar dalam sistem",
        request_id: request.id,
      },
    });
  }

  request.currentUser = user;
}
