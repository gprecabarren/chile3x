CREATE TABLE `profile_verification_files` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`r2_key` text NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_verification_file_unique` ON `profile_verification_files` (`profile_id`,`kind`);--> statement-breakpoint
ALTER TABLE `profile_statuses` ADD `story_type` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_statuses` ADD `r2_key` text;--> statement-breakpoint
ALTER TABLE `profile_statuses` ADD `content_type` text;--> statement-breakpoint
ALTER TABLE `profile_statuses` ADD `byte_size` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `document_type` text DEFAULT 'rut' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `document_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `birth_date` text DEFAULT '1990-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` integer DEFAULT true NOT NULL;
