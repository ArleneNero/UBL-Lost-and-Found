import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { servicePosts, servicePostPhotos } from "./posts.js";
import { foundSubmissions } from "./submissions.js";
import { foundItems, itemPhotos, itemReturns } from "./items.js";

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

export const servicePostPhotosRelations = relations(servicePostPhotos, ({ one }) => ({
  post: one(servicePosts, {
    fields: [servicePostPhotos.postId],
    references: [servicePosts.postId],
  }),
}));

export const foundSubmissionsRelations = relations(foundSubmissions, ({ one }) => ({
  reporter: one(users, {
    fields: [foundSubmissions.reporterUserId],
    references: [users.userId],
  }),
  targetPost: one(servicePosts, {
    fields: [foundSubmissions.targetPostId],
    references: [servicePosts.postId],
  }),
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

export const itemReturnsRelations = relations(itemReturns, ({ one }) => ({
  item: one(foundItems, {
    fields: [itemReturns.itemId],
    references: [foundItems.itemId],
  }),
  returnedBy: one(users, {
    fields: [itemReturns.returnedByUserId],
    references: [users.userId],
  }),
}));
