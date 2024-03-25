CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"sort" serial NOT NULL,
	"last_modified_version" integer DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client_group" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_group_id" text NOT NULL,
	"last_mutation_id" integer DEFAULT 0 NOT NULL,
	"last_modified_version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_space" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replicache_client" ADD CONSTRAINT "replicache_client_client_group_id_replicache_client_group_id_fk" FOREIGN KEY ("client_group_id") REFERENCES "replicache_client_group"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
