CREATE TABLE `account_presence` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_active_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_presence_active_idx` ON `account_presence` (`last_active_at`);--> statement-breakpoint
CREATE TABLE `message_conversation_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_muted` integer DEFAULT false NOT NULL,
	`blocked_at` text,
	`last_read_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `message_conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_conversation_preferences_user_unique` ON `message_conversation_preferences` (`conversation_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `message_conversation_preferences_user_idx` ON `message_conversation_preferences` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `message_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`visitor_user_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`last_message_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`visitor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_conversations_profile_visitor_unique` ON `message_conversations` (`profile_id`,`visitor_user_id`);--> statement-breakpoint
CREATE INDEX `message_conversations_visitor_recent_idx` ON `message_conversations` (`visitor_user_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `message_conversations_owner_recent_idx` ON `message_conversations` (`owner_user_id`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `message_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`body` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `message_conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_messages_conversation_created_idx` ON `message_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `message_messages_unread_idx` ON `message_messages` (`conversation_id`,`read_at`,`sender_user_id`);--> statement-breakpoint
ALTER TABLE `profile_contact_events` ADD `viewer_user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `profile_contact_events` ADD `country_code` text;--> statement-breakpoint
ALTER TABLE `profile_contact_events` ADD `region` text;--> statement-breakpoint
ALTER TABLE `profile_contact_events` ADD `city` text;--> statement-breakpoint
ALTER TABLE `profile_contact_events` ADD `device_type` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_contact_events` ADD `referrer_path` text;--> statement-breakpoint
CREATE INDEX `profile_contact_events_kind_created_idx` ON `profile_contact_events` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `profile_contact_events_viewer_user_idx` ON `profile_contact_events` (`viewer_user_id`,`created_at`);