CREATE TABLE `data_deletion_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_deletion_jobs_r2_key_unique` ON `data_deletion_jobs` (`r2_key`);--> statement-breakpoint
CREATE INDEX `data_deletion_jobs_created_idx` ON `data_deletion_jobs` (`created_at`);