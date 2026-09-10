import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { sendPortalEmail } from "@/lib/account-email";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { profilePublicPath } from "@/lib/profile";
import { notifyProfileCitySubscribers } from "@/lib/profile-city-alerts";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

const allowedStatuses = new Set(["draft", "pending", "approved", "paused", "rejected", "expired"]);
const allowedVerification = new Set(["unreviewed", "in_review", "reviewed"]);
const allowedHealthReview = new Set(["not_requested", "in_review", "reviewed"]);

function safeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://chile3x.cl");
    const isProfile = url.pathname.startsWith("/perfil/") && url.pathname.length > "/perfil/".length;
    const isAdminList = url.pathname === "/admin/perfiles";
    return isProfile || isAdminList ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("No autorizado.", { status: 401 });
  }
  if (!adminHasCapability(admin, "profiles.moderate")) return new Response("No tienes permiso para moderar anuncios.", { status: 403 });

  const formData = await request.formData();
  const status = formData.get("status");
  const verificationStatus = formData.get("verification_status");
  const healthReviewStatus = formData.get("health_review_status");
  const featuredInput = formData.get("is_featured");
  const { profileId } = await params;

  if (typeof status !== "string" || typeof verificationStatus !== "string" || typeof healthReviewStatus !== "string" || !allowedStatuses.has(status) || !allowedVerification.has(verificationStatus) || !allowedHealthReview.has(healthReviewStatus)) {
    return new Response("Estado no válido.", { status: 400 });
  }

  const db = await getDb();
  const [existingProfile] = await db.select({
    status: profiles.status,
    verificationStatus: profiles.verificationStatus,
    type: profiles.type,
    displayName: profiles.displayName,
    slug: profiles.slug,
    handle: profiles.handle,
    healthReviewStatus: profiles.healthReviewStatus,
    isFeatured: profiles.isFeatured,
    ownerEmail: users.email,
    ownerName: users.displayName,
  }).from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).where(eq(profiles.id, profileId)).limit(1);
  if (!existingProfile) return new Response("Perfil no encontrado.", { status: 404 });

  const now = new Date().toISOString();
  await db.update(profiles).set({
    status: status as typeof profiles.$inferInsert.status,
    verificationStatus: verificationStatus as typeof profiles.$inferInsert.verificationStatus,
    verifiedAt: verificationStatus === "reviewed"
      ? (existingProfile.verificationStatus === "reviewed" ? undefined : now)
      : null,
    healthReviewStatus: healthReviewStatus as typeof profiles.$inferInsert.healthReviewStatus,
    ...(featuredInput === null ? {} : { isFeatured: featuredInput === "on" }),
    updatedAt: now,
  }).where(eq(profiles.id, profileId));

  const nextFeatured = featuredInput === null ? existingProfile.isFeatured : featuredInput === "on";
  await recordAdminAudit(admin, {
    category: "profiles",
    action: "profile.status_update",
    entityType: "profile",
    entityId: profileId,
    entityLabel: existingProfile.displayName,
    summary: `Actualizó los estados del anuncio ${existingProfile.displayName}.`,
    before: {
      status: existingProfile.status,
      verificationStatus: existingProfile.verificationStatus,
      healthReviewStatus: existingProfile.healthReviewStatus,
      isFeatured: existingProfile.isFeatured,
    },
    after: { status, verificationStatus, healthReviewStatus, isFeatured: nextFeatured },
  });

  if (status === "approved" && existingProfile.status !== "approved") {
    const settings = await getSiteSettings();
    const profileUrl = new URL(profilePublicPath(existingProfile), siteBaseUrl(settings.site_url)).toString();
    const typeLabel = existingProfile.type === "agency" ? "perfil de agencia" : existingProfile.type === "rental" ? "perfil de arriendo" : "perfil de escort";
    const delivered = await sendPortalEmail({
      email: existingProfile.ownerEmail,
      displayName: existingProfile.ownerName,
      subject: "Tu anuncio fue aprobado | Chile3X",
      heading: "Tu anuncio ya está publicado",
      message: `Revisamos ${existingProfile.displayName}, tu ${typeLabel}, y ahora está visible para el público en Chile3X.`,
      action: { label: "Ver publicación", href: profileUrl },
      note: "Puedes actualizar la información, medios y actualizaciones desde Mi cuenta. Cualquier cambio relevante volverá a revisión manual.",
      kind: "profile_approved",
    });
    if (!delivered) console.error("Could not send profile approval email", { profileId });
    const cityNotifications = await notifyProfileCitySubscribers(profileId);
    if (cityNotifications > 0) console.info("Profile city subscribers notified", { profileId, cityNotifications });
  }

  return NextResponse.redirect(new URL(safeReturnTo(formData.get("return_to")) ?? "/admin/perfiles", request.url), 303);
}
