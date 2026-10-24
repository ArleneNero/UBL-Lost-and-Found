import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { postsService } from "./posts.service.js";
import { listPostsQuerySchema, postParamSchema } from "./posts.dto.js";

export const postsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * B/C.1.1: GET /posts
   * Listing public service posts with pagination
   */
  fastify.get("/posts", async (request, reply) => {
    const parseResult = listPostsQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Parameter query tidak valid";
      return reply.status(400).send({
        error: {
          code: "INVALID_QUERY_PARAMS",
          message: firstError,
          request_id: request.id,
        },
      });
    }

    const { page, limit } = parseResult.data;
    const response = await postsService.listPosts({ page, limit });

    return reply.status(200).send(response);
  });

  /**
   * B/C.1.2: GET /posts/:post_id
   * Get single service post detail with public photos
   */
  fastify.get("/posts/:post_id", async (request, reply) => {
    const parseResult = postParamSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_PARAMETER",
          message: "ID Pos harus berupa bilangan bulat positif",
          request_id: request.id,
        },
      });
    }

    const { post_id } = parseResult.data;
    const post = await postsService.getPostById(post_id);

    if (!post) {
      return reply.status(404).send({
        error: {
          code: "POST_NOT_FOUND",
          message: `Pos pelayanan dengan ID ${post_id} tidak ditemukan`,
          request_id: request.id,
        },
      });
    }

    return reply.status(200).send({
      data: post,
    });
  });
};
