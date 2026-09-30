ALTER TABLE `profiles` ADD `creation_source` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `created_by_admin_id` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `created_by_admin_login` text;--> statement-breakpoint
ALTER TABLE `users` ADD `creation_source` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `created_by_admin_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `created_by_admin_login` text;
--> statement-breakpoint
UPDATE users SET
  creation_source = 'admin',
  created_by_admin_id = (SELECT actor_user_id FROM admin_audit_logs WHERE action = 'account.create' AND entity_type = 'account' AND entity_id = users.id AND outcome = 'success' ORDER BY created_at DESC LIMIT 1),
  created_by_admin_login = (SELECT actor_github_login FROM admin_audit_logs WHERE action = 'account.create' AND entity_type = 'account' AND entity_id = users.id AND outcome = 'success' ORDER BY created_at DESC LIMIT 1)
WHERE EXISTS (SELECT 1 FROM admin_audit_logs WHERE action = 'account.create' AND entity_type = 'account' AND entity_id = users.id AND outcome = 'success');
--> statement-breakpoint
UPDATE users SET creation_source = 'self'
WHERE creation_source = 'unknown' AND EXISTS (
  SELECT 1 FROM admin_notifications WHERE kind = 'account_registered' AND actor_user_id = users.id
);
--> statement-breakpoint
UPDATE profiles SET
  creation_source = 'admin',
  created_by_admin_id = (SELECT actor_user_id FROM admin_audit_logs WHERE action = 'profile.create' AND entity_type = 'profile' AND entity_id = profiles.id AND outcome = 'success' ORDER BY created_at DESC LIMIT 1),
  created_by_admin_login = (SELECT actor_github_login FROM admin_audit_logs WHERE action = 'profile.create' AND entity_type = 'profile' AND entity_id = profiles.id AND outcome = 'success' ORDER BY created_at DESC LIMIT 1)
WHERE EXISTS (SELECT 1 FROM admin_audit_logs WHERE action = 'profile.create' AND entity_type = 'profile' AND entity_id = profiles.id AND outcome = 'success');
-- Older admin-assisted listings also emitted profile_created notifications on behalf
-- of the owner. Those notifications cannot prove self-creation, so keep unknown.
