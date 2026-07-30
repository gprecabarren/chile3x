import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";

export type PublicStory = {
  id: string;
  body: string;
  createdAt: string;
  expiresAt: string;
  profileId: string;
  profileSlug: string;
  profileName: string;
  city: string;
};

type StoryScope = {
  city?: string;
  profileId?: string;
};

/**
 * Stories use the existing short-lived profile-status store until image/video
 * upload is activated with R2. Only approved escort profiles can surface here.
 */
export async function getActiveStories(scope: StoryScope = {}) {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const conditions = [
      eq(profiles.status, "approved"),
      eq(profiles.type, "escort"),
      gt(profileStatuses.expiresAt, now),
    ];
    if (scope.city) conditions.push(eq(profiles.city, scope.city));
    if (scope.profileId) conditions.push(eq(profiles.id, scope.profileId));

    return await db.select({
      id: profileStatuses.id,
      body: profileStatuses.body,
      createdAt: profileStatuses.createdAt,
      expiresAt: profileStatuses.expiresAt,
      profileId: profiles.id,
      profileSlug: profiles.slug,
      profileName: profiles.displayName,
      city: profiles.city,
    }).from(profileStatuses)
      .innerJoin(profiles, eq(profileStatuses.profileId, profiles.id))
      .where(and(...conditions))
      .orderBy(desc(profileStatuses.createdAt))
      .limit(30) as PublicStory[];
  } catch {
    // The public homepage is also rendered without a D1 binding in static tests.
    // An unavailable story feed must never make the directory unavailable.
    return [] as PublicStory[];
  }
}

export function storyExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export function storyTimeLabel(expiresAt: string, now = new Date()) {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60_000));
  if (minutes >= 60) return `Disponible ${Math.ceil(minutes / 60)} h más`;
  return `Disponible ${minutes} min más`;
}
