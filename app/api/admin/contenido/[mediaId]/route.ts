import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { dataDeletionJobs, exclusiveContentMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findExclusiveContentMedia } from "@/lib/exclusive-content";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse } from "@/lib/collaboration";

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
  const version=(()=>{try{return expectedVersion(formData,`library:${record.collection.id}`);}catch{return null;}})();
  if(!version)return conflictResponse();
  async function save(statements:Parameters<typeof guardedBatch>[1]){try{await guardedBatch(version!,statements,admin!.id);return null;}catch(error){if(error instanceof CollaborationConflict)return conflictResponse();throw error;}}
  const action = formData.get("action");
  if (action === "approve") {
    const conflict=await save([db.update(exclusiveContentMedia).set({moderationStatus:"approved"}).where(eq(exclusiveContentMedia.id,mediaId))]);if(conflict)return conflict;
    await recordAdminAudit(admin, { category: "media", action: "media.exclusive_approve", summary: `Aprobó un ${record.media.mediaType === "video" ? "video" : "foto"} de contenido exclusivo.`, entityType: "exclusive_media", entityId: mediaId, entityLabel: record.media.mediaType === "video" ? "Video exclusivo" : "Foto exclusiva", before: { moderationStatus: record.media.moderationStatus }, after: { moderationStatus: "approved" }, metadata: { collectionId: record.collection.id, ownerId: record.collection.ownerId } });
    return NextResponse.redirect(destination(request, formData, "approved"), 303);
  }
  if (action === "unapprove") {
    const conflict=await save([db.update(exclusiveContentMedia).set({moderationStatus:"pending"}).where(eq(exclusiveContentMedia.id,mediaId))]);if(conflict)return conflict;
    await recordAdminAudit(admin, { category: "media", action: "media.exclusive_unapprove", summary: `Devolvió a revisión un ${record.media.mediaType === "video" ? "video" : "foto"} de contenido exclusivo.`, entityType: "exclusive_media", entityId: mediaId, entityLabel: record.media.mediaType === "video" ? "Video exclusivo" : "Foto exclusiva", before: { moderationStatus: record.media.moderationStatus }, after: { moderationStatus: "pending" }, metadata: { collectionId: record.collection.id, ownerId: record.collection.ownerId } });
    return NextResponse.redirect(destination(request, formData, "unapproved"), 303);
  }
  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    const conflict=await save([db.insert(dataDeletionJobs).values({id:`delete_${crypto.randomUUID()}`,r2Key:record.media.r2Key}).onConflictDoNothing(),db.delete(exclusiveContentMedia).where(eq(exclusiveContentMedia.id,mediaId))]);if(conflict)return conflict;
    try{await env.MEDIA.delete(record.media.r2Key);await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key,record.media.r2Key));}catch{console.error("Deferred reviewed exclusive storage cleanup",{mediaId});}
    await recordAdminAudit(admin, { category: "media", action: "media.exclusive_delete", summary: `Eliminó un ${record.media.mediaType === "video" ? "video" : "foto"} de contenido exclusivo.`, entityType: "exclusive_media", entityId: mediaId, entityLabel: record.media.mediaType === "video" ? "Video exclusivo" : "Foto exclusiva", before: { moderationStatus: record.media.moderationStatus, mediaType: record.media.mediaType, byteSize: record.media.byteSize }, metadata: { collectionId: record.collection.id, ownerId: record.collection.ownerId } });
    return NextResponse.redirect(destination(request, formData, "deleted"), 303);
  }
  return NextResponse.redirect(destination(request, formData, "error"), 303);
}
