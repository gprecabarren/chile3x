CREATE TABLE `profile_views` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`viewer_key` text NOT NULL,
	`viewed_on` text NOT NULL,
	`viewed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_view_daily_unique` ON `profile_views` (`profile_id`,`viewer_key`,`viewed_on`);--> statement-breakpoint
CREATE INDEX `profile_views_profile_day_idx` ON `profile_views` (`profile_id`,`viewed_on`);