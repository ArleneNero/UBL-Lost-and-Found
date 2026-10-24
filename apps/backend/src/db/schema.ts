import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  boolean,
  date,
  timestamp,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Enums
export const userRoleEnum = pgEnum("user_role", ["STUDENT", "OFFICER"]);

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING_RECEIPT",
  "RECEIVED",
  "REJECTED",
  "CANCELLED",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "STORED",
  "RETURNED_TO_OWNER",
  "DISTRIBUTED",
]);

// 2. Users Table
export const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").notNull().unique(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  studentNumber: varchar("student_number", { length: 30 }).unique(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Service Posts Table
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

// 4. Service Post Photos Table
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

// 5. Found Submissions Table
export const foundSubmissions = pgTable(
  "found_submissions",
  {
    submissionId: uuid("submission_id").primaryKey().defaultRandom(),
    reportCode: varchar("report_code", { length: 30 }).notNull().unique(),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(() => users.userId),
    targetPostId: integer("target_post_id")
      .notNull()
      .references(() => servicePosts.postId),
    itemName: varchar("item_name", { length: 150 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    publicDescription: text("public_description").notNull(),
    foundLocation: text("found_location").notNull(),
    foundOn: date("found_on").notNull(),
    reportPhotoPath: text("report_photo_path").notNull().unique(),
    status: reportStatusEnum("status").notNull().default("PENDING_RECEIPT"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("found_submissions_reporter_idx").on(table.reporterUserId, table.submittedAt),
    index("found_submissions_target_status_idx").on(
      table.targetPostId,
      table.status,
      table.submittedAt
    ),
  ]
);

// 6. Submission Status History Table
export const submissionStatusHistory = pgTable(
  "submission_status_history",
  {
    historyId: uuid("history_id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => foundSubmissions.submissionId, { onDelete: "cascade" }),
    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => users.userId),
    fromStatus: reportStatusEnum("from_status"),
    toStatus: reportStatusEnum("to_status").notNull(),
    reason: text("reason"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("submission_history_sub_idx").on(table.submissionId, table.changedAt),
  ]
);

// 7. Found Items Table (Inventory)
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

// 8. Item Photos Table
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

// 9. Item Returns Table
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

// 10. Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  managedPost: one(servicePosts, {
    fields: [users.userId],
    references: [servicePosts.officerUserId],
  }),
  submissions: many(foundSubmissions),
  recordedItems: many(foundItems),
  returnedItems: many(itemReturns),
}));

export const servicePostsRelations = relations(servicePosts, ({ one, many }) => ({
  officer: one(users, {
    fields: [servicePosts.officerUserId],
    references: [users.userId],
  }),
  photos: many(servicePostPhotos),
  items: many(foundItems),
  submissions: many(foundSubmissions),
}));

export const foundItemsRelations = relations(foundItems, ({ one }) => ({
  storagePost: one(servicePosts, {
    fields: [foundItems.storagePostId],
    references: [servicePosts.postId],
  }),
  recordedBy: one(users, {
    fields: [foundItems.recordedByUserId],
    references: [users.userId],
  }),
  photo: one(itemPhotos, {
    fields: [foundItems.itemId],
    references: [itemPhotos.itemId],
  }),
  returnRecord: one(itemReturns, {
    fields: [foundItems.itemId],
    references: [itemReturns.itemId],
  }),
}));

export const itemPhotosRelations = relations(itemPhotos, ({ one }) => ({
  item: one(foundItems, {
    fields: [itemPhotos.itemId],
    references: [foundItems.itemId],
  }),
}));
