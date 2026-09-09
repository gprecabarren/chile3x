import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminGithubAccess, adminGithubIdentities, users } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { ADMIN_ACCESS_LEVELS, adminHasCapability, isAdminAccessLevel } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const ASSIGNABLE_LEVELS = ADMIN_ACCESS_LEVELS.filter((level) => level !== "owner");

function isAssignableLevel(value: unknown): value is Exclude<(typeof ADMIN_ACCESS_LEVELS)[number], "owner"> {
  return isAdminAccessLevel(value) && value !== "owner";
}

function validGithubLogin(value: string) {
  return /^(?=.{1,39}$)[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/.test(value);
}

function destination(request: Request, notice: string) {
  const url = new URL("/admin/administradores", request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "admins.manage")) return new Response("No tienes permiso para administrar accesos.", { status: 403 });

  const form = await request.formData();
  const githubLogin = String(form.get("github_login") ?? "").trim().toLowerCase();
  const protectedEmail = String(form.get("protected_email") ?? "").trim().toLowerCase().slice(0, 160);
  const accessLevel = String(form.get("access_level") ?? "moderator");
  if (!validGithubLogin(githubLogin) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(protectedEmail) || !isAssignableLevel(accessLevel) || !ASSIGNABLE_LEVELS.includes(accessLevel)) {
    return destination(request, "invalid");
  }

  const db = await getDb();
  const [[existing], [publicAccountConflict], [reservedGrant], [reservedIdentity]] = await Promise.all([
    db.select().from(adminGithubAccess).where(eq(adminGithubAccess.githubLogin, githubLogin)).limit(1),
    db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, protectedEmail), ne(users.role, "admin"))).limit(1),
    db.select({ id: adminGithubAccess.id }).from(adminGithubAccess)
      .where(eq(adminGithubAccess.protectedEmail, protectedEmail)).limit(1),
    db.select({ userId: adminGithubIdentities.userId, githubLogin: adminGithubIdentities.githubLogin })
      .from(adminGithubIdentities).where(eq(adminGithubIdentities.githubEmail, protectedEmail)).limit(1),
  ]);

  if (existing?.isProtectedOwner) return destination(request, "protected");
  if (existing?.isActive) return destination(request, "duplicate");
  if (publicAccountConflict) return destination(request, "email_conflict");
  if (reservedGrant && reservedGrant.id !== existing?.id) return destination(request, "email_duplicate");
  if (reservedIdentity && (reservedIdentity.userId !== existing?.userId || reservedIdentity.githubLogin !== githubLogin)) {
    return destination(request, "email_duplicate");
  }

  if (existing) {
    const now = new Date().toISOString();
    try {
      await db.update(adminGithubAccess).set({
        accessLevel,
        protectedEmail,
        isActive: true,
        invitedBy: admin.id,
        revokedBy: null,
        revokedAt: null,
        updatedAt: now,
      }).where(eq(adminGithubAccess.id, existing.id));
    } catch {
      return destination(request, "email_duplicate");
    }
    await recordAdminAudit(admin, {
      category: "access",
      action: "admin.grant_reactivate",
      entityType: "admin",
      entityId: existing.id,
      entityLabel: `@${githubLogin}`,
      summary: `Reactivó el acceso administrativo de @${githubLogin}.`,
      before: { accessLevel: existing.accessLevel, isActive: existing.isActive },
      after: { accessLevel, protectedEmail, isActive: true },
    });
    return destination(request, "reactivated");
  }

  const id = `admin_access_${crypto.randomUUID()}`;
  try {
    await db.insert(adminGithubAccess).values({
      id,
      githubLogin,
      protectedEmail,
      accessLevel,
      invitedBy: admin.id,
    });
  } catch {
    return destination(request, "duplicate");
  }
  await recordAdminAudit(admin, {
    category: "access",
    action: "admin.grant_create",
    entityType: "admin",
    entityId: id,
    entityLabel: `@${githubLogin}`,
    summary: `Autorizó a @${githubLogin} para ingresar como administrador.`,
    after: { githubLogin, protectedEmail, accessLevel, isActive: true },
  });
  return destination(request, "created");
}
