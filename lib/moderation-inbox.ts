import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminHasCapability, type AdminAccessLevel } from "@/lib/admin-permissions";

export type ModerationInboxData = {
  pendingProfiles: number; pendingMedia: number; pendingExclusive: number; unread: number;
  items: { id: string; name: string; city: string; status: string; files: number; newest: string; unread: number }[];
};
export async function getModerationInbox(admin: { accessLevel: AdminAccessLevel }) : Promise<ModerationInboxData> {
  const canProfiles = adminHasCapability(admin, "profiles.moderate");
  const canMedia = adminHasCapability(admin, "media.moderate");
  const db = await getDb();
  const [totals, items] = await Promise.all([
    db.get<{pendingProfiles:number;pendingMedia:number;pendingExclusive:number;unread:number}>(sql`SELECT
      (SELECT count(*) FROM profiles WHERE status='pending' AND trashed_at IS NULL AND ${canProfiles ? 1 : 0}=1) pendingProfiles,
      (SELECT count(*) FROM profile_media m JOIN profiles p ON p.id=m.profile_id WHERE m.moderation_status='pending' AND p.trashed_at IS NULL AND (m.visibility='public' OR m.is_profile_photo=1) AND ${canMedia ? 1 : 0}=1) pendingMedia,
      (SELECT count(*) FROM exclusive_content_media WHERE moderation_status='pending' AND ${canMedia ? 1 : 0}=1) pendingExclusive,
      (SELECT count(*) FROM admin_notifications WHERE read_at IS NULL AND ((kind IN ('profile_created','profile_updated') AND ${canProfiles ? 1 : 0}=1) OR (kind='media_uploaded' AND ${canMedia ? 1 : 0}=1))) unread`),
    db.all<ModerationInboxData["items"][number]>(sql`SELECT p.id,p.display_name name,p.city,p.status,
      (SELECT count(*) FROM profile_media m WHERE m.profile_id=p.id AND m.moderation_status='pending' AND (m.visibility='public' OR m.is_profile_photo=1) AND ${canMedia ? 1 : 0}=1) files,
      coalesce((SELECT max(created_at) FROM admin_notifications n WHERE n.profile_id=p.id),p.updated_at) newest,
      (SELECT count(*) FROM admin_notifications n WHERE n.profile_id=p.id AND n.read_at IS NULL AND ((n.kind IN ('profile_created','profile_updated') AND ${canProfiles ? 1 : 0}=1) OR (n.kind='media_uploaded' AND ${canMedia ? 1 : 0}=1))) unread
      FROM profiles p WHERE p.trashed_at IS NULL AND ((p.status='pending' AND ${canProfiles ? 1 : 0}=1) OR (EXISTS(SELECT 1 FROM profile_media m WHERE m.profile_id=p.id AND m.moderation_status='pending' AND (m.visibility='public' OR m.is_profile_photo=1)) AND ${canMedia ? 1 : 0}=1))
      ORDER BY CASE WHEN p.status='pending' THEN 0 ELSE 1 END,datetime(p.updated_at) DESC,p.id LIMIT 8`),
  ]);
  return { pendingProfiles: Number(totals?.pendingProfiles ?? 0), pendingMedia: Number(totals?.pendingMedia ?? 0), pendingExclusive: Number(totals?.pendingExclusive ?? 0), unread: Number(totals?.unread ?? 0), items };
}
