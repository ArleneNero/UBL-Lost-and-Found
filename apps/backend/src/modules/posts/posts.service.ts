import { db } from "../../db/index.js";
import { servicePosts, servicePostPhotos } from "../../db/schema.js";
import { eq, asc, count } from "drizzle-orm";
import { ServicePostPublic, PostsResponse } from "./posts.dto.js";
import { resolvePhotoUrl } from "../../utils/photoResolver.js";

export class PostsService {
  /**
   * List all service posts with pagination and public photos
   */
  async listPosts({ page, limit }: { page: number; limit: number }): Promise<PostsResponse> {
    const offset = (page - 1) * limit;

    // 1. Total count
    const [totalRecord] = await db.select({ value: count() }).from(servicePosts);
    const total = Number(totalRecord?.value || 0);
    const total_pages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    // 2. Fetch posts page
    const postsList = await db
      .select({
        postId: servicePosts.postId,
        name: servicePosts.name,
        locationDescription: servicePosts.locationDescription,
        openingHours: servicePosts.openingHours,
        directions: servicePosts.directions,
      })
      .from(servicePosts)
      .orderBy(asc(servicePosts.postId))
      .limit(limit)
      .offset(offset);

    // 3. Attach photos for each post
    const data: ServicePostPublic[] = await Promise.all(
      postsList.map(async (p) => {
        const photosList = await db
          .select({
            photoId: servicePostPhotos.photoId,
            storagePath: servicePostPhotos.storagePath,
            position: servicePostPhotos.position,
          })
          .from(servicePostPhotos)
          .where(eq(servicePostPhotos.postId, p.postId))
          .orderBy(asc(servicePostPhotos.position))
          .limit(3);

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
      })
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }

  /**
   * Get detail of a specific service post by postId
   */
  async getPostById(postId: number): Promise<ServicePostPublic | null> {
    const [p] = await db
      .select({
        postId: servicePosts.postId,
        name: servicePosts.name,
        locationDescription: servicePosts.locationDescription,
        openingHours: servicePosts.openingHours,
        directions: servicePosts.directions,
      })
      .from(servicePosts)
      .where(eq(servicePosts.postId, postId))
      .limit(1);

    if (!p) {
      return null;
    }

    const photosList = await db
      .select({
        photoId: servicePostPhotos.photoId,
        storagePath: servicePostPhotos.storagePath,
        position: servicePostPhotos.position,
      })
      .from(servicePostPhotos)
      .where(eq(servicePostPhotos.postId, p.postId))
      .orderBy(asc(servicePostPhotos.position))
      .limit(3);

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
