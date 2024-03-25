CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`role` text NOT NULL,
	`sort` integer NOT NULL,
	`last_modified_version` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replicache_client` (
	`id` text PRIMARY KEY NOT NULL,
	`client_group_id` text NOT NULL,
	`last_mutation_id` integer NOT NULL,
	`last_modified_version` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replicache_client_group` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repliacache_space` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `replicache_client_group_user_id_unique` ON `replicache_client_group` (`user_id`);