CREATE TABLE `admin_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`actor_user_id` text,
	`profile_id` text,
	`summary` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `admin_notifications_unread_created_idx` ON `admin_notifications` (`read_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_notifications_kind_created_idx` ON `admin_notifications` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_notifications_actor_created_idx` ON `admin_notifications` (`actor_user_id`,`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`visitor_user_id` text,
	`owner_user_id` text,
	`last_message_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`visitor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_message_conversations`("id", "profile_id", "visitor_user_id", "owner_user_id", "last_message_at", "created_at", "updated_at") SELECT "id", "profile_id", "visitor_user_id", "owner_user_id", "last_message_at", "created_at", "updated_at" FROM `message_conversations`;--> statement-breakpoint
DROP TABLE `message_conversations`;--> statement-breakpoint
ALTER TABLE `__new_message_conversations` RENAME TO `message_conversations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `message_conversations_profile_visitor_unique` ON `message_conversations` (`profile_id`,`visitor_user_id`);--> statement-breakpoint
CREATE INDEX `message_conversations_visitor_recent_idx` ON `message_conversations` (`visitor_user_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `message_conversations_owner_recent_idx` ON `message_conversations` (`owner_user_id`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `__new_message_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_user_id` text,
	`sender_role` text NOT NULL,
	`body` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `message_conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_message_messages`("id", "conversation_id", "sender_user_id", "sender_role", "body", "read_at", "created_at")
SELECT mm."id", mm."conversation_id", mm."sender_user_id",
	CASE WHEN mm."sender_user_id" = mc."owner_user_id" THEN 'owner' ELSE 'visitor' END,
	mm."body", mm."read_at", mm."created_at"
FROM `message_messages` mm
INNER JOIN `message_conversations` mc ON mc."id" = mm."conversation_id";--> statement-breakpoint
DROP TABLE `message_messages`;--> statement-breakpoint
ALTER TABLE `__new_message_messages` RENAME TO `message_messages`;--> statement-breakpoint
CREATE INDEX `message_messages_conversation_created_idx` ON `message_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `message_messages_unread_idx` ON `message_messages` (`conversation_id`,`read_at`,`sender_role`);
