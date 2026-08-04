import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { sendPortalEmail } from "@/lib/account-email";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { profilePublicPath } from "@/lib/profile";

const allowedStatuses = new Set(["draft", "pending", "approved", "paused", "rejected", "expired"]);
const allowedVerification = new Set(["unreviewed", "in_review", "reviewed"]);
const allowedHealthReview = new Set(["not_requested", "in_review", "reviewed"]);

function safeProfileReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/perfil/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://chile3x.cl");
    return url.pathname.startsWith("/perfil/") && url.pathname.length > "/perfil/".length ? url.pathname : null;
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

  if (!await getCurrentAdmin()) {
    return new Response("No autorizado.", { status: 401 });
  }

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
    type: profiles.type,
    displayName: profiles.displayName,
    slug: profiles.slug,
    handle: profiles.handle,
    ownerEmail: users.email,
    ownerName: users.displayName,
  }).from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).where(eq(profiles.id, profileId)).limit(1);
  if (!existingProfile) return new Response("Perfil no encontrado.", { status: 404 });

  await db.update(profiles).set({
    status: status as typeof profiles.$inferInsert.status,
    verificationStatus: verificationStatus as typeof profiles.$inferInsert.verificationStatus,
    healthReviewStatus: healthReviewStatus as typeof profiles.$inferInsert.healthReviewStatus,
    ...(featuredInput === null ? {} : { isFeatured: featuredInput === "on" }),
    updatedAt: new Date().toISOString(),
  }).where(eq(profiles.id, profileId));

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
    });
    if (!delivered) console.error("Could not send profile approval email", { profileId });
  }

  return NextResponse.redirect(new URL(safeProfileReturnTo(formData.get("return_to")) ?? "/admin/perfiles", request.url), 303);
}
