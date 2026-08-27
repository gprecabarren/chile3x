ALTER TABLE `users` ADD `username` text;
--> statement-breakpoint
-- Preserve every existing account with a deterministic unique public username.
-- New registrations receive a friendlier random username in the application.
UPDATE `users`
SET `username` = 'usuario-' || lower(substr(hex(`id`), 1, 36))
WHERE `username` IS NULL OR trim(`username`) = '';
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
--> statement-breakpoint
CREATE TABLE `exclusive_content_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`profile_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exclusive_content_collection_owner_unique` ON `exclusive_content_collections` (`owner_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `exclusive_content_collection_profile_unique` ON `exclusive_content_collections` (`profile_id`);
--> statement-breakpoint
CREATE TABLE `exclusive_content_media` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`media_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`content_type` text DEFAULT 'image/jpeg' NOT NULL,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `exclusive_content_collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exclusive_content_media_r2_key_unique` ON `exclusive_content_media` (`r2_key`);
--> statement-breakpoint
CREATE INDEX `exclusive_content_media_collection_idx` ON `exclusive_content_media` (`collection_id`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `exclusive_content_access` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`user_id` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `exclusive_content_collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exclusive_content_access_unique` ON `exclusive_content_access` (`collection_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `exclusive_content_access_user_idx` ON `exclusive_content_access` (`user_id`,`collection_id`);
--> statement-breakpoint
-- Copy the former listing-owned private media and its permissions into the
-- account-owned model. The R2 keys are reused, so no files are duplicated.
INSERT OR IGNORE INTO `exclusive_content_collections` (`id`, `owner_id`, `profile_id`)
SELECT 'cnt_' || `owner_id`, `owner_id`, min(`id`)
FROM `profiles`
WHERE `type` = 'escort'
GROUP BY `owner_id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `exclusive_content_media` (`id`, `collection_id`, `media_type`, `r2_key`, `byte_size`, `content_type`, `moderation_status`, `sort_order`, `created_at`)
SELECT pm.`id`, 'cnt_' || p.`owner_id`, pm.`media_type`, pm.`r2_key`, pm.`byte_size`, pm.`content_type`, pm.`moderation_status`, pm.`sort_order`, pm.`created_at`
FROM `profile_media` pm
INNER JOIN `profiles` p ON p.`id` = pm.`profile_id`
WHERE pm.`visibility` = 'exclusive' AND p.`type` = 'escort';
--> statement-breakpoint
INSERT OR IGNORE INTO `exclusive_content_access` (`id`, `collection_id`, `user_id`, `granted_by`, `created_at`)
SELECT pea.`id`, 'cnt_' || p.`owner_id`, pea.`user_id`, pea.`granted_by`, pea.`created_at`
FROM `profile_exclusive_access` pea
INNER JOIN `profiles` p ON p.`id` = pea.`profile_id`
WHERE p.`type` = 'escort';
