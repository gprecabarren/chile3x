-- Existing duplicate rows are intentionally untouched. Reject any new
-- Escort that would give an account a second one, even for concurrent forms.
CREATE TRIGGER profiles_one_escort_insert
BEFORE INSERT ON profiles
WHEN NEW.type = 'escort' AND EXISTS (
  SELECT 1 FROM profiles WHERE owner_id = NEW.owner_id AND type = 'escort'
)
BEGIN
  SELECT RAISE(ABORT, 'escort_profile_owner_conflict');
END;--> statement-breakpoint
CREATE TRIGGER profiles_one_escort_update
BEFORE UPDATE OF owner_id, type ON profiles
WHEN NEW.type = 'escort' AND EXISTS (
  SELECT 1 FROM profiles WHERE owner_id = NEW.owner_id AND type = 'escort' AND id != NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'escort_profile_owner_conflict');
END;
