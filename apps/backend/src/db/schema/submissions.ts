import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { servicePosts } from "./posts.js";
import { reportStatusEnum } from "./enums.js";

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
