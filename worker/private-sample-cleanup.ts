import { SAMPLE_RETENTION_MS, PRIVATE_SAMPLES_ENABLED } from "../lib/private-sample-policy";

export async function purgeExpiredSamples(db: Pick<D1Database, "prepare" | "batch">, now = Date.now()) {
  if (!PRIVATE_SAMPLES_ENABLED) return 0;
  // Expiration is already enforced on every read/write. Persist the effective
  // trash date for the shared administrative list, using the actual deadline
  // rather than the cron's later execution time. Renewal/restoration wins if
  // it commits before this predicate is evaluated.
  await db.prepare("UPDATE private_profile_samples SET trashed_at=expires_at,trash_reason='expired',updated_at=CURRENT_TIMESTAMP WHERE migrated_at IS NULL AND trashed_at IS NULL AND expires_at<=?").bind(now).run();
  const threshold = now - SAMPLE_RETENTION_MS;
  const rows = await db.prepare("SELECT id FROM private_profile_samples WHERE (trashed_at IS NOT NULL AND trashed_at<=?) OR (migrated_at IS NOT NULL AND unixepoch(migrated_at)*1000<=?) ORDER BY coalesce(trashed_at,unixepoch(migrated_at)*1000) LIMIT 20").bind(threshold, threshold).all<{ id: string }>();
  let deleted = 0;
  for (const { id } of rows.results) {
    const result = await db.batch([
    // Converted objects belong to profile_media, never to this retention job.
    // A concurrent restore clears trashed_at and prevents both statements.
    db.prepare("INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key) SELECT lower(hex(randomblob(16))),m.r2_key FROM private_sample_media m JOIN private_profile_samples s ON s.id=m.sample_id WHERE s.id=? AND s.migrated_at IS NULL AND s.trashed_at IS NOT NULL AND s.trashed_at<=? AND NOT EXISTS(SELECT 1 FROM profile_media p WHERE p.r2_key=m.r2_key)").bind(id, threshold),
    db.prepare("DELETE FROM private_profile_samples WHERE id=? AND ((trashed_at IS NOT NULL AND trashed_at<=?) OR (migrated_at IS NOT NULL AND unixepoch(migrated_at)*1000<=?))").bind(id, threshold, threshold),
    ]);
    deleted += result[1]?.meta.changes ?? 0;
  }
  return deleted;
}
