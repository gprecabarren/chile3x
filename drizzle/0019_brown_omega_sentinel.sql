CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`actor_github_login` text,
	`actor_email` text NOT NULL,
	`actor_name` text,
	`category` text NOT NULL,
	`action` text NOT NULL,
	`outcome` text DEFAULT 'success' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`entity_label` text,
	`summary` text NOT NULL,
	`before_data` text,
	`after_data` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_actor_created_idx` ON `admin_audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_category_created_idx` ON `admin_audit_logs` (`category`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_action_created_idx` ON `admin_audit_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_entity_created_idx` ON `admin_audit_logs` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `admin_github_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`github_user_id` text NOT NULL,
	`github_login` text NOT NULL,
	`github_email` text,
	`last_login_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_identity_user_unique` ON `admin_github_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_identity_id_unique` ON `admin_github_identities` (`github_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_identity_login_unique` ON `admin_github_identities` (`github_login`);