import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { profileDetails, profiles, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { ProfileValidationError, readProfileSubmission, updateProfile } from "@/lib/profile-submission";
import { CollaborationConflict, expectedVersion, conflictResponse, mutationRedirect } from "@/lib/collaboration";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "profiles.moderate")) return new Response("No tienes permiso para editar anuncios.", { status: 403 });
  const { profileId } = await params;
  const destination = new URL(`/admin/anuncios-publicaciones/${encodeURIComponent(profileId)}/editar`, request.url);
  const db = await getDb();
  const [before] = await db.select({ profile: profiles, details: profileDetails, ownerActive: users.isActive })
    .from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
    .where(and(eq(profiles.id, profileId), isNull(profiles.trashedAt))).limit(1);
  if (!before) return new Response("Anuncio no encontrado.", { status: 404 });
  if (!before.ownerActive) return new Response("Reactiva la cuenta propietaria antes de editar el anuncio.", { status: 403 });
  try {
    const form = await request.formData();
    const version = expectedVersion(form,`profile:${profileId}`);
    const submission = readProfileSubmission(form, {travelDateValidation: "stored"});
    const result = await updateProfile(profileId, before.profile.ownerId, submission, { adminEditor: true, version, actorId:admin.id });
    if (!result.updated) return new Response("El anuncio ya no está disponible para editar.", { status: 409 });
    const [savedState] = await db.select({ status: profiles.status, verificationStatus: profiles.verificationStatus }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
    await recordAdminAudit(admin, {
      category: "profiles", action: "profile.details_update", entityType: "profile", entityId: profileId, entityLabel: submission.displayName,
      summary: `Editó el anuncio ${submission.displayName} sin cambiar su estado de publicación.`,
      before: { displayName: before.profile.displayName, handle: before.profile.handle, status: before.profile.status, tier: before.profile.tier, region: before.profile.region, city: before.profile.city, description: before.profile.description, details: before.details },
      after: { displayName: submission.displayName, handle: submission.handle ?? before.profile.handle, status: savedState?.status, verificationStatus: savedState?.verificationStatus, tier: submission.tier, region: submission.region, city: submission.city, description: submission.description, details: submission.details, tags: submission.tags, servicesIncluded: submission.servicesIncluded, servicesAdditional: submission.servicesAdditional },
      metadata: { ownerId: before.profile.ownerId },
    });
    destination.searchParams.set("notice", "saved");
  } catch (error) {
    if (error instanceof CollaborationConflict) return conflictResponse();
    destination.searchParams.set("error", error instanceof ProfileValidationError ? "validation" : "server");
    destination.searchParams.set("message", error instanceof ProfileValidationError ? error.message : "No se pudo confirmar el guardado. Revisa el anuncio antes de repetirlo.");
    if (!(error instanceof ProfileValidationError)) console.error("Administrative listing edit failed", { profileId, error });
  }
  return mutationRedirect(request,destination);
}
