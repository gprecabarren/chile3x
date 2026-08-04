ALTER TABLE `profiles` ADD `handle` text;--> statement-breakpoint
-- Existing slugs were already unique and derived from each listing name. Keep
-- their recognizable beginning plus the random ending, capped at 40 chars.
UPDATE `profiles` SET `handle` = CASE
  WHEN length(`slug`) <= 40 THEN `slug`
  ELSE rtrim(substr(`slug`, 1, 31), '-') || '-' || substr(`slug`, -8)
END WHERE `handle` IS NULL OR `handle` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_handle_unique` ON `profiles` (`handle`);
