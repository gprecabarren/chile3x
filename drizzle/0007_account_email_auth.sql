ALTER TABLE `users` ADD `email_verified_at` text;
--> statement-breakpoint
UPDATE `users` SET `email_verified_at` = CURRENT_TIMESTAMP WHERE `email_verified_at` IS NULL;
--> statement-breakpoint
CREATE TABLE `account_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_tokens_token_hash_unique` ON `account_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `account_tokens_user_purpose_idx` ON `account_tokens` (`user_id`,`purpose`,`expires_at`);
