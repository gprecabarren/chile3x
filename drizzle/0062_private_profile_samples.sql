CREATE TABLE private_profile_samples (
 id TEXT PRIMARY KEY NOT NULL,
 display_name TEXT NOT NULL,
 form_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 token_hash TEXT UNIQUE,
 expires_at INTEGER NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 migrated_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
 migrated_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX private_profile_samples_updated ON private_profile_samples(updated_at);
CREATE INDEX private_profile_samples_expiry ON private_profile_samples(expires_at);
CREATE TABLE private_sample_media (
 id TEXT PRIMARY KEY NOT NULL,
 sample_id TEXT NOT NULL REFERENCES private_profile_samples(id) ON DELETE CASCADE,
 r2_key TEXT NOT NULL,
 byte_size INTEGER NOT NULL,
 content_type TEXT NOT NULL,
 media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
 is_profile_photo INTEGER NOT NULL DEFAULT 0,
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX private_sample_media_parent ON private_sample_media(sample_id,sort_order);
CREATE TRIGGER private_sample_update_revision AFTER UPDATE ON private_profile_samples
 WHEN NEW.revision=OLD.revision BEGIN
 UPDATE private_profile_samples SET revision=OLD.revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER private_sample_media_insert_revision AFTER INSERT ON private_sample_media BEGIN
 UPDATE private_profile_samples SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=NEW.sample_id;
END;
CREATE TRIGGER private_sample_media_delete_revision AFTER DELETE ON private_sample_media BEGIN
 UPDATE private_profile_samples SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=OLD.sample_id;
END;
