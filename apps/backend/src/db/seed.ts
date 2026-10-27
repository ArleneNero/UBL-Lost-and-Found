import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { users, servicePosts, servicePostPhotos, foundItems, itemPhotos, itemReturns } from "./schema.js";
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
  let officer = existing;
  if (existing) {
    if (!existing.passwordHash) {
      await db.update(users).set({ passwordHash: officerSeedData.passwordHash }).where(eq(users.userId, existing.userId));
      console.log(`🔑 Updated password hash for Officer: ${existing.email}`);
    }
    console.log(`ℹ️ Officer already exists: ${existing.email} (${existing.userId})`);
  } else {
    const [created] = await db.insert(users).values(officerSeedData).returning();
    console.log(`✅ Created Officer: ${created.email} (${created.userId})`);
    officer = created;
  }

  // Also seed official campus domain officer
  const campusOfficerEmail = "petugas.pengajaran@budiluhur.ac.id";
  const existingCampus = await db.query.users.findFirst({
    where: eq(users.email, campusOfficerEmail),
  });
  if (!existingCampus) {
    await db.insert(users).values({
      authUserId: "seed-officer-pengajaran-campus",
      fullName: "Petugas Pos Pengajaran",
      email: campusOfficerEmail,
      role: "OFFICER",
      passwordHash: officerSeedData.passwordHash,
    });
    console.log(`✅ Created Campus Officer: ${campusOfficerEmail}`);
  } else if (!existingCampus.passwordHash) {
    await db.update(users).set({ passwordHash: officerSeedData.passwordHash }).where(eq(users.userId, existingCampus.userId));
  }

  return officer!;
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
  console.log("🧹 Clearing old dummy items and photos...");
  await db.delete(itemReturns);
  await db.delete(itemPhotos);
  await db.delete(foundItems);
  console.log("✨ All previous dummy items cleared.");

  for (const itemData of itemsToSeed) {
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
