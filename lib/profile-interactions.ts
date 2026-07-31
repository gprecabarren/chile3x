import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { favorites, profileLikes, profiles, reviews, users } from "@/db/schema";

export type ProfileEngagement = {
  favoritesCount: number;
  likesCount: number;
  viewerHasFavorite: boolean;
  viewerHasLike: boolean;
};

export type PublicReview = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

export async function getProfileEngagement(profileId: string, viewerId?: string): Promise<ProfileEngagement> {
  const db = await getDb();
  const [favoriteRows, likeRows, favoriteRecord, likeRecord] = await Promise.all([
    db.select({ total: count() }).from(favorites).where(eq(favorites.profileId, profileId)),
    db.select({ total: count() }).from(profileLikes).where(eq(profileLikes.profileId, profileId)),
    viewerId ? db.select({ id: favorites.id }).from(favorites).where(and(eq(favorites.profileId, profileId), eq(favorites.userId, viewerId))).limit(1) : Promise.resolve([]),
    viewerId ? db.select({ id: profileLikes.id }).from(profileLikes).where(and(eq(profileLikes.profileId, profileId), eq(profileLikes.userId, viewerId))).limit(1) : Promise.resolve([]),
  ]);

  return {
    favoritesCount: Number(favoriteRows[0]?.total ?? 0),
    likesCount: Number(likeRows[0]?.total ?? 0),
    viewerHasFavorite: favoriteRecord.length > 0,
    viewerHasLike: likeRecord.length > 0,
  };
}

export async function getApprovedReviews(profileId: string): Promise<PublicReview[]> {
  const rows = await (await getDb()).select({
    id: reviews.id,
    body: reviews.body,
    createdAt: reviews.createdAt,
    authorName: users.displayName,
  }).from(reviews)
    .innerJoin(users, eq(reviews.authorId, users.id))
    .where(and(eq(reviews.profileId, profileId), eq(reviews.status, "approved")))
    .orderBy(reviews.createdAt);

  return rows.map((review) => ({
    ...review,
    authorName: review.authorName?.trim() || "Usuario de Chile3X",
  }));
}

export async function isPublicProfile(profileId: string) {
  const [profile] = await (await getDb()).select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.status, "approved")))
    .limit(1);
  return Boolean(profile);
}
