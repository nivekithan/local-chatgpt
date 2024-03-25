import { drizzle } from "drizzle-orm/d1";
import { text, sqliteTable, int } from "drizzle-orm/sqlite-core";

export function getDb(d1: D1Database) {
  return drizzle(d1);
}

export const ReplicacheSpace = sqliteTable("repliacache_space", {
  id: int("id").primaryKey({ autoIncrement: true }),
  version: int("version").notNull(),
});

export const ReplicacheClientGroup = sqliteTable("replicache_client_group", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
});

export const ReplicacheClient = sqliteTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id").notNull(),
  lastMutationId: int("last_mutation_id").notNull(),
  lastModifiedVersion: int("last_modified_version").notNull(),
});

export const MessagesTable = sqliteTable("messages", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  role: text("role").$type<"user" | "ai">().notNull(),
  sort: int("sort").notNull(),
  lastModifiedVersion: int("last_modified_version").notNull(),
  deleted: int("deleted", { mode: "boolean" }).notNull().default(false),
});
