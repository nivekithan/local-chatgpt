ALTER TABLE "replicache_client_group" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message_list" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_list" ADD CONSTRAINT "message_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
