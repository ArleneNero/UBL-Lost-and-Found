import { describe, it, expect, afterAll } from "vitest";
import { db, pool } from "../src/db/index.js";
import { users, servicePosts, foundItems } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

describe("Neon Database Integration & Constraints", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("should query seeded service post and verify officer relation", async () => {
    const post = await db.query.servicePosts.findFirst({
      where: eq(servicePosts.name, "Pos Pengajaran"),
      with: {
        officer: true,
      },
    });

    expect(post).toBeDefined();
    expect(post?.name).toBe("Pos Pengajaran");
    expect(post?.officer).toBeDefined();
    expect(post?.officer.email).toBe("lostandfound.budiluhur@gmail.com");
    expect(post?.officer.role).toBe("OFFICER");
  });

  it("should query found_items table successfully", async () => {
    const items = await db.select().from(foundItems);
    expect(items.length).toBeGreaterThanOrEqual(0);
  });

  it("should enforce unique constraint on officer email", async () => {
    await expect(
      db.insert(users).values({
        authUserId: "duplicate-officer-test",
        fullName: "Duplicate User",
        email: "lostandfound.budiluhur@gmail.com",
        role: "OFFICER",
      })
    ).rejects.toThrow();
  });
});
