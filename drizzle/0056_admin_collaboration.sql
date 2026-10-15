-- Optimistic versions are maintained for EVERY writer, including owners,
-- background jobs and older tabs. No existing state or approval is changed.
ALTER TABLE profiles ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE exclusive_content_collections ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE collaboration_guards (id TEXT PRIMARY KEY, allowed INTEGER NOT NULL CONSTRAINT collaboration_conflict CHECK (allowed=1));
CREATE TABLE review_reservations (
 resource_key TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX review_reservations_expiry_idx ON review_reservations(expires_at);
CREATE TABLE settings_revision (id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0);
INSERT INTO settings_revision(id) VALUES('site');
CREATE TRIGGER profiles_revision AFTER UPDATE ON profiles WHEN NEW.revision=OLD.revision BEGIN
 UPDATE profiles SET revision=OLD.revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER users_revision AFTER UPDATE ON users WHEN NEW.revision=OLD.revision BEGIN
 UPDATE users SET revision=OLD.revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER collections_revision AFTER UPDATE ON exclusive_content_collections WHEN NEW.revision=OLD.revision BEGIN
 UPDATE exclusive_content_collections SET revision=OLD.revision+1 WHERE id=NEW.id;
END;
CREATE TRIGGER account_profiles_revision AFTER UPDATE OF is_active,self_disabled_at,admin_disabled_at ON users BEGIN
 UPDATE profiles SET revision=revision+1 WHERE owner_id=NEW.id;
 UPDATE exclusive_content_collections SET revision=revision+1 WHERE owner_id=NEW.id;
END;
CREATE TRIGGER profile_details_revision_insert AFTER INSERT ON profile_details BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_details_revision_update AFTER UPDATE ON profile_details BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_details_revision_delete AFTER DELETE ON profile_details BEGIN UPDATE profiles SET revision=revision+1 WHERE id=OLD.profile_id; END;
CREATE TRIGGER profile_tags_revision_insert AFTER INSERT ON profile_tags BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_tags_revision_delete AFTER DELETE ON profile_tags BEGIN UPDATE profiles SET revision=revision+1 WHERE id=OLD.profile_id; END;
CREATE TRIGGER profile_tags_revision_update AFTER UPDATE ON profile_tags BEGIN UPDATE profiles SET revision=revision+1 WHERE id IN(OLD.profile_id,NEW.profile_id); END;
CREATE TRIGGER profile_services_revision_insert AFTER INSERT ON profile_services BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_services_revision_delete AFTER DELETE ON profile_services BEGIN UPDATE profiles SET revision=revision+1 WHERE id=OLD.profile_id; END;
CREATE TRIGGER profile_services_revision_update AFTER UPDATE ON profile_services BEGIN UPDATE profiles SET revision=revision+1 WHERE id IN(OLD.profile_id,NEW.profile_id); END;
CREATE TRIGGER profile_media_revision_insert AFTER INSERT ON profile_media BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_media_revision_update AFTER UPDATE ON profile_media BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_media_revision_delete AFTER DELETE ON profile_media BEGIN UPDATE profiles SET revision=revision+1 WHERE id=OLD.profile_id; END;
CREATE TRIGGER profile_documents_revision_insert AFTER INSERT ON profile_verification_files BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_documents_revision_update AFTER UPDATE ON profile_verification_files BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.profile_id; END;
CREATE TRIGGER profile_documents_revision_delete AFTER DELETE ON profile_verification_files BEGIN UPDATE profiles SET revision=revision+1 WHERE id=OLD.profile_id; END;
CREATE TRIGGER exclusive_media_revision_insert AFTER INSERT ON exclusive_content_media BEGIN UPDATE exclusive_content_collections SET revision=revision+1 WHERE id=NEW.collection_id; END;
CREATE TRIGGER exclusive_media_revision_update AFTER UPDATE ON exclusive_content_media BEGIN UPDATE exclusive_content_collections SET revision=revision+1 WHERE id=NEW.collection_id; END;
CREATE TRIGGER exclusive_media_revision_delete AFTER DELETE ON exclusive_content_media BEGIN UPDATE exclusive_content_collections SET revision=revision+1 WHERE id=OLD.collection_id; END;
CREATE TRIGGER settings_revision_insert AFTER INSERT ON site_settings BEGIN UPDATE settings_revision SET revision=revision+1 WHERE id='site'; END;
CREATE TRIGGER settings_revision_update AFTER UPDATE ON site_settings BEGIN UPDATE settings_revision SET revision=revision+1 WHERE id='site'; END;
CREATE TRIGGER settings_revision_delete AFTER DELETE ON site_settings BEGIN UPDATE settings_revision SET revision=revision+1 WHERE id='site'; END;
-- Account removal must also detect children added after its confirmation page.
CREATE TRIGGER profile_account_revision_insert AFTER INSERT ON profiles BEGIN UPDATE users SET revision=revision+1 WHERE id=NEW.owner_id; END;
CREATE TRIGGER profile_account_revision_update AFTER UPDATE ON profiles BEGIN UPDATE users SET revision=revision+1 WHERE id IN(OLD.owner_id,NEW.owner_id); END;
CREATE TRIGGER profile_account_revision_delete AFTER DELETE ON profiles BEGIN UPDATE users SET revision=revision+1 WHERE id=OLD.owner_id; END;
CREATE TRIGGER library_account_revision_insert AFTER INSERT ON exclusive_content_collections BEGIN UPDATE users SET revision=revision+1 WHERE id=NEW.owner_id; END;
CREATE TRIGGER library_account_revision_update AFTER UPDATE ON exclusive_content_collections BEGIN UPDATE users SET revision=revision+1 WHERE id IN(OLD.owner_id,NEW.owner_id); END;
CREATE TRIGGER library_account_revision_delete AFTER DELETE ON exclusive_content_collections BEGIN UPDATE users SET revision=revision+1 WHERE id=OLD.owner_id; END;
