import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  smallint,
  uuid,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const servicePosts = pgTable("service_posts", {
  postId: serial("post_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  officerUserId: uuid("officer_user_id")
    .notNull()
    .unique()
    .references(() => users.userId),
  locationDescription: text("location_description"),
  openingHours: text("opening_hours"),
  directions: text("directions"),
  storageLimitDays: integer("storage_limit_days"),
});

export const servicePostPhotos = pgTable(
  "service_post_photos",
  {
    photoId: uuid("photo_id").primaryKey().defaultRandom(),
    postId: integer("post_id")
      .notNull()
      .references(() => servicePosts.postId, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique(),
    position: smallint("position").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("service_post_photos_post_pos_idx").on(table.postId, table.position),
  ]
);
