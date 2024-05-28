ALTER TABLE "message_list" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "message_list" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
