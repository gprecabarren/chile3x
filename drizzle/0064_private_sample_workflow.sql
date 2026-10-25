-- Stable private links, provenance and reversible expiration. Existing IDs,
-- hashes and URLs remain valid; recoverable invitation tokens are encrypted.
ALTER TABLE private_profile_samples ADD COLUMN handle TEXT;
CREATE UNIQUE INDEX private_profile_samples_handle_unique ON private_profile_samples(handle);
-- UUID IDs remain accepted aliases. The rowid suffix makes the shorter
-- backfill collision-free without copying names or other private data.
UPDATE private_profile_samples SET handle='m-'||substr(replace(substr(id,5),'-',''),1,8)||'-'||printf('%x',rowid) WHERE handle IS NULL;
ALTER TABLE private_profile_samples ADD COLUMN token_encrypted TEXT;
ALTER TABLE private_profile_samples ADD COLUMN legacy_token_hash TEXT;
ALTER TABLE private_profile_samples ADD COLUMN provenance TEXT NOT NULL DEFAULT 'otros'
 CHECK (provenance IN ('sexosur','publiescort','relaxchile','elsilencio','otros'));
ALTER TABLE private_profile_samples ADD COLUMN trashed_at INTEGER;
ALTER TABLE private_profile_samples ADD COLUMN trashed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE private_profile_samples ADD COLUMN trash_reason TEXT CHECK (trash_reason IN ('manual','expired'));
ALTER TABLE private_profile_samples ADD COLUMN contacted_at TEXT;
ALTER TABLE private_profile_samples ADD COLUMN contacted_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE private_profile_samples ADD COLUMN contacted_by_login TEXT;
CREATE INDEX private_profile_samples_trash ON private_profile_samples(trashed_at);
CREATE INDEX private_profile_samples_provenance ON private_profile_samples(provenance,updated_at);
CREATE INDEX private_profile_samples_contacted ON private_profile_samples(contacted_at,updated_at);
CREATE TRIGGER private_sample_media_update_revision AFTER UPDATE ON private_sample_media BEGIN
 UPDATE private_profile_samples SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id IN (OLD.sample_id,NEW.sample_id);
END;

-- A confirmed migration may authorize one particular additional Escort. The
-- account's ordinary creation flow retains its one-Escort limit. Transferring
-- the listing to another owner cannot carry this exception automatically.
ALTER TABLE profiles ADD COLUMN admin_escort_limit_override INTEGER NOT NULL DEFAULT 0 CHECK (admin_escort_limit_override IN (0,1));
DROP TRIGGER IF EXISTS profiles_one_escort_insert;
DROP TRIGGER IF EXISTS profiles_one_escort_update;
CREATE TRIGGER profiles_one_escort_insert
BEFORE INSERT ON profiles
WHEN NEW.type='escort' AND NEW.trashed_at IS NULL
AND NOT EXISTS (
 SELECT 1 FROM users WHERE id=NEW.owner_id
 AND id='usr_b876b728-e6e9-48cd-9d78-db0124556362'
 AND lower(trim(email))='hiragasaito4@hotmail.com'
)
AND NOT (NEW.admin_escort_limit_override=1 AND NEW.creation_source='admin' AND NEW.created_by_admin_id IS NOT NULL)
AND EXISTS (SELECT 1 FROM profiles WHERE owner_id=NEW.owner_id AND type='escort' AND trashed_at IS NULL)
BEGIN
 SELECT RAISE(ABORT,'escort_profile_owner_conflict');
END;
CREATE TRIGGER profiles_one_escort_update
BEFORE UPDATE OF owner_id,type,trashed_at ON profiles
WHEN NEW.type='escort' AND NEW.trashed_at IS NULL
AND NOT EXISTS (
 SELECT 1 FROM users WHERE id=NEW.owner_id
 AND id='usr_b876b728-e6e9-48cd-9d78-db0124556362'
 AND lower(trim(email))='hiragasaito4@hotmail.com'
)
AND NOT (NEW.admin_escort_limit_override=1 AND OLD.admin_escort_limit_override=1
 AND NEW.owner_id=OLD.owner_id AND NEW.creation_source='admin' AND NEW.created_by_admin_id IS NOT NULL)
AND EXISTS (SELECT 1 FROM profiles WHERE owner_id=NEW.owner_id AND type='escort' AND trashed_at IS NULL AND id!=NEW.id)
BEGIN
 SELECT RAISE(ABORT,'escort_profile_owner_conflict');
END;
-- An allowed transfer to an account with no Escort must also consume the old
-- owner's exception, including transfers made while the listing is trashed.
-- Otherwise a later trash/create/restore cycle could reuse that permission.
CREATE TRIGGER profiles_escort_override_owner_reset
AFTER UPDATE OF owner_id ON profiles
WHEN NEW.owner_id!=OLD.owner_id AND NEW.admin_escort_limit_override=1
BEGIN
 UPDATE profiles SET admin_escort_limit_override=0 WHERE id=NEW.id;
END;
