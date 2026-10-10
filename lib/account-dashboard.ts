import { and, count, eq, gte, inArray, isNull, notExists } from "drizzle-orm";
import { getDb } from "@/db";
import { blockedProfiles, favorites, profileContactEvents, profileLikes, profileMedia, profiles, profileViews, reviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { profileStatisticsCutoff } from "@/lib/profile-statistics-period";
import { publicProfileCondition } from "@/lib/public-profile-visibility";

/** Indexed aggregates only. Never load visitor identities or admin-only raw taps. */
export async function getAccountDashboard(hasProfiles: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const db = await getDb();
  const owned = and(eq(profiles.ownerId, user.id), isNull(profiles.trashedAt));
  const cutoff = profileStatisticsCutoff(29);
  const [saved, sent, views, contacts, likes, receivedFavorites, pendingMedia] = await Promise.all([
    db.select({ total: count() }).from(favorites).innerJoin(profiles, eq(profiles.id, favorites.profileId)).where(and(eq(favorites.userId, user.id), publicProfileCondition,
      notExists(db.select({ id: blockedProfiles.id }).from(blockedProfiles).where(and(eq(blockedProfiles.userId, user.id), eq(blockedProfiles.profileId, profiles.id)))))),
    db.select({ total: count() }).from(reviews).where(and(eq(reviews.authorId, user.id), inArray(reviews.status, ["pending", "approved"]))),
    hasProfiles ? db.select({ total: count() }).from(profileViews).innerJoin(profiles, eq(profiles.id, profileViews.profileId)).where(and(owned, gte(profileViews.viewedOn, cutoff))) : [],
    // Same daily deduplication as the existing advertiser statistics, not click_count.
    hasProfiles ? db.select({ total: count() }).from(profileContactEvents).innerJoin(profiles, eq(profiles.id, profileContactEvents.profileId)).where(and(owned, gte(profileContactEvents.clickedOn, cutoff))) : [],
    hasProfiles ? db.select({ total: count() }).from(profileLikes).innerJoin(profiles, eq(profiles.id, profileLikes.profileId)).where(owned) : [],
    hasProfiles ? db.select({ total: count() }).from(favorites).innerJoin(profiles, eq(profiles.id, favorites.profileId)).where(owned) : [],
    hasProfiles ? db.select({ profileId: profileMedia.profileId, total: count() }).from(profileMedia).innerJoin(profiles, eq(profiles.id, profileMedia.profileId)).where(and(owned, eq(profileMedia.moderationStatus, "pending"), eq(profileMedia.visibility, "public"))).groupBy(profileMedia.profileId) : [],
  ]);
  return {
    savedFavorites: Number(saved[0]?.total ?? 0), sentReviews: Number(sent[0]?.total ?? 0),
    views: Number(views[0]?.total ?? 0), contacts: Number(contacts[0]?.total ?? 0),
    likes: Number(likes[0]?.total ?? 0), receivedFavorites: Number(receivedFavorites[0]?.total ?? 0),
    pendingMedia: pendingMedia.map(row => ({ profileId: row.profileId, total: Number(row.total) })),
  };
}
