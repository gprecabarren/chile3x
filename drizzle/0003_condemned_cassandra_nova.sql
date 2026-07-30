CREATE TABLE `agency_membership_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_profile_id` text NOT NULL,
	`escort_profile_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`responded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agency_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`escort_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agency_membership_request_unique` ON `agency_membership_requests` (`agency_profile_id`,`escort_profile_id`);--> statement-breakpoint
CREATE INDEX `agency_membership_request_escort_status_idx` ON `agency_membership_requests` (`escort_profile_id`,`status`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_demo` integer DEFAULT false NOT NULL;