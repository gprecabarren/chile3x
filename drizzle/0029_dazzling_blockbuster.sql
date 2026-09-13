CREATE TABLE `account_apple_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`apple_subject` text NOT NULL,
	`apple_email` text NOT NULL,
	`refresh_token_encrypted` text,
	`last_login_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_apple_identity_user_unique` ON `account_apple_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_apple_identity_subject_unique` ON `account_apple_identities` (`apple_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_apple_identity_email_unique` ON `account_apple_identities` (`apple_email`);--> statement-breakpoint
CREATE TABLE `apple_auth_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`state_hash` text NOT NULL,
	`nonce` text NOT NULL,
	`intent` text NOT NULL,
	`return_to` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apple_auth_attempt_state_unique` ON `apple_auth_attempts` (`state_hash`);--> statement-breakpoint
CREATE INDEX `apple_auth_attempt_expiry_idx` ON `apple_auth_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `apple_registration_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`apple_subject` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`full_name` text,
	`refresh_token_encrypted` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apple_registration_intent_token_unique` ON `apple_registration_intents` (`token_hash`);--> statement-breakpoint
CREATE INDEX `apple_registration_intent_expiry_idx` ON `apple_registration_intents` (`expires_at`);