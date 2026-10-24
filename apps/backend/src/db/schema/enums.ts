import { pgEnum } from "drizzle-orm/pg-core";

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
