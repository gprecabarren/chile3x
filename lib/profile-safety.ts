import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { blockedProfiles, profileExclusiveAccess, profiles } from "@/db/schema";

// Home and directory helpers can both need the blocked list during one render.
// Keep it request-scoped to avoid duplicate D1 reads without making block
// changes stale for subsequent requests.
export const getBlockedProfileIds = cache(async function getBlockedProfileIds(userId?: string) {
  if (!userId) return new Set<string>();
  const rows = await (await getDb()).select({ profileId: blockedProfiles.profileId })
    .from(blockedProfiles)
    .where(eq(blockedProfiles.userId, userId));
  return new Set(rows.map((row) => row.profileId));
});

export async function canAccessExclusiveMedia(profileId: string, userId?: string, isAdmin = false) {
  if (isAdmin) return true;
  if (!userId) return false;
  const db = await getDb();
  const [profile] = await db.select({ ownerId: profiles.ownerId }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return false;
  if (profile.ownerId === userId) return true;
  const [grant] = await db.select({ id: profileExclusiveAccess.id }).from(profileExclusiveAccess)
    .where(and(eq(profileExclusiveAccess.profileId, profileId), eq(profileExclusiveAccess.userId, userId)))
    .limit(1);
  return Boolean(grant);
}
