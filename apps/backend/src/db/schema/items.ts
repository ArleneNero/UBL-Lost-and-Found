import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { servicePosts } from "./posts.js";
import { foundSubmissions } from "./submissions.js";
import { itemStatusEnum } from "./enums.js";

export const foundItems = pgTable(
  "found_items",
  {
    itemId: uuid("item_id").primaryKey().defaultRandom(),
    inventoryCode: varchar("inventory_code", { length: 30 }).notNull().unique(),
    sourceSubmissionId: uuid("source_submission_id")
      .unique()
      .references(() => foundSubmissions.submissionId),
    recordedByUserId: uuid("recorded_by_user_id")
      .notNull()
      .references(() => users.userId),
    storagePostId: integer("storage_post_id")
      .notNull()
      .references(() => servicePosts.postId),
    itemName: varchar("item_name", { length: 150 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    publicDescription: text("public_description").notNull(),
    privateVerificationNotes: text("private_verification_notes"),
    foundLocation: text("found_location"),
    foundOn: date("found_on"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    status: itemStatusEnum("status").notNull().default("STORED"),
    isVisible: boolean("is_visible").notNull().default(true),
  },
  (table) => [
    index("found_items_post_status_idx").on(
      table.storagePostId,
      table.status,
      table.receivedAt
    ),
    index("found_items_status_received_idx").on(table.status, table.receivedAt),
  ]
);

export const itemPhotos = pgTable(
  "item_photos",
  {
    photoId: uuid("photo_id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .unique()
      .references(() => foundItems.itemId, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique(),
    isPrimary: boolean("is_primary").notNull().default(true),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("item_photos_item_idx").on(table.itemId, table.uploadedAt),
  ]
);

export const itemReturns = pgTable("item_returns", {
  returnId: uuid("return_id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .unique()
    .references(() => foundItems.itemId),
  returnedByUserId: uuid("returned_by_user_id")
    .notNull()
    .references(() => users.userId),
  recipientName: varchar("recipient_name", { length: 120 }).notNull(),
  verificationSummary: text("verification_summary").notNull(),
  verificationConfirmedAt: timestamp("verification_confirmed_at", {
    withTimezone: true,
  }).defaultNow().notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true }).defaultNow().notNull(),
});
