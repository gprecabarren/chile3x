ALTER TABLE `admin_github_access` ADD `protected_email` text;--> statement-breakpoint
ALTER TABLE `admin_github_access` ADD `is_protected_owner` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `admin_github_access`
SET `access_level` = 'owner', `is_active` = 1, `protected_email` = 'genaropiedra@hotmail.com', `is_protected_owner` = 1,
	`revoked_at` = NULL, `revoked_by` = NULL, `updated_at` = CURRENT_TIMESTAMP
WHERE `github_login` = 'gprecabarren';
