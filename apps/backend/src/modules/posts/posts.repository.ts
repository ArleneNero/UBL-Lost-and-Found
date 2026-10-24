import { db } from "../../db/index.js";
import { servicePosts, servicePostPhotos } from "../../db/schema.js";
import { eq, asc, count } from "drizzle-orm";

export class PostsRepository {
  async countPosts(): Promise<number> {
    const [record] = await db.select({ value: count() }).from(servicePosts);
    return Number(record?.value || 0);
  }

  async findPostsPage(offset: number, limit: number) {
    return db
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
  }

  async findPhotosByPostId(postId: number) {
    return db
      .select({
        photoId: servicePostPhotos.photoId,
        storagePath: servicePostPhotos.storagePath,
        position: servicePostPhotos.position,
      })
      .from(servicePostPhotos)
      .where(eq(servicePostPhotos.postId, postId))
      .orderBy(asc(servicePostPhotos.position))
      .limit(3);
  }

  async findPostById(postId: number) {
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

    return p || null;
  }
}

export const postsRepository = new PostsRepository();
