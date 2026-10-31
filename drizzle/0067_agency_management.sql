-- Existing associations remain association-only. No historical permission is expanded.
ALTER TABLE profiles ADD COLUMN agency_custodian_id TEXT REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE profiles ADD COLUMN agency_origin_id TEXT;
CREATE INDEX profiles_agency_custodian_idx ON profiles(agency_custodian_id);
ALTER TABLE agency_members ADD COLUMN can_manage INTEGER NOT NULL DEFAULT 0 CHECK(can_manage IN(0,1));
ALTER TABLE agency_members ADD COLUMN documents_authorized INTEGER NOT NULL DEFAULT 0 CHECK(documents_authorized IN(0,1));
ALTER TABLE agency_membership_requests ADD COLUMN management_requested INTEGER NOT NULL DEFAULT 0 CHECK(management_requested IN(0,1));
ALTER TABLE agency_membership_requests ADD COLUMN documents_requested INTEGER NOT NULL DEFAULT 0 CHECK(documents_requested IN(0,1));
ALTER TABLE agency_membership_requests ADD COLUMN expires_at INTEGER;
CREATE TABLE agency_profile_claims (
 revision INTEGER NOT NULL DEFAULT 0, id TEXT PRIMARY KEY, agency_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 escort_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 source_owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','declined','cancelled','completed')),
 keep_management INTEGER NOT NULL DEFAULT 0 CHECK(keep_management IN(0,1)),
 documents_authorized INTEGER NOT NULL DEFAULT 0 CHECK(documents_authorized IN(0,1)),
 accepted_at TEXT, accepted_revision INTEGER, verified_revision INTEGER, verified_by TEXT REFERENCES users(id) ON DELETE SET NULL, verified_at TEXT, completed_at TEXT,
 expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX agency_claim_target_idx ON agency_profile_claims(target_user_id,status);
CREATE UNIQUE INDEX agency_claim_pending_unique ON agency_profile_claims(escort_profile_id) WHERE status IN('pending','accepted');
CREATE TABLE agency_activity_logs (
 id TEXT PRIMARY KEY, actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 agency_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
 escort_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
 action TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX agency_activity_escort_idx ON agency_activity_logs(escort_profile_id,created_at);
CREATE INDEX agency_activity_agency_idx ON agency_activity_logs(agency_profile_id,created_at);
CREATE TABLE agency_email_jobs (
 id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 agency_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
 escort_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX agency_email_due_idx ON agency_email_jobs(status,next_attempt_at);
-- Preserve the pre-existing narrowly scoped exemption without copying private
-- account literals into a new release. Read its exact ID/email pair from the old
-- trigger; the internal policy table has no user-facing mutation endpoint.
CREATE TABLE escort_profile_limit_exemptions(user_id TEXT PRIMARY KEY,email_key TEXT NOT NULL);
WITH source AS (SELECT replace(replace(replace(sql,' ',''),char(10),''),char(13),'') src FROM sqlite_master WHERE type='trigger' AND name='profiles_one_escort_insert'),
parts AS (SELECT substr(src,instr(src,'id=''')+length('id=''')) id_part,substr(src,instr(src,'lower(trim(email))=''')+length('lower(trim(email))=''')) email_part FROM source WHERE instr(src,'id=''')>0 AND instr(src,'lower(trim(email))=''')>0)
INSERT INTO escort_profile_limit_exemptions SELECT substr(id_part,1,instr(id_part,char(39))-1),lower(substr(email_part,1,instr(email_part,char(39))-1)) FROM parts;
INSERT INTO collaboration_guards(id,allowed)SELECT 'agency-quota-migration',CASE WHEN count(*)=1 THEN 1 ELSE 0 END FROM escort_profile_limit_exemptions;
DELETE FROM collaboration_guards WHERE id='agency-quota-migration';
DROP TRIGGER IF EXISTS profiles_one_escort_insert;
DROP TRIGGER IF EXISTS profiles_one_escort_update;
CREATE TRIGGER profiles_one_escort_insert
BEFORE INSERT ON profiles
WHEN NEW.type='escort' AND NEW.trashed_at IS NULL AND NEW.agency_custodian_id IS NULL
AND NOT EXISTS (
 SELECT 1 FROM users u JOIN escort_profile_limit_exemptions e ON e.user_id=u.id
 WHERE u.id=NEW.owner_id AND e.email_key=lower(trim(u.email))
)
AND NOT (NEW.admin_escort_limit_override=1 AND NEW.creation_source='admin' AND NEW.created_by_admin_id IS NOT NULL)
AND EXISTS (SELECT 1 FROM profiles WHERE owner_id=NEW.owner_id AND type='escort' AND trashed_at IS NULL AND agency_custodian_id IS NULL)
BEGIN
 SELECT RAISE(ABORT,'escort_profile_owner_conflict');
END;
CREATE TRIGGER profiles_one_escort_update
BEFORE UPDATE OF owner_id,type,trashed_at,agency_custodian_id ON profiles
WHEN NEW.type='escort' AND NEW.trashed_at IS NULL AND NEW.agency_custodian_id IS NULL
AND NOT EXISTS (
 SELECT 1 FROM users u JOIN escort_profile_limit_exemptions e ON e.user_id=u.id
 WHERE u.id=NEW.owner_id AND e.email_key=lower(trim(u.email))
)
AND NOT (NEW.admin_escort_limit_override=1 AND OLD.admin_escort_limit_override=1
 AND NEW.owner_id=OLD.owner_id AND NEW.creation_source='admin' AND NEW.created_by_admin_id IS NOT NULL)
AND EXISTS (SELECT 1 FROM profiles WHERE owner_id=NEW.owner_id AND type='escort' AND trashed_at IS NULL AND agency_custodian_id IS NULL AND id!=NEW.id)
BEGIN
 SELECT RAISE(ABORT,'escort_profile_owner_conflict');
END;

CREATE TRIGGER profiles_agency_custody_insert BEFORE INSERT ON profiles
WHEN NEW.agency_custodian_id IS NOT NULL AND (NEW.type!='escort' OR NOT EXISTS(
 SELECT 1 FROM profiles a JOIN users u ON u.id=a.owner_id
 WHERE a.id=NEW.agency_custodian_id AND a.type='agency' AND a.owner_id=NEW.owner_id AND a.trashed_at IS NULL AND u.is_active=1))
BEGIN SELECT RAISE(ABORT,'agency_custody_conflict'); END;
CREATE TRIGGER profiles_agency_custody_update BEFORE UPDATE OF owner_id,type,agency_custodian_id,trashed_at ON profiles
WHEN NEW.agency_custodian_id IS NOT NULL AND (NEW.type!='escort' OR NOT EXISTS(
 SELECT 1 FROM profiles a WHERE a.id=NEW.agency_custodian_id AND a.type='agency' AND a.owner_id=NEW.owner_id AND (a.trashed_at IS NULL OR NEW.trashed_at IS NOT NULL)))
BEGIN SELECT RAISE(ABORT,'agency_custody_conflict'); END;
CREATE TRIGGER profiles_agency_dependents BEFORE UPDATE OF owner_id,type,trashed_at ON profiles
WHEN EXISTS(SELECT 1 FROM profiles p WHERE p.agency_custodian_id=OLD.id AND
 (NEW.owner_id!=OLD.owner_id OR NEW.type!='agency' OR (NEW.trashed_at IS NOT NULL AND p.trashed_at IS NULL)))
BEGIN SELECT RAISE(ABORT,'agency_has_dependents'); END;
CREATE TRIGGER agency_custody_content_insert BEFORE INSERT ON profile_details
WHEN json_valid(NEW.metadata) AND coalesce(json_extract(NEW.metadata,'$.content_only'),'0')='1'
AND EXISTS(SELECT 1 FROM profiles WHERE id=NEW.profile_id AND agency_custodian_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'agency_content_only_conflict'); END;
CREATE TRIGGER agency_custody_content_update BEFORE UPDATE OF metadata ON profile_details
WHEN json_valid(NEW.metadata) AND coalesce(json_extract(NEW.metadata,'$.content_only'),'0')='1'
AND EXISTS(SELECT 1 FROM profiles WHERE id=NEW.profile_id AND agency_custodian_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'agency_content_only_conflict'); END;
-- Every permission change invalidates editor versions, including in-flight uploads.
CREATE TRIGGER agency_members_revision_insert AFTER INSERT ON agency_members BEGIN UPDATE profiles SET revision=revision+1 WHERE id=NEW.member_profile_id; END;
CREATE TRIGGER agency_members_revision_update AFTER UPDATE ON agency_members BEGIN UPDATE profiles SET revision=revision+1 WHERE id IN(OLD.member_profile_id,NEW.member_profile_id); END;
CREATE TRIGGER agency_members_revision_delete AFTER DELETE ON agency_members BEGIN UPDATE profiles SET revision=revision+1 WHERE id=OLD.member_profile_id; END;
CREATE TRIGGER agency_account_permissions_revision AFTER UPDATE OF is_active,self_disabled_at,admin_disabled_at ON users BEGIN
 UPDATE profiles SET revision=revision+1 WHERE id IN(SELECT m.member_profile_id FROM agency_members m JOIN profiles a ON a.id=m.agency_profile_id WHERE a.owner_id=NEW.id);
END;
CREATE TRIGGER agency_profile_permissions_revision AFTER UPDATE OF owner_id,type,trashed_at ON profiles BEGIN
 UPDATE profiles SET revision=revision+1 WHERE id IN(SELECT member_profile_id FROM agency_members WHERE agency_profile_id=NEW.id);
END;

CREATE TRIGGER agency_members_custody BEFORE INSERT ON agency_members
WHEN EXISTS(SELECT 1 FROM profiles p WHERE p.id=NEW.member_profile_id AND p.agency_custodian_id IS NOT NULL AND p.agency_custodian_id!=NEW.agency_profile_id)
BEGIN SELECT RAISE(ABORT,'agency_custody_conflict'); END;

CREATE TRIGGER agency_claim_revision AFTER UPDATE ON agency_profile_claims WHEN NEW.revision=OLD.revision BEGIN UPDATE agency_profile_claims SET revision=revision+1 WHERE id=NEW.id; END;

-- Custody cannot be stripped or moved between agencies by an unrelated update.
CREATE TRIGGER agency_custody_release BEFORE UPDATE OF agency_custodian_id ON profiles
WHEN OLD.agency_custodian_id IS NOT NULL AND NEW.agency_custodian_id IS NOT OLD.agency_custodian_id
AND (NEW.agency_custodian_id IS NOT NULL OR NOT EXISTS(
 SELECT 1 FROM agency_profile_claims c WHERE c.escort_profile_id=OLD.id AND c.agency_profile_id=OLD.agency_custodian_id
 AND c.source_owner_id=OLD.owner_id AND c.target_user_id=NEW.owner_id AND c.status='accepted'
 AND c.accepted_at IS NOT NULL AND c.verified_at IS NOT NULL AND c.expires_at>cast(strftime('%s','now') AS INTEGER)*1000))
BEGIN SELECT RAISE(ABORT,'agency_custody_release_requires_claim'); END;
CREATE TRIGGER agency_members_valid_insert BEFORE INSERT ON agency_members
WHEN NOT EXISTS(SELECT 1 FROM profiles a JOIN profiles p ON p.id=NEW.member_profile_id WHERE a.id=NEW.agency_profile_id AND a.type='agency' AND p.type='escort')
 OR (NEW.documents_authorized=1 AND NEW.can_manage=0)
 OR EXISTS(SELECT 1 FROM profile_details d WHERE d.profile_id=NEW.member_profile_id AND json_valid(d.metadata) AND coalesce(json_extract(d.metadata,'$.content_only'),'0')='1')
BEGIN SELECT RAISE(ABORT,'agency_membership_invalid'); END;
CREATE TRIGGER agency_members_valid_update BEFORE UPDATE ON agency_members
WHEN NOT EXISTS(SELECT 1 FROM profiles a JOIN profiles p ON p.id=NEW.member_profile_id WHERE a.id=NEW.agency_profile_id AND a.type='agency' AND p.type='escort' AND (p.agency_custodian_id IS NULL OR p.agency_custodian_id=a.id)) OR
 (NEW.documents_authorized=1 AND NEW.can_manage=0) OR
 (NEW.can_manage=1 AND EXISTS(SELECT 1 FROM profile_details d WHERE d.profile_id=NEW.member_profile_id AND json_valid(d.metadata) AND coalesce(json_extract(d.metadata,'$.content_only'),'0')='1'))
BEGIN SELECT RAISE(ABORT,'agency_membership_invalid'); END;
