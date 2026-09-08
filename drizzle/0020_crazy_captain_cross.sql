CREATE TABLE `admin_github_access` (
	`id` text PRIMARY KEY NOT NULL,
	`github_login` text NOT NULL,
	`github_user_id` text,
	`user_id` text,
	`access_level` text DEFAULT 'moderator' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`invited_by` text,
	`revoked_by` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_access_login_unique` ON `admin_github_access` (`github_login`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_access_id_unique` ON `admin_github_access` (`github_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_github_access_user_unique` ON `admin_github_access` (`user_id`);--> statement-breakpoint
CREATE INDEX `admin_github_access_active_level_idx` ON `admin_github_access` (`is_active`,`access_level`);--> statement-breakpoint
WITH RECURSIVE `allowed_logins`(`github_login`, `remaining`) AS (
	SELECT '', trim(`value`) || ',' FROM `site_settings` WHERE `key` = 'admin_github_logins'
	UNION ALL
	SELECT lower(trim(substr(`remaining`, 1, instr(`remaining`, ',') - 1))), substr(`remaining`, instr(`remaining`, ',') + 1)
	FROM `allowed_logins` WHERE `remaining` <> ''
)
INSERT OR IGNORE INTO `admin_github_access` (`id`, `github_login`, `access_level`, `is_active`)
SELECT 'admin_access_' || `github_login`, `github_login`,
	CASE WHEN `github_login` = 'gprecabarren' THEN 'owner' ELSE 'administrator' END, 1
FROM `allowed_logins` WHERE `github_login` <> '';--> statement-breakpoint
INSERT OR IGNORE INTO `admin_github_access` (`id`, `github_login`, `github_user_id`, `user_id`, `access_level`, `is_active`)
SELECT 'admin_access_' || lower(`github_login`), lower(`github_login`), `github_user_id`, `user_id`,
	CASE WHEN lower(`github_login`) = 'gprecabarren' THEN 'owner' ELSE 'administrator' END, 1
FROM `admin_github_identities`;--> statement-breakpoint
UPDATE `admin_github_access`
SET `github_user_id` = (SELECT `github_user_id` FROM `admin_github_identities` WHERE lower(`admin_github_identities`.`github_login`) = `admin_github_access`.`github_login` LIMIT 1),
	`user_id` = (SELECT `user_id` FROM `admin_github_identities` WHERE lower(`admin_github_identities`.`github_login`) = `admin_github_access`.`github_login` LIMIT 1),
	`updated_at` = CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM `admin_github_identities` WHERE lower(`admin_github_identities`.`github_login`) = `admin_github_access`.`github_login`);
