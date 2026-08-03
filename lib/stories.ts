import { and, asc, desc, eq, gt, inArray, isNotNull, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { profileMedia, profileStatuses, profiles } from "@/db/schema";
import { type StoryType } from "@/lib/story-data";

export { MAX_STORY_IMAGE_BYTES, MAX_STORY_TEXT_LENGTH, storyExpiresAt, storyTimeLabel, type StoryType } from "@/lib/story-data";

export type PublicStory = {
  id: string;
  body: string;
  storyType: StoryType;
  imageUrl: string | null;
  createdAt: string;
  expiresAt: string;
  profileId: string;
  profileSlug: string;
  profileName: string;
  profileImageUrl: string | null;
  city: string;
  profileType: "escort" | "agency" | "rental";
};

type StoryScope = {
  city?: string;
  profileId?: string;
  profileIds?: string[];
  type?: "escort" | "agency" | "rental";
};

// A request that reads or publishes stories also cleans up expired image
// records and their private R2 objects. Text stories remain as a small audit
// trail, but are never returned to public visitors after their 24 hours.
export async function purgeExpiredImageStories() {
  const db = await getDb();
  const expired = await db.select({ id: profileStatuses.id, r2Key: profileStatuses.r2Key }).from(profileStatuses).where(and(
    eq(profileStatuses.storyType, "image"),
    isNotNull(profileStatuses.r2Key),
    lt(profileStatuses.expiresAt, new Date().toISOString()),
  )).limit(100);
  if (!expired.length) return;
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return;
  const mediaBucket = env.MEDIA;
  await Promise.all(expired.map((story) => mediaBucket.delete(story.r2Key!)));
  await Promise.all(expired.map((story) => db.delete(profileStatuses).where(eq(profileStatuses.id, story.id))));
}

export async function getActiveStories(scope: StoryScope = {}) {
  try {
    if (scope.profileIds && scope.profileIds.length === 0) return [] as PublicStory[];
    await purgeExpiredImageStories();
    const db = await getDb();
    const now = new Date().toISOString();
    const conditions = [eq(profiles.status, "approved"), gt(profileStatuses.expiresAt, now)];
    if (scope.city) conditions.push(eq(profiles.city, scope.city));
    if (scope.profileId) conditions.push(eq(profiles.id, scope.profileId));
    if (scope.profileIds?.length) conditions.push(inArray(profiles.id, scope.profileIds));
    if (scope.type) conditions.push(eq(profiles.type, scope.type));

    const rows = await db.select({
      id: profileStatuses.id,
      body: profileStatuses.body,
      storyType: profileStatuses.storyType,
      r2Key: profileStatuses.r2Key,
      createdAt: profileStatuses.createdAt,
      expiresAt: profileStatuses.expiresAt,
      profileId: profiles.id,
      profileSlug: profiles.slug,
      profileName: profiles.displayName,
      city: profiles.city,
      profileType: profiles.type,
    }).from(profileStatuses)
      .innerJoin(profiles, eq(profileStatuses.profileId, profiles.id))
      .where(and(...conditions))
      // Stories play in chronological order inside a profile. Their profile
      // bubbles are ordered separately by the most recent story in the UI.
      .orderBy(asc(profileStatuses.createdAt))
      .limit(80);

    const profileIds = [...new Set(rows.map((row) => row.profileId))];
    const mediaRows = profileIds.length ? await db.select({
      id: profileMedia.id,
      profileId: profileMedia.profileId,
      isProfilePhoto: profileMedia.isProfilePhoto,
      sortOrder: profileMedia.sortOrder,
    }).from(profileMedia).where(and(
      inArray(profileMedia.profileId, profileIds),
      eq(profileMedia.mediaType, "image"),
      eq(profileMedia.moderationStatus, "approved"),
    )).orderBy(desc(profileMedia.isProfilePhoto), asc(profileMedia.sortOrder)) : [];
    const profileImages = new Map<string, string>();
    for (const media of mediaRows) {
      if (!profileImages.has(media.profileId)) profileImages.set(media.profileId, `/media/${media.id}`);
    }

    return rows.flatMap((row) => {
      if (row.storyType !== "text" && row.storyType !== "image") return [];
      if (row.storyType === "image" && !row.r2Key) return [];
      if (row.profileType !== "escort" && row.profileType !== "agency" && row.profileType !== "rental") return [];
      return [{
        id: row.id,
        body: row.body,
        storyType: row.storyType,
        imageUrl: row.storyType === "image" ? `/historias/${row.id}/media` : null,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt ?? now,
        profileId: row.profileId,
        profileSlug: row.profileSlug,
        profileName: row.profileName,
        profileImageUrl: profileImages.get(row.profileId) ?? null,
        city: row.city,
        profileType: row.profileType,
      } satisfies PublicStory];
    });
  } catch {
    return [] as PublicStory[];
  }
}

export async function getOwnerStories(profileId: string) {
  await purgeExpiredImageStories();
  const now = new Date().toISOString();
  return (await (await getDb()).select({
    id: profileStatuses.id,
    body: profileStatuses.body,
    storyType: profileStatuses.storyType,
    createdAt: profileStatuses.createdAt,
    expiresAt: profileStatuses.expiresAt,
  }).from(profileStatuses).where(and(eq(profileStatuses.profileId, profileId), gt(profileStatuses.expiresAt, now))).orderBy(desc(profileStatuses.createdAt))) as Array<{
    id: string;
    body: string;
    storyType: StoryType;
    createdAt: string;
    expiresAt: string | null;
  }>;
}
