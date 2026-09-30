-- Keep the parent table and its foreign keys intact; only replace this column.
ALTER TABLE `profiles` ADD COLUMN `tier_bronze` text DEFAULT 'bronze' NOT NULL;--> statement-breakpoint
UPDATE `profiles` SET `tier_bronze` = CASE WHEN `tier` = 'gold' THEN 'bronze' ELSE `tier` END;--> statement-breakpoint
-- Demo copy was authored with the former label; do not rewrite user-authored text.
UPDATE `profiles` SET `short_description` = replace(`short_description`, 'Gold', 'Bronze'), `description` = replace(`description`, 'Gold', 'Bronze') WHERE `is_demo` = 1;--> statement-breakpoint
ALTER TABLE `profiles` DROP COLUMN `tier`;--> statement-breakpoint
ALTER TABLE `profiles` RENAME COLUMN `tier_bronze` TO `tier`;
