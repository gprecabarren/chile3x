import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { profileDetails, profileStatuses, profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

// Two owner-scoped queries, independent of the number of advertisements. No
// public-header lookup, R2 access, per-profile query or background polling.
export const getAccountStoryOverview = cache(async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.select({ id: profiles.id, slug: profiles.slug, handle: profiles.handle, displayName: profiles.displayName, type: profiles.type, status: profiles.status, city: profiles.city, region: profiles.region, updatedAt: profiles.updatedAt, ownerHiddenAt: profiles.ownerHiddenAt,
      contentOnly: sql<number>`case when json_valid(${profileDetails.metadata}) then coalesce(json_extract(${profileDetails.metadata}, '$.content_only'), '0') = '1' else 0 end`.mapWith(Boolean),
    }).from(profiles).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
      .where(and(eq(profiles.ownerId, user.id), isNull(profiles.trashedAt))).orderBy(desc(profiles.updatedAt), desc(profiles.id)),
    db.select({ profileId: profileStatuses.profileId, storyType: profileStatuses.storyType, total: count(), latest: sql<string>`max(${profileStatuses.createdAt})` })
      .from(profileStatuses).innerJoin(profiles, eq(profiles.id, profileStatuses.profileId))
      .where(and(eq(profiles.ownerId, user.id), isNull(profiles.trashedAt), gt(profileStatuses.expiresAt, new Date().toISOString())))
      .groupBy(profileStatuses.profileId, profileStatuses.storyType),
  ]);
  const summaries = new Map<string, { text: number; image: number; video: number; total: number; latest: string | null }>();
  for (const row of counts) {
    if (!["text", "image", "video"].includes(row.storyType)) continue;
    const summary = summaries.get(row.profileId) ?? { text: 0, image: 0, video: 0, total: 0, latest: null };
    summary[row.storyType] = Number(row.total);
    summary.total += Number(row.total);
    if (!summary.latest || row.latest > summary.latest) summary.latest = row.latest;
    summaries.set(row.profileId, summary);
  }
  return rows.map(profile => ({ ...profile, stories: summaries.get(profile.id) ?? { text: 0, image: 0, video: 0, total: 0, latest: null } }));
});

export type AccountStoryProfile = Awaited<ReturnType<typeof getAccountStoryOverview>>[number];
