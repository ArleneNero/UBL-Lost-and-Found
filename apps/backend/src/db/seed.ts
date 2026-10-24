import { db, pool } from "./index.js";
import { users, servicePosts } from "./schema.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Running clean idempotent seed...");

  const officerEmail = "lostandfound.budiluhur@gmail.com";

  // 1. Check or insert Officer user
  let officer = await db.query.users.findFirst({
    where: eq(users.email, officerEmail),
  });

  if (!officer) {
    const inserted = await db
      .insert(users)
      .values({
        authUserId: "seed-officer-pengajaran-01",
        fullName: "Petugas Pos Pengajaran",
        email: officerEmail,
        role: "OFFICER",
      })
      .returning();
    officer = inserted[0];
    console.log(`✅ Created Officer: ${officer.email} (${officer.userId})`);
  } else {
    console.log(`ℹ️ Officer already exists: ${officer.email} (${officer.userId})`);
  }

  // 2. Check or insert Service Post (Pos Pengajaran)
  let post = await db.query.servicePosts.findFirst({
    where: eq(servicePosts.name, "Pos Pengajaran"),
  });

  if (!post) {
    const inserted = await db
      .insert(servicePosts)
      .values({
        name: "Pos Pengajaran",
        officerUserId: officer.userId,
        locationDescription: "Gedung Pengajaran Lt. 1, Dekat Lobby Utama (Akses Lapangan)",
        openingHours: "Senin - Jumat, 08:00 - 16:00 WIB",
        directions: "Dari gerbang utama jalan lurus ke arah gedung pengajaran samping lapangan.",
        storageLimitDays: 30,
      })
      .returning();
    post = inserted[0];
    console.log(`✅ Created Service Post: ${post.name} (Post ID: ${post.postId})`);
  } else {
    console.log(`ℹ️ Service Post already exists: ${post.name} (Post ID: ${post.postId})`);
  }

  console.log("✨ Clean seed completed successfully. (0 items seeded, clean slate)");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
