import { getSiteSettings } from "@/lib/site-settings";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export async function enqueueModerationEmail(profileId: string, kind: string) {
  const settings = await getSiteSettings();
  if (settings.mail_alerts_enabled !== "enabled") return;
  const field = kind === "profile_created" ? "mail_alert_new_profile" : kind === "profile_updated" ? "mail_alert_updated_profile" : kind === "media_uploaded" ? "mail_alert_media" : null;
  if (!field || settings[field] !== "enabled") return;
  const db = await getDb();
  // One durable job per listing, event kind and five-minute batch. It carries
  // no photos, private documents, message bodies or recipient credentials.
  const bucket = Math.floor(Date.now() / 300_000);
  const id = `${profileId}:${kind}:${bucket}`;
  await db.run(sql`INSERT OR IGNORE INTO moderation_email_jobs(id, profile_id, kind)
    SELECT ${id}, id, ${kind} FROM profiles WHERE id=${profileId} AND trashed_at IS NULL
    AND (${kind}='media_uploaded' OR status='pending')`);
}
