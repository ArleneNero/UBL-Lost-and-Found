import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    challengeId: uuid("challenge_id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 180 }).notNull(),
    otpSalt: text("otp_salt").notNull(),
    otpHash: text("otp_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resendAvailableAt: timestamp("resend_available_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_otp_challenges_email_created").on(table.email, table.createdAt),
  ]
);
