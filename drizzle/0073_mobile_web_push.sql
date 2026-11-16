-- A subscription belongs to one browser installation and one authenticated account.
CREATE TABLE mobile_push_devices (
  id TEXT PRIMARY KEY,
  browser_key_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  auth_secret TEXT NOT NULL,
  audit_enabled INTEGER NOT NULL DEFAULT 0 CHECK (audit_enabled IN (0,1)),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX mobile_push_devices_user_idx ON mobile_push_devices(user_id);
CREATE INDEX mobile_push_devices_updated_idx ON mobile_push_devices(updated_at);

CREATE TABLE mobile_push_pending (
  device_id TEXT NOT NULL REFERENCES mobile_push_devices(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('message','approved','registration','moderation','audit','test')),
  revision TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
  available_at INTEGER NOT NULL DEFAULT (unixepoch()),
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, kind)
);
CREATE INDEX mobile_push_pending_due_idx ON mobile_push_pending(available_at);

-- Expired website sessions may be renewed without losing background delivery.
-- Explicit or administrative revocation of a live session removes its device.
CREATE TRIGGER mobile_push_session_removed AFTER DELETE ON auth_sessions
WHEN OLD.browser_key_hash IS NOT NULL AND datetime(OLD.expires_at)>datetime('now')
BEGIN
  DELETE FROM mobile_push_devices WHERE browser_key_hash=OLD.browser_key_hash AND user_id=OLD.user_id;
END;

CREATE TRIGGER mobile_push_account_changed_on_insert AFTER INSERT ON auth_sessions
BEGIN
  DELETE FROM mobile_push_devices WHERE browser_key_hash=NEW.browser_key_hash AND user_id<>NEW.user_id;
END;

CREATE TRIGGER mobile_push_account_changed_on_update AFTER UPDATE OF user_id ON auth_sessions
WHEN OLD.user_id<>NEW.user_id
BEGIN
  DELETE FROM mobile_push_devices WHERE browser_key_hash=NEW.browser_key_hash AND user_id<>NEW.user_id;
END;

CREATE TRIGGER mobile_push_new_message AFTER INSERT ON message_messages
WHEN NEW.sender_user_id IS NOT NULL
BEGIN
  INSERT INTO mobile_push_pending(device_id,kind)
  SELECT d.id,'message' FROM message_conversations c
  JOIN mobile_push_devices d ON d.user_id=CASE NEW.sender_role WHEN 'visitor' THEN c.owner_user_id ELSE c.visitor_user_id END
  WHERE c.id=NEW.conversation_id AND d.user_id<>NEW.sender_user_id AND NOT EXISTS (
    SELECT 1 FROM message_conversation_preferences p WHERE p.conversation_id=c.id AND
    ((p.user_id=d.user_id AND p.is_muted=1) OR p.blocked_at IS NOT NULL)
  )
  ON CONFLICT(device_id,kind) DO UPDATE SET revision=excluded.revision,requested_at=excluded.requested_at,
    available_at=excluded.available_at,attempts=0;
END;

CREATE TRIGGER mobile_push_profile_approved AFTER UPDATE OF status ON profiles
WHEN OLD.status<>'approved' AND NEW.status='approved' AND NEW.trashed_at IS NULL AND NEW.is_demo=0
BEGIN
  INSERT INTO mobile_push_pending(device_id,kind)
  SELECT id,'approved' FROM mobile_push_devices WHERE user_id=NEW.owner_id
  ON CONFLICT(device_id,kind) DO UPDATE SET revision=excluded.revision,requested_at=excluded.requested_at,
    available_at=excluded.available_at,attempts=0;
END;

CREATE TRIGGER mobile_push_profile_approved_on_insert AFTER INSERT ON profiles
WHEN NEW.status='approved' AND NEW.trashed_at IS NULL AND NEW.is_demo=0
BEGIN
  INSERT INTO mobile_push_pending(device_id,kind)
  SELECT id,'approved' FROM mobile_push_devices WHERE user_id=NEW.owner_id
  ON CONFLICT(device_id,kind) DO UPDATE SET revision=excluded.revision,requested_at=excluded.requested_at,
    available_at=excluded.available_at,attempts=0;
END;

CREATE TRIGGER mobile_push_admin_notification AFTER INSERT ON admin_notifications
WHEN NEW.kind IN ('account_registered','profile_created','profile_updated','media_uploaded')
BEGIN
  INSERT INTO mobile_push_pending(device_id,kind)
  SELECT d.id, CASE NEW.kind WHEN 'account_registered' THEN 'registration' ELSE 'moderation' END
  FROM mobile_push_devices d JOIN admin_github_access a ON a.user_id=d.user_id
  WHERE a.is_active=1 AND a.access_level IN ('owner','administrator','moderator')
  ON CONFLICT(device_id,kind) DO UPDATE SET revision=excluded.revision,requested_at=excluded.requested_at,
    available_at=excluded.available_at,attempts=0;
END;

CREATE TRIGGER mobile_push_audit AFTER INSERT ON admin_audit_logs
BEGIN
  INSERT INTO mobile_push_pending(device_id,kind)
  SELECT d.id,'audit' FROM mobile_push_devices d JOIN admin_github_access a ON a.user_id=d.user_id
  WHERE d.audit_enabled=1 AND a.is_active=1 AND a.access_level IN ('owner','administrator','moderator')
  ON CONFLICT(device_id,kind) DO UPDATE SET revision=excluded.revision,requested_at=excluded.requested_at,
    available_at=excluded.available_at,attempts=0;
END;
