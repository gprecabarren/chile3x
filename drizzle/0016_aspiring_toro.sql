CREATE TABLE `bug_report_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `bug_reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bug_report_messages_report_created_idx` ON `bug_report_messages` (`report_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bug_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`page_url` text NOT NULL,
	`page_title` text DEFAULT '' NOT NULL,
	`device_type` text NOT NULL,
	`viewport` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bug_reports_status_updated_idx` ON `bug_reports` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `bug_reports_reporter_updated_idx` ON `bug_reports` (`reporter_id`,`updated_at`);
