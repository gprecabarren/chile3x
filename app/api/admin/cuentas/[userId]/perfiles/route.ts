import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { createProfile, ProfileValidationError, readProfileSubmission } from "@/lib/profile-submission";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { AgencyError } from "@/lib/agency-management";

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "accounts.manage")) return new Response("No tienes permiso para administrar cuentas.", { status: 403 });

  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const db = await getDb();
  const [owner] = await db.select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!owner || owner.role === "admin" || !owner.isActive) {
    const url = new URL(`/admin/cuentas/${encodeURIComponent(userId)}`, request.url);
    url.searchParams.set("notice", "account_error");
    return NextResponse.redirect(url, 303);
  }

  try {
    const requestedAgency = formData.get("agency_custodian_id");
    const agencyId = typeof requestedAgency === "string" ? requestedAgency.trim() : "";
    if (requestedAgency !== null && typeof requestedAgency !== "string") {
      throw new ProfileValidationError("Selecciona una agencia válida de esta cuenta.");
    }
    if (agencyId && !adminHasCapability(admin, "profiles.moderate")) {
      return new Response("No tienes permiso para crear perfiles gestionados por una agencia.", { status: 403 });
    }
    if (agencyId && formData.get("agency_permission") !== "on") {
      throw new ProfileValidationError("Confirma la autorización de la persona adulta para que la agencia la represente y publique su anuncio.");
    }
    const submission = readProfileSubmission(formData);
    const profileId = await createProfile(owner.id, submission, { adminCreator: { id: admin.id, githubLogin: admin.githubLogin }, agencyId: agencyId || undefined });
    await recordAdminAudit(admin, {
      category: "profiles", action: "profile.create", summary: `Creó el anuncio ${submission.displayName} para ${owner.email}.`,
      entityType: "profile", entityId: profileId, entityLabel: submission.displayName,
      after: { ownerId: owner.id, type: submission.type, status: submission.intent === "submit" ? "pending" : "draft", region: submission.region, city: submission.city, handle: submission.handle },
      ...(agencyId ? { metadata: { agencyId, authorizationConfirmed: true } } : {}),
    });
    const url = new URL(`/admin/cuentas/${encodeURIComponent(owner.id)}/perfiles/${encodeURIComponent(profileId)}/medios`, request.url);
    url.searchParams.set("notice", submission.intent === "submit" ? "profile_submitted" : "profile_created");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = new URL(`/admin/cuentas/${encodeURIComponent(userId)}/crear-perfil`, request.url);
    const validation = error instanceof ProfileValidationError || error instanceof AgencyError;
    url.searchParams.set("error", validation ? "validation" : "server");
    url.searchParams.set("message", validation ? error.message : "No se pudo guardar el aviso. Revisa los campos e inténtalo nuevamente.");
    return NextResponse.redirect(url, 303);
  }
}
