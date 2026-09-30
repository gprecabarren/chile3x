ALTER TABLE `profiles` ADD `trashed_at` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `trashed_by_kind` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `trashed_by_actor_id` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `trashed_by_admin_login` text;--> statement-breakpoint
CREATE INDEX `profiles_trash_date_idx` ON `profiles` (`trashed_at`);--> statement-breakpoint
-- Trashing frees only the Escort slot. Existing duplicate rows remain untouched.
DROP TRIGGER IF EXISTS profiles_one_escort_insert;--> statement-breakpoint
DROP TRIGGER IF EXISTS profiles_one_escort_update;--> statement-breakpoint
CREATE TRIGGER profiles_one_escort_insert
BEFORE INSERT ON profiles
WHEN NEW.type = 'escort' AND NEW.trashed_at IS NULL AND EXISTS (
  SELECT 1 FROM profiles WHERE owner_id = NEW.owner_id AND type = 'escort' AND trashed_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'escort_profile_owner_conflict');
END;--> statement-breakpoint
CREATE TRIGGER profiles_one_escort_update
BEFORE UPDATE OF owner_id, type, trashed_at ON profiles
WHEN NEW.type = 'escort' AND NEW.trashed_at IS NULL AND EXISTS (
  SELECT 1 FROM profiles WHERE owner_id = NEW.owner_id AND type = 'escort' AND trashed_at IS NULL AND id != NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'escort_profile_owner_conflict');
END;
