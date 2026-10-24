-- The owner chose final-file-only storage before this feature was deployed.
-- Never silently erase a populated backup table: stop if an older build used it.
CREATE TABLE photo_backup_removal_guard(ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO photo_backup_removal_guard SELECT CASE WHEN count(*)=0 THEN 1 ELSE 0 END FROM profile_media_edits;
DROP TRIGGER profile_media_private_base_cleanup;
DROP TABLE profile_media_edits;
DROP TABLE photo_backup_removal_guard;
