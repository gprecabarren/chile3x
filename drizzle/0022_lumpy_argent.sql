CREATE TABLE `account_google_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`google_subject` text NOT NULL,
	`google_email` text NOT NULL,
	`last_login_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_google_identity_user_unique` ON `account_google_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_google_identity_subject_unique` ON `account_google_identities` (`google_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_google_identity_email_unique` ON `account_google_identities` (`google_email`);--> statement-breakpoint
CREATE TABLE `google_registration_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`google_subject` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`full_name` text,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_registration_intent_token_unique` ON `google_registration_intents` (`token_hash`);--> statement-breakpoint
CREATE INDEX `google_registration_intent_expiry_idx` ON `google_registration_intents` (`expires_at`,`used_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_identity_email_unique` ON `admin_github_identities` (`github_email`);