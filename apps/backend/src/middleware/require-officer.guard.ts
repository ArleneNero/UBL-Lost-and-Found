import { FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../modules/auth/auth.service.js";
import { authenticate } from "./authenticate.guard.js";

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
