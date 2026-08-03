CREATE TABLE `profile_report_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `profile_reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_report_evidence_r2_key_unique` ON `profile_report_evidence` (`r2_key`);--> statement-breakpoint
CREATE INDEX `profile_report_evidence_report_idx` ON `profile_report_evidence` (`report_id`,`created_at`);