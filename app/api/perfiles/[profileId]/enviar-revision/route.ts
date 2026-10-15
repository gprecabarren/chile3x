import { and, eq, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileDetails, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, hasTesterAutoApproval } from "@/lib/auth";
import { publicProfileAge } from "@/lib/profile-age";
import { createAdminNotification } from "@/lib/admin-notifications";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  }
  const autoApprove = hasTesterAutoApproval(user);
  const { profileId } = await params;
  const db = await getDb();
  const [record] = await db.select({ type: profiles.type, metadata: profileDetails.metadata }).from(profiles).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id)).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id), isNull(profiles.trashedAt))).limit(1);
  if (!record) return new Response("Anuncio no encontrado o no pertenece a tu cuenta.", { status: 404 });
  let metadata: Record<string,string> = {}; try { metadata = JSON.parse(record.metadata || "{}"); } catch { /* Missing age fails closed. */ }
  if (record.type === "escort" && publicProfileAge(record.type, metadata) === null) return new Response("Indica una edad válida entre 18 y 99 años en Editar anuncio antes de enviarlo a revisión.", { status: 400 });
  const result = await db.update(profiles).set({
    status: autoApprove ? "approved" : "pending",
    verificationStatus: autoApprove ? "unreviewed" : "in_review",
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(profiles.id, profileId),
    eq(profiles.ownerId, user.id),
    isNull(profiles.trashedAt),
    or(eq(profiles.status, "draft"), eq(profiles.status, "rejected")),
  )).returning({ id: profiles.id });
  if (result.length && !autoApprove) await createAdminNotification({ kind: "profile_updated", actorUserId: user.id, profileId, summary: "Se envió el anuncio a revisión desde Mis anuncios." });

  return NextResponse.redirect(new URL(`/mi-cuenta?notice=${result.length ? autoApprove ? "approved" : "submitted" : "error"}`, request.url), 303);
}
