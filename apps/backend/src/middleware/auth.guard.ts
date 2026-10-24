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

/**
 * B/D.1.2: Fastify preHandler to enforce OFFICER role and resolve assigned service post context (Pos Pengajaran)
 */
export async function requireOfficer(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Ensure authentication has occurred
  if (!request.currentUser) {
    await authenticate(request, reply);
    if (reply.sent) {
      return;
    }
  }

  const user = request.currentUser!;

  // Enforce role OFFICER
  if (user.role !== "OFFICER") {
    return reply.status(403).send({
      error: {
        code: "FORBIDDEN",
        message: "Akses ditolak: Hanya petugas (OFFICER) yang berhak mengakses layanan ini",
        request_id: request.id,
      },
    });
  }

  // Resolve assigned service post
  const post = await authService.getOfficerPost(user.userId);

  if (!post) {
    return reply.status(403).send({
      error: {
        code: "FORBIDDEN",
        message: "Petugas belum memiliki pos penugasan aktif",
        request_id: request.id,
      },
    });
  }

  request.officerContext = {
    user,
    postId: post.postId,
    postName: post.name,
  };
}
