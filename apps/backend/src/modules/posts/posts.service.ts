import { postsRepository } from "./posts.repository.js";
import { ServicePostPublic, PostsResponse } from "./posts.dto.js";
import { resolvePhotoUrl } from "../../utils/photoResolver.js";

export class PostsService {
  /**
   * List all service posts with pagination and public photos
   */
  async listPosts({ page, limit }: { page: number; limit: number }): Promise<PostsResponse> {
    const offset = (page - 1) * limit;

    const total = await postsRepository.countPosts();
    const total_pages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    const postsList = await postsRepository.findPostsPage(offset, limit);

    const data: ServicePostPublic[] = await Promise.all(
      postsList.map(async (p) => {
        const photosList = await postsRepository.findPhotosByPostId(p.postId);
        return this.formatPostResponse(p, photosList);
      })
    );

    return {
      data,
      meta: { page, limit, total, total_pages },
    };
  }

  /**
   * Get detail of a specific service post by postId
   */
  async getPostById(postId: number): Promise<ServicePostPublic | null> {
    const p = await postsRepository.findPostById(postId);
    if (!p) return null;

    const photosList = await postsRepository.findPhotosByPostId(p.postId);
    return this.formatPostResponse(p, photosList);
  }

  private formatPostResponse(
    p: {
      postId: number;
      name: string;
      locationDescription: string | null;
      openingHours: string | null;
      directions: string | null;
    },
    photosList: Array<{ photoId: string; storagePath: string; position: number }>
  ): ServicePostPublic {
    const photos = photosList.map((photo) => {
      const resolved = resolvePhotoUrl(photo.storagePath);
      return {
        photo_id: photo.photoId,
        position: photo.position,
        is_cover: photo.position === 1,
        url: resolved.url,
        expires_at: resolved.expires_at,
      };
    });

    return {
      post_id: p.postId,
      name: p.name,
      location_description: p.locationDescription,
      opening_hours: p.openingHours,
      directions: p.directions,
      photos,
    };
  }
}

export const postsService = new PostsService();
