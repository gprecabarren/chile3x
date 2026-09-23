import { and, count, desc, eq, gt, isNull, lt, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  messageConversationPreferences,
  messageConversations,
  messageMessages,
  profileMedia,
  profiles,
} from "@/db/schema";
import { publicProfileCondition } from "@/lib/public-profile-visibility";

export const MESSAGE_MAX_LENGTH = 1_200;
export const MESSAGE_PAGE_SIZE = 50;

export type MessageRecord = {
  id: string;
  senderUserId: string | null;
  senderRole: "visitor" | "owner";
  body: string;
  readAt: string | null;
  createdAt: string;
};

function cleanMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, MESSAGE_MAX_LENGTH);
}

export async function listMessageConversations(userId: string) {
  const db = await getDb();
  const currentRole = sql<"visitor" | "owner">`case when ${messageConversations.ownerUserId} = ${userId} then 'owner' else 'visitor' end`;
  const otherUserId = sql<string | null>`case when ${messageConversations.ownerUserId} = ${userId} then ${messageConversations.visitorUserId} else ${messageConversations.ownerUserId} end`;
  const otherUserActive = sql<boolean>`coalesce((select is_active from users where id = ${otherUserId}), 0)`;
  return db.select({
    id: messageConversations.id,
    profileId: messageConversations.profileId,
    profileName: sql<string>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then 'Anuncio no disponible' else coalesce(${profiles.displayName}, 'Anuncio no disponible') end`,
    profileSlug: sql<string | null>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then null else ${profiles.slug} end`,
    profileHandle: sql<string | null>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then null else ${profiles.handle} end`,
    profileStatus: profiles.status,
    visitorUserId: messageConversations.visitorUserId,
    ownerUserId: messageConversations.ownerUserId,
    currentRole,
    otherUserId,
    otherUserActive,
    otherUserLabel: sql<string>`case when ${otherUserActive} then coalesce((select display_name from users where id = ${otherUserId}), (select username from users where id = ${otherUserId}), 'Usuario de Chile3X') else 'Usuario de Chile3X' end`,
    profileImageId: sql<string | null>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then null else (select id from ${profileMedia} where profile_id = ${messageConversations.profileId} and media_type = 'image' and moderation_status = 'approved' and visibility = 'public' order by is_profile_photo desc, sort_order asc, created_at asc limit 1) end`,
    lastMessageBody: sql<string | null>`(select body from ${messageMessages} where conversation_id = ${messageConversations.id} order by created_at desc, id desc limit 1)`,
    lastMessageAt: messageConversations.lastMessageAt,
    unreadCount: sql<number>`(select count(*) from ${messageMessages} where conversation_id = ${messageConversations.id} and sender_role <> ${currentRole} and read_at is null)`,
    isMuted: sql<boolean>`coalesce(${messageConversationPreferences.isMuted}, 0)`,
    blockedByMe: sql<boolean>`case when ${messageConversationPreferences.blockedAt} is null then 0 else 1 end`,
    blockedByAnyone: sql<boolean>`exists(select 1 from ${messageConversationPreferences} where conversation_id = ${messageConversations.id} and blocked_at is not null)`,
  }).from(messageConversations)
    .leftJoin(profiles, eq(profiles.id, messageConversations.profileId))
    .leftJoin(messageConversationPreferences, and(
      eq(messageConversationPreferences.conversationId, messageConversations.id),
      eq(messageConversationPreferences.userId, userId),
    ))
    .where(or(eq(messageConversations.visitorUserId, userId), eq(messageConversations.ownerUserId, userId)))
    .orderBy(desc(messageConversations.lastMessageAt))
    .limit(100);
}

export async function countUnreadMessages(userId: string) {
  const [row] = await (await getDb()).select({ total: count() }).from(messageMessages)
    .innerJoin(messageConversations, eq(messageConversations.id, messageMessages.conversationId))
    .where(and(
      or(eq(messageConversations.visitorUserId, userId), eq(messageConversations.ownerUserId, userId)),
      sql`${messageMessages.senderRole} <> case when ${messageConversations.ownerUserId} = ${userId} then 'owner' else 'visitor' end`,
      isNull(messageMessages.readAt),
    ));
  return Number(row?.total ?? 0);
}

export async function getMessageConversation(conversationId: string, userId: string) {
  const currentRole = sql<"visitor" | "owner">`case when ${messageConversations.ownerUserId} = ${userId} then 'owner' else 'visitor' end`;
  const otherUserId = sql<string | null>`case when ${messageConversations.ownerUserId} = ${userId} then ${messageConversations.visitorUserId} else ${messageConversations.ownerUserId} end`;
  const otherUserActive = sql<boolean>`coalesce((select is_active from users where id = ${otherUserId}), 0)`;
  const [row] = await (await getDb()).select({
    id: messageConversations.id,
    profileId: messageConversations.profileId,
    profileName: sql<string>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then 'Anuncio no disponible' else coalesce(${profiles.displayName}, 'Anuncio no disponible') end`,
    profileSlug: sql<string | null>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then null else ${profiles.slug} end`,
    profileHandle: sql<string | null>`case when ${currentRole} = 'visitor' and not ${otherUserActive} then null else ${profiles.handle} end`,
    profileStatus: profiles.status,
    visitorUserId: messageConversations.visitorUserId,
    ownerUserId: messageConversations.ownerUserId,
    currentRole,
    otherUserId,
    otherUserActive,
    otherUserLabel: sql<string>`case when ${otherUserActive} then coalesce((select display_name from users where id = ${otherUserId}), (select username from users where id = ${otherUserId}), 'Usuario de Chile3X') else 'Usuario de Chile3X' end`,
    isMuted: sql<boolean>`coalesce(${messageConversationPreferences.isMuted}, 0)`,
    blockedByMe: sql<boolean>`case when ${messageConversationPreferences.blockedAt} is null then 0 else 1 end`,
    blockedByAnyone: sql<boolean>`exists(select 1 from ${messageConversationPreferences} where conversation_id = ${messageConversations.id} and blocked_at is not null)`,
  }).from(messageConversations)
    .leftJoin(profiles, eq(profiles.id, messageConversations.profileId))
    .leftJoin(messageConversationPreferences, and(
      eq(messageConversationPreferences.conversationId, messageConversations.id),
      eq(messageConversationPreferences.userId, userId),
    ))
    .where(and(
      eq(messageConversations.id, conversationId),
      or(eq(messageConversations.visitorUserId, userId), eq(messageConversations.ownerUserId, userId)),
    )).limit(1);
  return row ?? null;
}

export async function getMessagePage(conversationId: string, userId: string, before?: string | null) {
  const conversation = await getMessageConversation(conversationId, userId);
  if (!conversation) return null;
  const db = await getDb();
  const conditions = [eq(messageMessages.conversationId, conversationId)];
  if (before && !Number.isNaN(Date.parse(before))) conditions.push(lt(messageMessages.createdAt, before));
  const rows = await db.select({
    id: messageMessages.id,
    senderUserId: messageMessages.senderUserId,
    senderRole: messageMessages.senderRole,
    body: messageMessages.body,
    readAt: messageMessages.readAt,
    createdAt: messageMessages.createdAt,
  }).from(messageMessages).where(and(...conditions))
    .orderBy(desc(messageMessages.createdAt), desc(messageMessages.id))
    .limit(MESSAGE_PAGE_SIZE + 1);
  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  return { conversation, messages: rows.slice(0, MESSAGE_PAGE_SIZE).reverse(), hasMore };
}

export async function startMessageConversation(profileId: string, visitorUserId: string) {
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerUserId: profiles.ownerId, isDemo: profiles.isDemo })
    .from(profiles).where(and(eq(profiles.id, profileId), publicProfileCondition)).limit(1);
  if (!profile || profile.isDemo || profile.ownerUserId === visitorUserId) return null;
  const now = new Date().toISOString();
  const id = `message_conversation_${crypto.randomUUID()}`;
  await db.insert(messageConversations).values({
    id,
    profileId,
    visitorUserId,
    ownerUserId: profile.ownerUserId,
    lastMessageAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
  const [conversation] = await db.select({ id: messageConversations.id }).from(messageConversations)
    .where(and(eq(messageConversations.profileId, profileId), eq(messageConversations.visitorUserId, visitorUserId))).limit(1);
  if (!conversation) return null;
  await Promise.all([visitorUserId, profile.ownerUserId].map((userId) => db.insert(messageConversationPreferences).values({
    id: `message_preference_${crypto.randomUUID()}`,
    conversationId: conversation.id,
    userId,
    updatedAt: now,
  }).onConflictDoNothing()));
  return conversation.id;
}

export async function sendInternalMessage(conversationId: string, senderUserId: string, rawBody: unknown) {
  const body = cleanMessage(rawBody);
  if (!body) return { ok: false as const, error: "empty" as const };
  const conversation = await getMessageConversation(conversationId, senderUserId);
  if (!conversation) return { ok: false as const, error: "not_found" as const };
  if (conversation.blockedByAnyone) return { ok: false as const, error: "blocked" as const };
  if (!conversation.otherUserActive || !conversation.profileId) return { ok: false as const, error: "unavailable" as const };
  const db = await getDb();
  const [publicProfile] = await db.select({ id: profiles.id }).from(profiles)
    .where(and(eq(profiles.id, conversation.profileId), publicProfileCondition)).limit(1);
  if (!publicProfile) return { ok: false as const, error: "unavailable" as const };
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const [minuteCount, dayCount] = await Promise.all([
    db.select({ total: count() }).from(messageMessages).where(and(eq(messageMessages.senderUserId, senderUserId), gt(messageMessages.createdAt, minuteAgo))),
    db.select({ total: count() }).from(messageMessages).where(and(eq(messageMessages.senderUserId, senderUserId), gt(messageMessages.createdAt, dayAgo))),
  ]);
  if (Number(minuteCount[0]?.total ?? 0) >= 10 || Number(dayCount[0]?.total ?? 0) >= 200) {
    return { ok: false as const, error: "rate_limited" as const };
  }
  const now = new Date().toISOString();
  const senderRole = conversation.currentRole;
  const message: MessageRecord = { id: `message_${crypto.randomUUID()}`, senderUserId, senderRole, body, readAt: null, createdAt: now };
  await db.insert(messageMessages).values({ ...message, conversationId });
  await db.update(messageConversations).set({ lastMessageAt: now, updatedAt: now }).where(eq(messageConversations.id, conversationId));
  return { ok: true as const, message };
}

export async function updateConversationPreference(conversationId: string, userId: string, action: "mute" | "unmute" | "block" | "unblock" | "read") {
  const conversation = await getMessageConversation(conversationId, userId);
  if (!conversation) return false;
  const db = await getDb();
  const now = new Date().toISOString();
  await db.insert(messageConversationPreferences).values({
    id: `message_preference_${crypto.randomUUID()}`,
    conversationId,
    userId,
    isMuted: action === "mute",
    blockedAt: action === "block" ? now : null,
    lastReadAt: action === "read" ? now : null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [messageConversationPreferences.conversationId, messageConversationPreferences.userId],
    set: action === "mute" ? { isMuted: true, updatedAt: now }
      : action === "unmute" ? { isMuted: false, updatedAt: now }
        : action === "block" ? { blockedAt: now, updatedAt: now }
          : action === "unblock" ? { blockedAt: null, updatedAt: now }
            : { lastReadAt: now, updatedAt: now },
  });
  if (action === "read") {
    await db.update(messageMessages).set({ readAt: now }).where(and(
      eq(messageMessages.conversationId, conversationId),
      ne(messageMessages.senderRole, conversation.currentRole),
      isNull(messageMessages.readAt),
    ));
  }
  return true;
}
