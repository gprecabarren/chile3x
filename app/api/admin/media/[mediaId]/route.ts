import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

function destination(request: NextRequest, formData: FormData, notice: string) {
  const requested = String(formData.get("return_to") ?? "");
  const path = requested.startsWith("/admin/medios") ? requested : "/admin/medios";
  const url = new URL(path, request.url);
  url.searchParams.set("notice", notice);
  return url;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin/medios", request.url), 303);
  if (!adminHasCapability(admin, "media.moderate")) return new Response("No tienes permiso para moderar medios.", { status: 403 });

  const { mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  const formData = await request.formData();
  if (!record) return NextResponse.redirect(destination(request, formData, "missing"), 303);
  const action = formData.get("action");
  const db = await getDb();
  if (action === "approve") {
    if (record.media.isProfilePhoto) {
      await db.update(profileMedia).set({ isProfilePhoto: false }).where(and(
        eq(profileMedia.profileId, record.media.profileId),
        eq(profileMedia.isProfilePhoto, true),
        ne(profileMedia.id, mediaId),
        eq(profileMedia.moderationStatus, "approved"),
      ));
    }
    await db.update(profileMedia).set({ moderationStatus: "approved" }).where(eq(profileMedia.id, mediaId));
    await recordAdminAudit(admin, { category: "media", action: "media.public_approve", summary: `Aprobó ${record.media.mediaType === "video" ? "un video" : "una foto"} de la galería de ${record.profile.displayName}.`, entityType: "public_media", entityId: mediaId, entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`, before: { moderationStatus: record.media.moderationStatus, isProfilePhoto: record.media.isProfilePhoto }, after: { moderationStatus: "approved", isProfilePhoto: record.media.isProfilePhoto }, metadata: { profileId: record.profile.id } });
    return NextResponse.redirect(destination(request, formData, "approved"), 303);
  }

  if (action === "unapprove") {
    await db.update(profileMedia).set({ moderationStatus: "pending" }).where(eq(profileMedia.id, mediaId));
    await recordAdminAudit(admin, { category: "media", action: "media.public_unapprove", summary: `Devolvió a revisión ${record.media.mediaType === "video" ? "un video" : "una foto"} de ${record.profile.displayName}.`, entityType: "public_media", entityId: mediaId, entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`, before: { moderationStatus: record.media.moderationStatus }, after: { moderationStatus: "pending" }, metadata: { profileId: record.profile.id } });
    return NextResponse.redirect(destination(request, formData, "unapproved"), 303);
  }

  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    await env.MEDIA.delete(record.media.r2Key);
    await db.delete(profileMedia).where(eq(profileMedia.id, mediaId));
    await recordAdminAudit(admin, { category: "media", action: "media.public_delete", summary: `Eliminó ${record.media.mediaType === "video" ? "un video" : "una foto"} de la galería de ${record.profile.displayName}.`, entityType: "public_media", entityId: mediaId, entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`, before: { moderationStatus: record.media.moderationStatus, mediaType: record.media.mediaType, byteSize: record.media.byteSize, isProfilePhoto: record.media.isProfilePhoto }, metadata: { profileId: record.profile.id } });
    return NextResponse.redirect(destination(request, formData, "deleted"), 303);
  }

  return NextResponse.redirect(destination(request, formData, "error"), 303);
}
