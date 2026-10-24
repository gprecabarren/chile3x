-- Parent removal and its durable R2 cleanup references commit together.
-- Ordinary edits, soft trash and account-owned libraries are unaffected.
CREATE TRIGGER profiles_storage_cleanup BEFORE DELETE ON profiles BEGIN
  INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key)
  SELECT lower(hex(randomblob(16))),r2_key FROM profile_media WHERE profile_id=OLD.id
  UNION ALL SELECT lower(hex(randomblob(16))),r2_key FROM profile_statuses WHERE profile_id=OLD.id AND r2_key IS NOT NULL
  UNION ALL SELECT lower(hex(randomblob(16))),r2_key FROM profile_verification_files WHERE profile_id=OLD.id
  UNION ALL SELECT lower(hex(randomblob(16))),e.r2_key FROM profile_report_evidence e JOIN profile_reports r ON r.id=e.report_id WHERE r.profile_id=OLD.id;
END;
