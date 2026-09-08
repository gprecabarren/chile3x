import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { exclusiveContentMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findExclusiveContentMedia } from "@/lib/exclusive-content";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

function destination(request: NextRequest, formData: FormData, notice: string) {
  const requested = String(formData.get("return_to") ?? "");
  const path = requested.startsWith("/admin/medios") ? requested : "/admin/medios";
  const url = new URL(path, request.url); url.searchParams.set("notice", notice); return url;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin/medios", request.url), 303);
  if (!adminHasCapability(admin, "media.moderate")) return new Response("No tienes permiso para moderar medios.", { status: 403 });
  const { mediaId } = await params;
  const formData = await request.formData();
  const record = await findExclusiveContentMedia(mediaId);
  if (!record) return NextResponse.redirect(destination(request, formData, "missing"), 303);
  const db = await getDb();
  const action = formData.get("action");
  if (action === "approve") {
    await db.update(exclusiveContentMedia).set({ moderationStatus: "approved" }).where(eq(exclusiveContentMedia.id, mediaId));
    await recordAdminAudit(admin, { category: "media", action: "media.exclusive_approve", summary: `Aprobó un ${record.media.mediaType === "video" ? "video" : "foto"} de contenido exclusivo.`, entityType: "exclusive_media", entityId: mediaId, entityLabel: record.media.mediaType === "video" ? "Video exclusivo" : "Foto exclusiva", before: { moderationStatus: record.media.moderationStatus }, after: { moderationStatus: "approved" }, metadata: { collectionId: record.collection.id, ownerId: record.collection.ownerId } });
    return NextResponse.redirect(destination(request, formData, "approved"), 303);
  }
  if (action === "unapprove") {
    await db.update(exclusiveContentMedia).set({ moderationStatus: "pending" }).where(eq(exclusiveContentMedia.id, mediaId));
    await recordAdminAudit(admin, { category: "media", action: "media.exclusive_unapprove", summary: `Devolvió a revisión un ${record.media.mediaType === "video" ? "video" : "foto"} de contenido exclusivo.`, entityType: "exclusive_media", entityId: mediaId, entityLabel: record.media.mediaType === "video" ? "Video exclusivo" : "Foto exclusiva", before: { moderationStatus: record.media.moderationStatus }, after: { moderationStatus: "pending" }, metadata: { collectionId: record.collection.id, ownerId: record.collection.ownerId } });
    return NextResponse.redirect(destination(request, formData, "unapproved"), 303);
  }
  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    await env.MEDIA.delete(record.media.r2Key);
    await db.delete(exclusiveContentMedia).where(eq(exclusiveContentMedia.id, mediaId));
    await recordAdminAudit(admin, { category: "media", action: "media.exclusive_delete", summary: `Eliminó un ${record.media.mediaType === "video" ? "video" : "foto"} de contenido exclusivo.`, entityType: "exclusive_media", entityId: mediaId, entityLabel: record.media.mediaType === "video" ? "Video exclusivo" : "Foto exclusiva", before: { moderationStatus: record.media.moderationStatus, mediaType: record.media.mediaType, byteSize: record.media.byteSize }, metadata: { collectionId: record.collection.id, ownerId: record.collection.ownerId } });
    return NextResponse.redirect(destination(request, formData, "deleted"), 303);
  }
  return NextResponse.redirect(destination(request, formData, "error"), 303);
}
