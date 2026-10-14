CREATE TABLE `auth_session_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`return_to` text NOT NULL,
	`previous_sessions` text DEFAULT '[]' NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_session_completions_expiry_idx` ON `auth_session_completions` (`expires_at`);
--> statement-breakpoint
DROP TRIGGER IF EXISTS identity_admin_github_access_update;
--> statement-breakpoint
CREATE TRIGGER identity_admin_github_access_update BEFORE UPDATE OF protected_email, is_active ON admin_github_access
WHEN (NEW.is_active <> 0 OR lower(trim(NEW.protected_email)) IS NOT lower(trim(OLD.protected_email))) AND NEW.protected_email IS NOT NULL AND (EXISTS (SELECT 1 FROM users WHERE role <> 'admin' AND lower(trim(email))=lower(trim(NEW.protected_email))) OR EXISTS (SELECT 1 FROM account_google_identities g JOIN users u ON u.id=g.user_id WHERE u.role <> 'admin' AND lower(trim(g.google_email))=lower(trim(NEW.protected_email))) OR EXISTS (SELECT 1 FROM account_apple_identities a JOIN users u ON u.id=a.user_id WHERE u.role <> 'admin' AND lower(trim(a.apple_email))=lower(trim(NEW.protected_email))))
BEGIN SELECT RAISE(ABORT, 'public_email_reserved'); END;
