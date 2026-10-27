import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums.js";

export const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").notNull().unique(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  studentNumber: varchar("student_number", { length: 30 }).unique(),
  role: userRoleEnum("role").notNull(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
