import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  telegramAccountLinks,
  telegramAdminIdentities,
  telegramLinkAttempts,
  telegramOutboxJobs,
  users,
} from "@/db/schema";
import type { AccountUser, AdminUser } from "@/lib/auth";
import { createOpaqueToken, sha256 } from "@/lib/auth";
import {
  createTelegramOutboxValues,
  dispatchTelegramJob,
  getTelegramConfiguration,
  TELEGRAM_LINK_TTL_MINUTES,
  telegramDeepLink,
} from "@/lib/telegram";

type LinkSubject = "account" | "admin";

export async function beginTelegramLink(user: AccountUser | AdminUser, subjectType: LinkSubject) {
  if ((subjectType === "admin") !== (user.role === "admin")) return null;
  const configuration = await getTelegramConfiguration();
  const secret = createOpaqueToken();
  const deepLink = telegramDeepLink(configuration.botUsername, secret);
  if (!deepLink) return null;
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `telegram_link_attempt_${crypto.randomUUID()}`;
  await db.batch([
    db.update(telegramLinkAttempts).set({ status: "cancelled" }).where(and(
      eq(telegramLinkAttempts.userId, user.id),
      eq(telegramLinkAttempts.subjectType, subjectType),
      inArray(telegramLinkAttempts.status, ["pending", "candidate"]),
    )),
    db.insert(telegramLinkAttempts).values({
      id,
      userId: user.id,
      subjectType,
      tokenHash: await sha256(secret),
      expiresAt: new Date(Date.now() + TELEGRAM_LINK_TTL_MINUTES * 60 * 1_000).toISOString(),
      createdAt: now,
    }),
  ]);
  return { id, deepLink };
}

export async function latestTelegramLinkAttempt(userId: string, subjectType: LinkSubject) {
  const now = new Date().toISOString();
  const [attempt] = await (await getDb()).select({
    id: telegramLinkAttempts.id,
    status: telegramLinkAttempts.status,
    candidateTelegramUserId: telegramLinkAttempts.candidateTelegramUserId,
    candidateUsername: telegramLinkAttempts.candidateUsername,
    candidateFirstName: telegramLinkAttempts.candidateFirstName,
    expiresAt: telegramLinkAttempts.expiresAt,
    createdAt: telegramLinkAttempts.createdAt,
  }).from(telegramLinkAttempts).where(and(
    eq(telegramLinkAttempts.userId, userId),
    eq(telegramLinkAttempts.subjectType, subjectType),
    gt(telegramLinkAttempts.expiresAt, now),
  )).orderBy(desc(telegramLinkAttempts.createdAt)).limit(1);
  return attempt ?? null;
}

export async function confirmTelegramLink(user: AccountUser | AdminUser, subjectType: LinkSubject) {
  if ((subjectType === "admin") !== (user.role === "admin")) return null;
  const db = await getDb();
  const now = new Date().toISOString();
  const [attempt] = await db.select().from(telegramLinkAttempts).where(and(
    eq(telegramLinkAttempts.userId, user.id),
    eq(telegramLinkAttempts.subjectType, subjectType),
    eq(telegramLinkAttempts.status, "candidate"),
    gt(telegramLinkAttempts.expiresAt, now),
  )).orderBy(desc(telegramLinkAttempts.createdAt)).limit(1);
  if (!attempt?.candidateTelegramUserId) return null;
  const [accountCollision, adminCollision, account] = await Promise.all([
    db.select({ userId: telegramAccountLinks.userId }).from(telegramAccountLinks).where(eq(telegramAccountLinks.telegramUserId, attempt.candidateTelegramUserId)).limit(1),
    db.select({ userId: telegramAdminIdentities.userId }).from(telegramAdminIdentities).where(eq(telegramAdminIdentities.telegramUserId, attempt.candidateTelegramUserId)).limit(1),
    db.select({ isActive: users.isActive, emailVerifiedAt: users.emailVerifiedAt, role: users.role }).from(users).where(eq(users.id, user.id)).limit(1),
  ]);
  if (accountCollision[0]?.userId && accountCollision[0].userId !== user.id) return null;
  if (adminCollision[0]?.userId && adminCollision[0].userId !== user.id) return null;
  if (!account[0]?.isActive || (subjectType === "account" && (!account[0].emailVerifiedAt || account[0].role === "admin"))) return null;

  if (subjectType === "admin") {
    await db.batch([
      db.insert(telegramAdminIdentities).values({
        id: `telegram_admin_${crypto.randomUUID()}`,
        userId: user.id,
        telegramUserId: attempt.candidateTelegramUserId,
        username: attempt.candidateUsername,
        firstName: attempt.candidateFirstName,
        isActive: true,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: telegramAdminIdentities.userId,
        set: {
          telegramUserId: attempt.candidateTelegramUserId,
          username: attempt.candidateUsername,
          firstName: attempt.candidateFirstName,
          isActive: true,
          updatedAt: now,
        },
      }),
      db.update(telegramLinkAttempts).set({ status: "confirmed", confirmedAt: now }).where(eq(telegramLinkAttempts.id, attempt.id)),
    ]);
    return { attempt, jobId: null };
  }

  const job = createTelegramOutboxValues({
    kind: "send_member_invite",
    userId: user.id,
    entityId: user.id,
    payload: { userId: user.id, telegramUserId: attempt.candidateTelegramUserId },
  });
  await db.batch([
    db.insert(telegramAccountLinks).values({
      id: `telegram_link_${crypto.randomUUID()}`,
      userId: user.id,
      telegramUserId: attempt.candidateTelegramUserId,
      username: attempt.candidateUsername,
      firstName: attempt.candidateFirstName,
      status: "linked",
      linkedAt: now,
      revokedAt: null,
      revokeReason: null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: telegramAccountLinks.userId,
      set: {
        telegramUserId: attempt.candidateTelegramUserId,
        username: attempt.candidateUsername,
        firstName: attempt.candidateFirstName,
        status: "linked",
        linkedAt: now,
        revokedAt: null,
        revokeReason: null,
        updatedAt: now,
      },
    }),
    db.update(telegramLinkAttempts).set({ status: "confirmed", confirmedAt: now }).where(eq(telegramLinkAttempts.id, attempt.id)),
    db.insert(telegramOutboxJobs).values(job),
  ]);
  await dispatchTelegramJob(job.id);
  return { attempt, jobId: job.id };
}

export async function requestTelegramMemberInvite(userId: string) {
  const db = await getDb();
  const [link] = await db.select({ telegramUserId: telegramAccountLinks.telegramUserId }).from(telegramAccountLinks).innerJoin(users, eq(users.id, telegramAccountLinks.userId)).where(and(
    eq(telegramAccountLinks.userId, userId),
    eq(telegramAccountLinks.status, "linked"),
    eq(users.isActive, true),
  )).limit(1);
  if (!link) return null;
  const job = createTelegramOutboxValues({ kind: "send_member_invite", userId, entityId: userId, payload: { userId, telegramUserId: link.telegramUserId } });
  await db.insert(telegramOutboxJobs).values(job);
  await dispatchTelegramJob(job.id);
  return job.id;
}

export async function revokeTelegramAccountLink(userId: string, reason: string) {
  const db = await getDb();
  const [link] = await db.select({ id: telegramAccountLinks.id, telegramUserId: telegramAccountLinks.telegramUserId }).from(telegramAccountLinks).where(eq(telegramAccountLinks.userId, userId)).limit(1);
  if (!link) return null;
  const now = new Date().toISOString();
  const job = createTelegramOutboxValues({ kind: "revoke_member", userId, entityId: link.id, payload: { userId, telegramUserId: link.telegramUserId, reason } });
  await db.batch([
    db.update(telegramAccountLinks).set({ status: "revoked", revokedAt: now, revokeReason: reason.slice(0, 240), updatedAt: now }).where(eq(telegramAccountLinks.id, link.id)),
    db.insert(telegramOutboxJobs).values(job),
  ]);
  await dispatchTelegramJob(job.id);
  return job.id;
}
