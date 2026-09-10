CREATE TABLE `operational_events` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`event_name` text NOT NULL,
	`outcome` text NOT NULL,
	`duration_ms` integer,
	`detail` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `operational_events_created_idx` ON `operational_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `operational_events_category_created_idx` ON `operational_events` (`category`,`created_at`);--> statement-breakpoint
CREATE INDEX `operational_events_outcome_created_idx` ON `operational_events` (`outcome`,`created_at`);--> statement-breakpoint
CREATE TABLE `operational_storage_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`d1_used_bytes` integer,
	`d1_allocated_bytes` integer,
	`r2_object_count` integer,
	`r2_bytes` integer,
	`referenced_object_count` integer,
	`orphan_object_count` integer,
	`orphan_bytes` integer,
	`missing_object_count` integer,
	`scan_duration_ms` integer,
	`scanned_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `operational_storage_created_idx` ON `operational_storage_snapshots` (`created_at`);--> statement-breakpoint
CREATE TABLE `__new_auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`auth_method` text DEFAULT 'unknown' NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`country_code` text,
	`region` text,
	`city` text,
	`timezone` text,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_auth_sessions` (`id`, `user_id`, `token_hash`, `auth_method`, `last_seen_at`, `expires_at`, `created_at`)
SELECT `id`, `user_id`, `token_hash`, 'unknown', `created_at`, `expires_at`, `created_at`
FROM `auth_sessions`;--> statement-breakpoint
DROP TABLE `auth_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auth_sessions` RENAME TO `auth_sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_expires_idx` ON `auth_sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_last_seen_idx` ON `auth_sessions` (`user_id`,`last_seen_at`);
