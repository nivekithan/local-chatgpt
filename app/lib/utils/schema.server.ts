import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { MessageRole } from "../message";

export const REPLICACHE_SPACE_ID = 1;

export const ReplicacheSpaceTable = pgTable("replicache_space", {
  id: integer("id").primaryKey().default(REPLICACHE_SPACE_ID),
  version: integer("version").notNull().default(0),
});

export const ReplicacheClientGroupTable = pgTable("replicache_client_group", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
});

export const ReplicacheClientTable = pgTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id")
    .notNull()
    .references(() => ReplicacheClientGroupTable.id),
  lastMutationId: integer("last_mutation_id").notNull().default(0),
  lastModifiedVersion: integer("last_modified_version").notNull().default(0),
});

export const MessagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role").$type<MessageRole>().notNull(),
  content: text("content").notNull(),
  sort: serial("sort"),
  lastModifiedVersion: integer("last_modified_version").notNull().default(0),
  deleted: boolean("deleted").default(false),
});
