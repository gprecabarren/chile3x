CREATE TABLE `profile_details` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`contact_phone` text,
	`contact_email` text,
	`reference_location` text,
	`schedule` text,
	`price_amount` integer,
	`currency` text DEFAULT 'CLP' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile_services` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`service` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_service_unique` ON `profile_services` (`profile_id`,`kind`,`service`);--> statement-breakpoint
CREATE INDEX `profile_services_service_idx` ON `profile_services` (`service`,`kind`);