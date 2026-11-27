import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const uploadIntents = pgTable(
  "upload_intents",
  {
    uploadId: uuid("upload_id").primaryKey(),
    userId: uuid("user_id").notNull(),
    purpose: text("purpose").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: text("storage_path").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_upload_intents_expires").on(table.expiresAt),
    index("idx_upload_intents_user_created").on(table.userId, table.createdAt),
  ]
);

export const consumedUploadTokens = pgTable(
  "consumed_upload_tokens",
  {
    tokenId: text("token_id").primaryKey(),
    userId: uuid("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_consumed_upload_tokens_expires").on(table.expiresAt),
  ]
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    bucketKey: text("bucket_key").primaryKey(),
    hits: integer("hits").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_rate_limit_buckets_expires").on(table.expiresAt),
  ]
);
