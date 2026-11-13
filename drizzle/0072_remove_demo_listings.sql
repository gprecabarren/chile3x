-- Retire the listings marked as demos and leave real accounts and listings intact.
CREATE TABLE _retired_demo_profiles (id TEXT PRIMARY KEY);
INSERT INTO _retired_demo_profiles SELECT id FROM profiles WHERE is_demo = 1;

-- Custody has a restrictive foreign key. Abort if a real profile relies on a demo.
INSERT INTO collaboration_guards(id, allowed)
VALUES ('retire-demo-listings', CASE WHEN EXISTS (
  SELECT 1 FROM profiles p JOIN _retired_demo_profiles a ON a.id = p.agency_custodian_id
  WHERE p.is_demo = 0
) THEN 0 ELSE 1 END);

CREATE TABLE _retired_demo_media (r2_key TEXT PRIMARY KEY);
INSERT INTO _retired_demo_media
SELECT r2_key FROM profile_media WHERE profile_id IN (SELECT id FROM _retired_demo_profiles)
UNION
SELECT r2_key FROM profile_statuses WHERE r2_key IS NOT NULL AND profile_id IN (SELECT id FROM _retired_demo_profiles)
UNION
SELECT r2_key FROM profile_verification_files WHERE profile_id IN (SELECT id FROM _retired_demo_profiles)
UNION
SELECT e.r2_key FROM profile_report_evidence e JOIN profile_reports r ON r.id = e.report_id
WHERE r.profile_id IN (SELECT id FROM _retired_demo_profiles);

DELETE FROM admin_notifications WHERE profile_id IN (SELECT id FROM _retired_demo_profiles);
DELETE FROM agency_activity_logs WHERE agency_profile_id IN (SELECT id FROM _retired_demo_profiles)
  OR escort_profile_id IN (SELECT id FROM _retired_demo_profiles);
DELETE FROM message_conversations WHERE profile_id IN (SELECT id FROM _retired_demo_profiles)
  AND NOT EXISTS (SELECT 1 FROM data_retention_holds h WHERE h.entity_type = 'conversation' AND h.entity_id = message_conversations.id);
DELETE FROM admin_audit_logs WHERE entity_id IN (SELECT id FROM _retired_demo_profiles)
  AND NOT EXISTS (SELECT 1 FROM data_retention_holds h WHERE h.entity_type = 'audit' AND h.entity_id = admin_audit_logs.id);
DELETE FROM review_reservations WHERE resource_key IN (SELECT 'profile:' || id FROM _retired_demo_profiles);
DELETE FROM admin_mutation_receipts WHERE resource_key IN (SELECT 'profile:' || id FROM _retired_demo_profiles);

-- Delete children before their custodial agency and let the foreign keys remove listing data.
DELETE FROM profiles WHERE id IN (SELECT id FROM _retired_demo_profiles) AND agency_custodian_id IS NOT NULL;
DELETE FROM profiles WHERE id IN (SELECT id FROM _retired_demo_profiles);

-- The delete triggers enqueue the original objects. Cancel any job whose
-- object is still referenced by surviving content, before the transaction commits.
DELETE FROM data_deletion_jobs WHERE r2_key IN (SELECT r2_key FROM _retired_demo_media)
  AND (
    r2_key IN (SELECT r2_key FROM profile_media)
    OR r2_key IN (SELECT r2_key FROM profile_statuses)
    OR r2_key IN (SELECT r2_key FROM profile_verification_files)
    OR r2_key IN (SELECT r2_key FROM profile_report_evidence)
    OR r2_key IN (SELECT r2_key FROM private_sample_media)
    OR r2_key IN (SELECT r2_key FROM exclusive_content_media)
    OR r2_key IN (SELECT r2_key FROM forum_attachments)
    OR r2_key IN (SELECT r2_key FROM news_media)
    OR r2_key IN (SELECT background_r2_key FROM sponsors)
    OR r2_key IN (SELECT logo_r2_key FROM sponsors)
  );

UPDATE settings_revision SET revision = revision + 1 WHERE id = 'site';
DELETE FROM collaboration_guards WHERE id = 'retire-demo-listings';
DROP TABLE _retired_demo_media;
DROP TABLE _retired_demo_profiles;
