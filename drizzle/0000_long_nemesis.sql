CREATE TABLE `agency_members` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_profile_id` text NOT NULL,
	`member_profile_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agency_member_unique` ON `agency_members` (`agency_profile_id`,`member_profile_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_unique` ON `favorites` (`user_id`,`profile_id`);--> statement-breakpoint
CREATE TABLE `listing_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`plan_name` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`pause_count` integer DEFAULT 0 NOT NULL,
	`paused_at` text,
	`admin_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listing_periods_profile_status_idx` ON `listing_periods` (`profile_id`,`status`);--> statement-breakpoint
CREATE TABLE `profile_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_like_unique` ON `profile_likes` (`user_id`,`profile_id`);--> statement-breakpoint
CREATE TABLE `profile_media` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`media_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`alt_text` text,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `profile_media_profile_idx` ON `profile_media` (`profile_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `profile_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`body` text NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_tag_unique` ON `profile_tags` (`profile_id`,`tag`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`region` text NOT NULL,
	`city` text NOT NULL,
	`comuna` text,
	`contact_whatsapp` text,
	`contact_telegram` text,
	`tier` text DEFAULT 'gold' NOT NULL,
	`verification_status` text DEFAULT 'unreviewed' NOT NULL,
	`health_review_status` text DEFAULT 'not_requested' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_slug_unique` ON `profiles` (`slug`);--> statement-breakpoint
CREATE INDEX `profiles_status_region_city_idx` ON `profiles` (`status`,`region`,`city`);--> statement-breakpoint
CREATE INDEX `profiles_owner_idx` ON `profiles` (`owner_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_profile_status_idx` ON `reviews` (`profile_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`display_name` text,
	`role` text DEFAULT 'visitor' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);