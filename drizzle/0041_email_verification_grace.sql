ALTER TABLE users ADD registration_auth_method text NOT NULL DEFAULT 'unknown';
ALTER TABLE users ADD email_verification_deadline text;
ALTER TABLE users ADD email_verification_blocked_at text;
ALTER TABLE users ADD email_verification_exempt_at text;
ALTER TABLE users ADD email_verification_exempt_by text;
ALTER TABLE users ADD email_verification_exempt_reason text;
ALTER TABLE users ADD email_verification_notice_at text;
ALTER TABLE users ADD email_verification_notice_attempt_at text;
ALTER TABLE users ADD email_verification_last_sent_at text;
-- Existing pending accounts get a fresh grace period, never a retroactive block.
UPDATE users SET email_verification_deadline = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+7 days')
WHERE email_verified_at IS NULL AND role <> 'admin';
-- Older registrations remain unknown: passwords can be added later and linked
-- providers alone cannot prove the original signup method. Admin details show
-- linked providers separately. New registrations persist their exact method.
CREATE INDEX users_email_verification_due_idx ON users(email_verification_deadline)
WHERE email_verified_at IS NULL AND email_verification_exempt_at IS NULL AND role <> 'admin';
