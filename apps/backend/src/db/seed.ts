import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { users, servicePosts, servicePostPhotos, foundItems, itemPhotos } from "./schema.js";
import {
  SEED_OFFICER_EMAIL,
  officerSeedData,
  servicePostSeedData,
  servicePostPhotoSeedData,
} from "./fixtures/officer.fixture.js";
import { itemsToSeed } from "./fixtures/items.fixture.js";

async function seedOfficer() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, SEED_OFFICER_EMAIL),
  });
  if (existing) {
    console.log(`ℹ️ Officer already exists: ${existing.email} (${existing.userId})`);
    return existing;
  }
  const [created] = await db.insert(users).values(officerSeedData).returning();
  console.log(`✅ Created Officer: ${created.email} (${created.userId})`);
  return created;
}

async function seedServicePost(officerUserId: string) {
  let post = await db.query.servicePosts.findFirst({
    where: eq(servicePosts.name, servicePostSeedData.name),
  });

  if (!post) {
    const [created] = await db
      .insert(servicePosts)
      .values({ ...servicePostSeedData, officerUserId })
      .returning();
    post = created;
    console.log(`✅ Created Service Post: ${post.name} (Post ID: ${post.postId})`);
  } else {
    console.log(`ℹ️ Service Post already exists: ${post.name} (Post ID: ${post.postId})`);
  }

  const existingPhoto = await db.query.servicePostPhotos.findFirst({
    where: eq(servicePostPhotos.postId, post.postId),
  });

  if (!existingPhoto) {
    const [photo] = await db
      .insert(servicePostPhotos)
      .values({ ...servicePostPhotoSeedData, postId: post.postId })
      .returning();
    console.log(`✅ Seeded photo for Post ${post.name} (Photo ID: ${photo.photoId})`);
  }

  return post;
}

async function seedFoundItems(officerUserId: string, postId: number) {
  for (const itemData of itemsToSeed) {
    const existing = await db.query.foundItems.findFirst({
      where: eq(foundItems.inventoryCode, itemData.inventoryCode),
    });

    if (existing) {
      console.log(`ℹ️ Item already exists: ${itemData.inventoryCode}`);
      continue;
    }

    const [item] = await db
      .insert(foundItems)
      .values({
        inventoryCode: itemData.inventoryCode,
        recordedByUserId: officerUserId,
        storagePostId: postId,
        itemName: itemData.itemName,
        category: itemData.category,
        publicDescription: itemData.publicDescription,
        privateVerificationNotes: itemData.privateVerificationNotes,
        foundLocation: itemData.foundLocation,
        foundOn: itemData.foundOn,
        receivedAt: itemData.receivedAt,
        status: itemData.status,
        isVisible: itemData.isVisible,
      })
      .returning();

    await db.insert(itemPhotos).values({
      itemId: item.itemId,
      storagePath: itemData.photoPath,
      isPrimary: true,
    });

    console.log(`✅ Seeded item & photo: ${item.inventoryCode} (${item.itemName})`);
  }
}

async function seed() {
  console.log("🌱 Running clean idempotent seed...");
  const officer = await seedOfficer();
  const post = await seedServicePost(officer.userId);
  await seedFoundItems(officer.userId, post.postId);
  console.log("✨ Seed completed successfully with deterministic test items!");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
