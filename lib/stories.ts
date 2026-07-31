import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";

export type StoryType = "text" | "image";

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
  city: string;
  profileType: "escort" | "agency" | "rental";
};

type StoryScope = {
  city?: string;
  profileId?: string;
  type?: "escort" | "agency" | "rental";
};

export async function getActiveStories(scope: StoryScope = {}) {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const conditions = [eq(profiles.status, "approved"), gt(profileStatuses.expiresAt, now)];
    if (scope.city) conditions.push(eq(profiles.city, scope.city));
    if (scope.profileId) conditions.push(eq(profiles.id, scope.profileId));
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
      .orderBy(desc(profileStatuses.createdAt))
      .limit(80);

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
        city: row.city,
        profileType: row.profileType,
      } satisfies PublicStory];
    });
  } catch {
    return [] as PublicStory[];
  }
}

export async function getOwnerStories(profileId: string) {
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

export function storyExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export function storyTimeLabel(expiresAt: string, now = new Date()) {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60_000));
  if (minutes >= 60) return `Disponible ${Math.ceil(minutes / 60)} h más`;
  return `Disponible ${minutes} min más`;
}
