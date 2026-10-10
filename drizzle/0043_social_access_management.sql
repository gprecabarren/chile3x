CREATE TABLE account_auth_events (
 id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX account_auth_events_user_created_idx ON account_auth_events(user_id, created_at);
CREATE TABLE account_x_identities (
 id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 x_subject TEXT NOT NULL UNIQUE, x_username TEXT NOT NULL,
 last_login_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE x_auth_attempts (
 id TEXT PRIMARY KEY NOT NULL, state_hash TEXT NOT NULL UNIQUE, browser_hash TEXT NOT NULL,
 code_verifier TEXT NOT NULL, intent TEXT NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
 return_to TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX x_auth_attempts_expiry_idx ON x_auth_attempts(expires_at);
CREATE TABLE x_registration_intents (
 id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL UNIQUE, x_subject TEXT NOT NULL,
 x_username TEXT NOT NULL, email TEXT, display_name TEXT NOT NULL,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX x_registration_intents_expiry_idx ON x_registration_intents(expires_at);
