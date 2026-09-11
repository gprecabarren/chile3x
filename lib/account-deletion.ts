import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accountDeletionHistory,
  exclusiveContentCollections,
  exclusiveContentMedia,
  profileMedia,
  profileReportEvidence,
  profileReports,
  profiles,
  profileStatuses,
  profileVerificationFiles,
  telegramAccountLinks,
  telegramOutboxJobs,
  users,
} from "@/db/schema";
import { sha256 } from "@/lib/auth";
import { createTelegramOutboxValues, dispatchTelegramJob } from "@/lib/telegram";

export type AccountDeletionActor = { kind: "user" } | { kind: "admin"; adminId: string };

export async function permanentlyDeleteAccount(userId: string, actor: AccountDeletionActor) {
  const db = await getDb();
  const [account] = await db.select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!account || account.role === "admin") return null;

  const [publicObjects, storyObjects, verificationObjects, reportObjects, exclusiveObjects, telegramLinks] = await Promise.all([
    db.select({ key: profileMedia.r2Key }).from(profileMedia).innerJoin(profiles, eq(profileMedia.profileId, profiles.id)).where(eq(profiles.ownerId, userId)),
    db.select({ key: profileStatuses.r2Key }).from(profileStatuses).innerJoin(profiles, eq(profileStatuses.profileId, profiles.id)).where(eq(profiles.ownerId, userId)),
    db.select({ key: profileVerificationFiles.r2Key }).from(profileVerificationFiles).innerJoin(profiles, eq(profileVerificationFiles.profileId, profiles.id)).where(eq(profiles.ownerId, userId)),
    db.select({ key: profileReportEvidence.r2Key }).from(profileReportEvidence)
      .innerJoin(profileReports, eq(profileReportEvidence.reportId, profileReports.id))
      .innerJoin(profiles, eq(profileReports.profileId, profiles.id))
      .where(eq(profiles.ownerId, userId)),
    db.select({ key: exclusiveContentMedia.r2Key }).from(exclusiveContentMedia)
      .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
      .where(eq(exclusiveContentCollections.ownerId, userId)),
    db.select({ id: telegramAccountLinks.id, telegramUserId: telegramAccountLinks.telegramUserId }).from(telegramAccountLinks).where(eq(telegramAccountLinks.userId, userId)).limit(1),
  ]);
  const objectKeys = [...publicObjects, ...storyObjects, ...verificationObjects, ...reportObjects, ...exclusiveObjects]
    .map((item) => item.key).filter((key): key is string => Boolean(key));

  const historyId = `account_deletion_${crypto.randomUUID()}`;
  const historyStatement = db.insert(accountDeletionHistory).values({
      id: historyId,
      emailHash: await sha256(account.email.trim().toLowerCase()),
      formerUserId: account.id,
      deletedBy: actor.kind,
      deletedByAdminId: actor.kind === "admin" ? actor.adminId : null,
      originalCreatedAt: account.createdAt,
    });
  const telegramLink = telegramLinks[0];
  const telegramJob = telegramLink ? createTelegramOutboxValues({ kind: "revoke_member", entityId: telegramLink.id, payload: { formerUserId: userId, telegramUserId: telegramLink.telegramUserId, reason: "Cuenta eliminada permanentemente." } }) : null;
  if (telegramJob) {
    await db.batch([
      historyStatement,
      db.insert(telegramOutboxJobs).values(telegramJob),
      db.delete(profiles).where(eq(profiles.ownerId, userId)),
      db.delete(users).where(eq(users.id, userId)),
    ]);
    await dispatchTelegramJob(telegramJob.id);
  } else {
    await db.batch([
      historyStatement,
      db.delete(profiles).where(eq(profiles.ownerId, userId)),
      db.delete(users).where(eq(users.id, userId)),
    ]);
  }

  if (objectKeys.length) {
    try {
      const { env } = await import("cloudflare:workers");
      if (env.MEDIA) {
        for (let start = 0; start < objectKeys.length; start += 1000) {
          await env.MEDIA.delete(objectKeys.slice(start, start + 1000));
        }
      }
    } catch (error) {
      // The database rows are already gone, so an orphaned object cannot be
      // served. Keep the account deleted and emit an operational cleanup log.
      console.error("Account R2 cleanup failed", { historyId, objectCount: objectKeys.length, error });
    }
  }

  return { id: account.id, historyId, role: account.role };
}
