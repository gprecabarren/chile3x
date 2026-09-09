CREATE TABLE `account_deletion_history` (
	`id` text PRIMARY KEY NOT NULL,
	`email_hash` text NOT NULL,
	`former_user_id` text NOT NULL,
	`deleted_by` text NOT NULL,
	`deleted_by_admin_id` text,
	`original_created_at` text NOT NULL,
	`deleted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`deleted_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `account_deletion_history_email_idx` ON `account_deletion_history` (`email_hash`,`deleted_at`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `owner_hidden_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `self_disabled_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `admin_disabled_at` text;--> statement-breakpoint
UPDATE `users` SET `admin_disabled_at` = CURRENT_TIMESTAMP WHERE `is_active` = 0;
