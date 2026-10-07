-- Only the explicitly authorized existing account may own multiple active
-- Escort listings. Both its immutable ID and current email must match.
-- No listing, account or media data is deleted or rewritten by this migration.
DROP TRIGGER IF EXISTS profiles_one_escort_insert;--> statement-breakpoint
DROP TRIGGER IF EXISTS profiles_one_escort_update;--> statement-breakpoint
CREATE TRIGGER profiles_one_escort_insert
BEFORE INSERT ON profiles
WHEN NEW.type = 'escort' AND NEW.trashed_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = NEW.owner_id
    AND id = 'usr_b876b728-e6e9-48cd-9d78-db0124556362'
    AND lower(trim(email)) = 'hiragasaito4@hotmail.com'
)
AND EXISTS (
  SELECT 1 FROM profiles WHERE owner_id = NEW.owner_id AND type = 'escort' AND trashed_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'escort_profile_owner_conflict');
END;--> statement-breakpoint
CREATE TRIGGER profiles_one_escort_update
BEFORE UPDATE OF owner_id, type, trashed_at ON profiles
WHEN NEW.type = 'escort' AND NEW.trashed_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = NEW.owner_id
    AND id = 'usr_b876b728-e6e9-48cd-9d78-db0124556362'
    AND lower(trim(email)) = 'hiragasaito4@hotmail.com'
)
AND EXISTS (
  SELECT 1 FROM profiles WHERE owner_id = NEW.owner_id AND type = 'escort' AND trashed_at IS NULL AND id != NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'escort_profile_owner_conflict');
END;
