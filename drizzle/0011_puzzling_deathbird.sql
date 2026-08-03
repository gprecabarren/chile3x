CREATE TABLE `blocked_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocked_profile_unique` ON `blocked_profiles` (`user_id`,`profile_id`);--> statement-breakpoint
CREATE TABLE `news_media` (
	`id` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`content_type` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_media_r2_key_unique` ON `news_media` (`r2_key`);--> statement-breakpoint
CREATE TABLE `news_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`content_html` text NOT NULL,
	`cover_media_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`seo_title` text,
	`meta_description` text,
	`focus_keyword` text,
	`canonical_url` text,
	`og_title` text,
	`og_description` text,
	`noindex` integer DEFAULT false NOT NULL,
	`published_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cover_media_id`) REFERENCES `news_media`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_posts_slug_unique` ON `news_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `news_posts_public_idx` ON `news_posts` (`status`,`published_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `profile_contact_events` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`viewer_key` text NOT NULL,
	`kind` text NOT NULL,
	`clicked_on` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_contact_event_daily_unique` ON `profile_contact_events` (`profile_id`,`viewer_key`,`kind`,`clicked_on`);--> statement-breakpoint
CREATE INDEX `profile_contact_events_profile_day_idx` ON `profile_contact_events` (`profile_id`,`clicked_on`);--> statement-breakpoint
CREATE TABLE `profile_exclusive_access` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`user_id` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_exclusive_access_unique` ON `profile_exclusive_access` (`profile_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `profile_exclusive_access_user_idx` ON `profile_exclusive_access` (`user_id`,`profile_id`);--> statement-breakpoint
CREATE TABLE `profile_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`reporter_id` text,
	`reason` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `profile_reports_status_created_idx` ON `profile_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `profile_reports_profile_idx` ON `profile_reports` (`profile_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `profile_media` ADD `visibility` text DEFAULT 'public' NOT NULL;