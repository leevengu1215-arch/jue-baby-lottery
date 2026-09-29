CREATE TABLE `members` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`nickname` text NOT NULL,
	`face` text NOT NULL,
	`pool` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT "valid_pool" CHECK("members"."pool" IS NULL OR "members"."pool" IN ('boy','girl'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_public_id_unique` ON `members` (`public_id`);--> statement-breakpoint
CREATE INDEX `members_pool_updated` ON `members` (`pool`,`updated_at`);