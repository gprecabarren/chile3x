CREATE TABLE `data_retention_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_retention_hold_entity_unique` ON `data_retention_holds` (`entity_type`,`entity_id`);--> statement-breakpoint
ALTER TABLE `profile_verification_files` ADD `retention_expires_at` text;--> statement-breakpoint
CREATE INDEX `profile_verification_retention_idx` ON `profile_verification_files` (`retention_expires_at`);
--> statement-breakpoint
UPDATE profile_verification_files SET retention_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', max(datetime(updated_at, CASE WHEN kind='medical' THEN '+30 days' ELSE '+90 days' END), datetime('2026-11-13T12:00:00.000Z'))) WHERE retention_expires_at IS NULL;
