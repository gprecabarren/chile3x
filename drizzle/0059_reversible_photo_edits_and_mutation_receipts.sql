CREATE TABLE profile_media_edits (
  media_id TEXT PRIMARY KEY NOT NULL REFERENCES profile_media(id) ON DELETE CASCADE,
  original_r2_key TEXT NOT NULL,
  original_byte_size INTEGER NOT NULL,
  original_content_type TEXT NOT NULL,
  watermark INTEGER NOT NULL DEFAULT 0,
  blur INTEGER NOT NULL DEFAULT 0,
  face_regions TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE admin_mutation_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_key TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_mutation_receipts_expiry_idx ON admin_mutation_receipts(expires_at);
-- All deletion paths, including cascaded account/profile deletion, enqueue
-- private bases before their metadata disappears. R2 cleanup is retriable.
CREATE TRIGGER profile_media_private_base_cleanup BEFORE DELETE ON profile_media BEGIN
  INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key)
  SELECT lower(hex(randomblob(16))),original_r2_key FROM profile_media_edits
  WHERE media_id=OLD.id AND original_r2_key!=OLD.r2_key;
END;
