import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs, profileMedia, profileStatuses, profileVerificationFiles, profileReportEvidence, profileReports, profiles, users } from "@/db/schema";
import type { AccountUser, AdminUser } from "@/lib/auth";
import { recordOperationalEvent } from "@/lib/operations";
import { hasUnlimitedEscortListings } from "@/lib/profile-limits";

export type ProfileTrashResult = "ok" | "not_found" | "already_trashed" | "not_trashed" | "escort_conflict" | "storage_cleanup_failed";

export async function trashProfile(profileId: string, actor: AccountUser | AdminUser, kind: "self" | "admin"): Promise<ProfileTrashResult> {
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerId: profiles.ownerId, displayName: profiles.displayName, type: profiles.type, status: profiles.status, trashedAt: profiles.trashedAt })
    .from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile || (kind === "self" && profile.ownerId !== actor.id)) return "not_found";
  if (profile.trashedAt) return "already_trashed";

  const now = new Date().toISOString();
  const adminLogin = kind === "admin" ? (actor as AdminUser).githubLogin : null;
  await db.batch([
    db.update(profiles).set({ trashedAt: now, trashedByKind: kind, trashedByActorId: actor.id, trashedByAdminLogin: adminLogin, updatedAt: now })
      .where(and(eq(profiles.id, profileId), isNull(profiles.trashedAt))),
    db.insert(adminAuditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      actorGithubLogin: adminLogin,
      actorEmail: kind === "admin" ? actor.email : "usuario@chile3x.local",
      actorName: kind === "admin" ? actor.displayName : "Persona anunciante",
      category: "profiles", action: kind === "admin" ? "profile.trash" : "profile.trash_self",
      outcome: "success", entityType: "profile", entityId: profileId, entityLabel: profile.displayName,
      summary: kind === "admin" ? `Envió el anuncio ${profile.displayName} a la papelera.` : `La cuenta propietaria envió ${profile.displayName} a la papelera.`,
      beforeData: JSON.stringify({ trashedAt: null, status: profile.status }),
      afterData: JSON.stringify({ trashedAt: now, status: profile.status, origin: kind }),
    }),
  ]);
  return "ok";
}

export async function restoreProfile(profileId: string, admin: AdminUser): Promise<ProfileTrashResult> {
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerId: profiles.ownerId, displayName: profiles.displayName, type: profiles.type, status: profiles.status, trashedAt: profiles.trashedAt, trashedByKind: profiles.trashedByKind, trashedByAdminLogin: profiles.trashedByAdminLogin })
    .from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return "not_found";
  if (!profile.trashedAt) return "not_trashed";
  if (profile.type === "escort") {
    const [owner] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, profile.ownerId)).limit(1);
    if (!owner || !hasUnlimitedEscortListings(owner)) {
      const [other] = await db.select({ id: profiles.id }).from(profiles).where(and(
        eq(profiles.ownerId, profile.ownerId), eq(profiles.type, "escort"), isNull(profiles.trashedAt),
      )).limit(1);
      if (other) return "escort_conflict";
    }
  }
  const now = new Date().toISOString();
  try {
    await db.batch([
      db.update(profiles).set({ trashedAt: null, trashedByKind: null, trashedByActorId: null, trashedByAdminLogin: null, updatedAt: now })
        .where(and(eq(profiles.id, profileId), isNotNull(profiles.trashedAt))),
      db.insert(adminAuditLogs).values({
        id: `audit_${crypto.randomUUID()}`, actorUserId: admin.id, actorGithubLogin: admin.githubLogin,
        actorEmail: admin.email, actorName: admin.displayName,
        category: "profiles", action: "profile.restore", outcome: "success", entityType: "profile", entityId: profileId,
        entityLabel: profile.displayName, summary: `Restauró el anuncio ${profile.displayName} desde la papelera.`,
        beforeData: JSON.stringify({ trashedAt: profile.trashedAt, origin: profile.trashedByKind, adminLogin: profile.trashedByAdminLogin }),
        afterData: JSON.stringify({ trashedAt: null, status: profile.status }),
      }),
    ]);
  } catch (error) {
    if (String(error).includes("escort_profile_owner_conflict")) return "escort_conflict";
    throw error;
  }
  return "ok";
}

export async function permanentlyDeleteTrashedProfile(profileId: string, admin: AdminUser): Promise<ProfileTrashResult> {
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, displayName: profiles.displayName, type: profiles.type, status: profiles.status, ownerId: profiles.ownerId, trashedAt: profiles.trashedAt })
    .from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return "not_found";
  if (!profile.trashedAt) return "not_trashed";
  // The account-owned premium library is deliberately retained. Its optional
  // listing link is detached by the FK when this specific listing is deleted.
  const [media, stories, documents, evidence] = await Promise.all([
    db.select({ key: profileMedia.r2Key }).from(profileMedia).where(eq(profileMedia.profileId, profileId)),
    db.select({ key: profileStatuses.r2Key }).from(profileStatuses).where(eq(profileStatuses.profileId, profileId)),
    db.select({ key: profileVerificationFiles.r2Key }).from(profileVerificationFiles).where(eq(profileVerificationFiles.profileId, profileId)),
    db.select({ key: profileReportEvidence.r2Key }).from(profileReportEvidence).innerJoin(profileReports, eq(profileReportEvidence.reportId, profileReports.id)).where(eq(profileReports.profileId, profileId)),
  ]);
  const objectKeys = [...new Set([...media, ...stories, ...documents, ...evidence].map((row) => row.key).filter((key): key is string => Boolean(key)))];
  const deletionId = `audit_${crypto.randomUUID()}`;
  await db.batch([
    db.delete(profiles).where(and(eq(profiles.id, profileId), isNotNull(profiles.trashedAt))),
    db.insert(adminAuditLogs).values({
      id: deletionId, actorUserId: admin.id, actorGithubLogin: admin.githubLogin,
      actorEmail: admin.email, actorName: admin.displayName,
      category: "profiles", action: "profile.delete_permanently", outcome: "success", entityType: "profile", entityId: profileId,
      entityLabel: profile.displayName, summary: `Eliminó definitivamente el anuncio ${profile.displayName} desde la papelera.`,
      beforeData: JSON.stringify({ type: profile.type, status: profile.status, trashedAt: profile.trashedAt, objectCount: objectKeys.length }),
      afterData: JSON.stringify({ deleted: true }),
    }),
  ]);
  if (objectKeys.length) {
    try {
      const { env } = await import("cloudflare:workers");
      if (!env.MEDIA) throw new Error("R2 binding unavailable");
      for (let index = 0; index < objectKeys.length; index += 1000) await env.MEDIA.delete(objectKeys.slice(index, index + 1000));
    } catch (error) {
      console.error("Trashed profile R2 cleanup failed", { profileId, deletionId, objectCount: objectKeys.length, error });
      try {
        await recordOperationalEvent({ category: "storage", eventName: "profile.delete_r2", outcome: "failure", detail: `No se pudieron limpiar ${objectKeys.length} archivos del anuncio eliminado ${profileId}.` });
      } catch (logError) {
        console.error("Trashed profile R2 failure logging failed", { profileId, deletionId, logError });
      }
      return "storage_cleanup_failed";
    }
  }
  return "ok";
}
