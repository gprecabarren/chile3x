import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminGithubAccess, authSessions } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { ADMIN_ACCESS_LEVELS, adminHasCapability, isAdminAccessLevel } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { hasPublicAccountEmail } from "@/lib/admin-email";
import { normalizeGithubLogin } from "@/lib/admin-access-validation";
import { lookupGithubAccount } from "@/lib/admin-github-account";

const ASSIGNABLE_LEVELS = ADMIN_ACCESS_LEVELS.filter((level) => level !== "owner");

function isAssignableLevel(value: unknown): value is Exclude<(typeof ADMIN_ACCESS_LEVELS)[number], "owner"> {
  return isAdminAccessLevel(value) && value !== "owner";
}

function destination(request: Request, notice: string) {
  const url = new URL("/admin/administradores", request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ grantId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "admins.manage")) return new Response("No tienes permiso para administrar accesos.", { status: 403 });

  const [{ grantId }, form] = await Promise.all([params, request.formData()]);
  const intent = String(form.get("intent") ?? "");
  const db = await getDb();
  const [grant] = await db.select().from(adminGithubAccess).where(eq(adminGithubAccess.id, grantId)).limit(1);
  if (!grant) return destination(request, "missing");

  // The protected owner cannot be changed from the application, including by
  // their own browser. Recovery remains possible only through a reviewed D1
  // migration, never through a normal panel request.
  if (grant.isProtectedOwner || grant.userId === admin.id) return destination(request, "protected");

  if (intent === "login") {
    if (grant.userId || !grant.isActive || String(form.get("previous_login") ?? "") !== grant.githubLogin) return destination(request, "identity_bound");
    const account = await lookupGithubAccount(normalizeGithubLogin(String(form.get("github_login") ?? "")));
    if ("error" in account) return destination(request, account.error);
    let changed;
    try {
      changed = await db.update(adminGithubAccess).set({ githubLogin: account.login, githubUserId: account.id, updatedAt: new Date().toISOString() }).where(and(eq(adminGithubAccess.id, grant.id), eq(adminGithubAccess.isActive, true), isNull(adminGithubAccess.userId), eq(adminGithubAccess.githubLogin, grant.githubLogin), grant.githubUserId ? eq(adminGithubAccess.githubUserId, grant.githubUserId) : isNull(adminGithubAccess.githubUserId))).returning({ id: adminGithubAccess.id });
    } catch { return destination(request, "duplicate"); }
    if (!changed.length) return destination(request, "identity_bound");
    await recordAdminAudit(admin, { category: "access", action: "admin.grant_login_correct", entityType: "admin", entityId: grant.id, entityLabel: `@${account.login}`, summary: `Corrigió el usuario de GitHub de una invitación sin primer ingreso.`, before: { githubLogin: grant.githubLogin }, after: { githubLogin: account.login }, metadata: { emailAndLevelUnchanged: true } });
    return destination(request, "login_updated");
  }

  if (intent === "level") {
    const accessLevel = String(form.get("access_level") ?? "");
    if (!isAssignableLevel(accessLevel) || !ASSIGNABLE_LEVELS.includes(accessLevel)) return destination(request, "invalid");
    await db.update(adminGithubAccess).set({ accessLevel, updatedAt: new Date().toISOString() })
      .where(eq(adminGithubAccess.id, grant.id));
    await recordAdminAudit(admin, {
      category: "access", action: "admin.grant_update", entityType: "admin", entityId: grant.id,
      entityLabel: `@${grant.githubLogin}`, summary: `Cambió el nivel administrativo de @${grant.githubLogin}.`,
      before: { accessLevel: grant.accessLevel }, after: { accessLevel },
    });
    return destination(request, "updated");
  }

  if (intent === "revoke") {
    const now = new Date().toISOString();
    await db.update(adminGithubAccess).set({ isActive: false, revokedBy: admin.id, revokedAt: now, updatedAt: now })
      .where(eq(adminGithubAccess.id, grant.id));
    if (grant.userId) await db.delete(authSessions).where(eq(authSessions.userId, grant.userId));
    await recordAdminAudit(admin, {
      category: "access", action: "admin.grant_revoke", entityType: "admin", entityId: grant.id,
      entityLabel: `@${grant.githubLogin}`, summary: `Revocó el acceso administrativo de @${grant.githubLogin} y cerró sus sesiones.`,
      before: { isActive: grant.isActive, accessLevel: grant.accessLevel }, after: { isActive: false, accessLevel: grant.accessLevel },
    });
    return destination(request, "revoked");
  }

  if (intent === "reactivate") {
    if (grant.protectedEmail && await hasPublicAccountEmail(grant.protectedEmail)) return destination(request, "email_conflict");
    const now = new Date().toISOString();
    await db.update(adminGithubAccess).set({ isActive: true, revokedBy: null, revokedAt: null, updatedAt: now })
      .where(eq(adminGithubAccess.id, grant.id));
    await recordAdminAudit(admin, {
      category: "access", action: "admin.grant_reactivate", entityType: "admin", entityId: grant.id,
      entityLabel: `@${grant.githubLogin}`, summary: `Reactivó el acceso administrativo de @${grant.githubLogin}.`,
      before: { isActive: grant.isActive }, after: { isActive: true },
    });
    return destination(request, "reactivated");
  }

  if (intent === "sessions") {
    if (grant.userId) await db.delete(authSessions).where(eq(authSessions.userId, grant.userId));
    await recordAdminAudit(admin, {
      category: "access", action: "admin.sessions_revoke", entityType: "admin", entityId: grant.id,
      entityLabel: `@${grant.githubLogin}`, summary: `Cerró todas las sesiones administrativas de @${grant.githubLogin}.`,
      metadata: { hadLinkedAccount: Boolean(grant.userId) },
    });
    return destination(request, "sessions_revoked");
  }

  return destination(request, "invalid");
}
