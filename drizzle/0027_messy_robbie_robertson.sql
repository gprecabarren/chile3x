CREATE TABLE `telegram_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`link_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`telegram_chat_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`joined_at` text,
	`left_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`link_id`) REFERENCES `telegram_account_links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_memberships_user_chat_unique` ON `telegram_memberships` (`user_id`,`telegram_chat_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_memberships_telegram_chat_unique` ON `telegram_memberships` (`telegram_user_id`,`telegram_chat_id`);--> statement-breakpoint
CREATE INDEX `telegram_memberships_status_idx` ON `telegram_memberships` (`status`,`updated_at`);