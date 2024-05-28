import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { MessageRole } from "../message";
import { sql } from "drizzle-orm";

export const REPLICACHE_SPACE_ID = 1;

export const ReplicacheSpaceTable = pgTable("replicache_space", {
  id: integer("id").primaryKey().default(REPLICACHE_SPACE_ID),
  version: integer("version").notNull().default(0),
});

export const ReplicacheClientGroupTable = pgTable("replicache_client_group", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
});

export const ReplicacheClientTable = pgTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id")
    .notNull()
    .references(() => ReplicacheClientGroupTable.id, { onDelete: "cascade" }),
  lastMutationId: integer("last_mutation_id").notNull().default(0),
  lastModifiedVersion: integer("last_modified_version").notNull().default(0),
});

export const MessagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  role: text("role").$type<MessageRole>().notNull(),
  content: text("content").notNull(),
  sort: serial("sort"),
  lastModifiedVersion: integer("last_modified_version").notNull().default(0),
  deleted: boolean("deleted").default(false),
  messageListId: text("message_list_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const MessageListTable = pgTable("message_list", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lastModifiedVersion: integer("last_modified_version").notNull().default(0),
  deleted: boolean("deleted").default(false),
  sort: serial("sort"),
  userId: text("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const UserTable = pgTable("user", {
  id: text("id").primaryKey(),
  googleId: text("google_id").unique().notNull(),
  username: text("username"),
  email: text("email"),
});

export const SessionTable = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});
