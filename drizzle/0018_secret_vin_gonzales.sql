CREATE TABLE `profile_city_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`user_id` text NOT NULL,
	`city` text NOT NULL,
	`notified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_city_alert_unique` ON `profile_city_alerts` (`profile_id`,`user_id`,`city`);--> statement-breakpoint
CREATE INDEX `profile_city_alert_destination_idx` ON `profile_city_alerts` (`profile_id`,`city`,`notified_at`);--> statement-breakpoint
CREATE INDEX `profile_city_alert_user_idx` ON `profile_city_alerts` (`user_id`,`notified_at`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `verified_at` text;--> statement-breakpoint
UPDATE `profiles` SET `verified_at` = `updated_at` WHERE `verification_status` = 'reviewed';
