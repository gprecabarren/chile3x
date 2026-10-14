type StoryCleanupEnv = { DB?: Pick<D1Database, "prepare">; MEDIA?: Pick<R2Bucket, "delete"> };

/** Hide-at-expiry is independent of physical deletion. The existing five-minute
 * cron removes bounded batches, including text and legacy rows, without uploads.
 * Never erase a media row until its R2 object deletion succeeds. */
export async function purgeExpiredStoryRecords(env: StoryCleanupEnv, now = new Date().toISOString(), maxBatches = 5) {
  if (!env.DB) return { removed: 0, mediaRemoved: 0, retryNeeded: true };
  let removed = 0; let mediaRemoved = 0; let retryNeeded = false;
  const expiredSql = "(expires_at <= ? OR (expires_at IS NULL AND datetime(created_at) <= datetime(?, '-24 hours')))";
  for (let batch = 0; batch < Math.min(5, Math.max(1, maxBatches)); batch++) {
    const result = await env.DB.prepare(`SELECT id, r2_key FROM profile_statuses WHERE ${expiredSql} ORDER BY created_at LIMIT 90`).bind(now, now).all<{ id: string; r2_key: string | null }>();
    const rows = result.results ?? [];
    if (!rows.length) break;
    const media = rows.filter(row => row.r2_key);
    let mediaDeleted = media.length === 0;
    if (media.length && env.MEDIA) {
      try { await env.MEDIA.delete(media.map(row => row.r2_key!)); mediaDeleted = true; mediaRemoved += media.length; }
      catch { retryNeeded = true; }
    } else if (media.length) retryNeeded = true;
    const ids = rows.filter(row => !row.r2_key || mediaDeleted).map(row => row.id);
    if (ids.length) {
      const deletion = await env.DB.prepare(`DELETE FROM profile_statuses WHERE id IN (${ids.map(() => "?").join(",")}) AND ${expiredSql}`).bind(...ids, now, now).run();
      removed += deletion.meta.changes ?? 0;
    }
    if (retryNeeded || rows.length < 90) break;
  }
  return { removed, mediaRemoved, retryNeeded };
}
