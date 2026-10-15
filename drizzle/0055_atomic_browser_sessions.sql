-- Nullable for existing sessions: never identify devices by IP/user-agent or
-- close unrelated devices during deployment. New logins claim one atomic slot.
ALTER TABLE auth_sessions ADD COLUMN browser_key_hash TEXT;
CREATE UNIQUE INDEX auth_sessions_browser_key_unique ON auth_sessions(browser_key_hash);
