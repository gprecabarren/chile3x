import {SAMPLE_RETENTION_MS,PRIVATE_SAMPLES_ENABLED} from "../lib/private-sample-policy";
export async function purgeExpiredSamples(db:Pick<D1Database,"prepare"|"batch">,now=Date.now()) {
  if(!PRIVATE_SAMPLES_ENABLED)return 0;
  const threshold=now-SAMPLE_RETENTION_MS;
  const rows=await db.prepare("SELECT id FROM private_profile_samples WHERE expires_at<=? ORDER BY expires_at LIMIT 20").bind(threshold).all<{id:string}>();
  for(const {id} of rows.results)await db.batch([
    db.prepare("INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key) SELECT lower(hex(randomblob(16))),m.r2_key FROM private_sample_media m JOIN private_profile_samples s ON s.id=m.sample_id WHERE s.id=? AND s.expires_at<=?").bind(id,threshold),
    db.prepare("DELETE FROM private_profile_samples WHERE id=? AND expires_at<=?").bind(id,threshold),
  ]);
  return rows.results.length;
}
