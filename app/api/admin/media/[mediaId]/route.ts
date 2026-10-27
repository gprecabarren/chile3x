import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { dataDeletionJobs, profileMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse } from "@/lib/collaboration";
import { approvedPhotoBeingReplaced } from "@/lib/owner-photo-edit";

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
  const version=(()=>{try{return expectedVersion(formData,`profile:${record.media.profileId}`);}catch{return null;}})();
  if(!version)return conflictResponse();
  async function save(statements:Parameters<typeof guardedBatch>[1]){try{await guardedBatch(version!,statements,admin!.id);return null;}catch(error){if(error instanceof CollaborationConflict)return conflictResponse();throw error;}}
  if (action === "approve") {
    const replaced = await approvedPhotoBeingReplaced(record.media);
    const isCover = replaced ? replaced.isProfilePhoto : record.media.isProfilePhoto;
    const otherCovers=isCover?[db.update(profileMedia).set({ isProfilePhoto: false }).where(and(
        eq(profileMedia.profileId, record.media.profileId),
        eq(profileMedia.isProfilePhoto, true),
        ne(profileMedia.id, replaced?.id ?? mediaId),
        eq(profileMedia.moderationStatus, "approved"),
      ))]:[];
    // Keep the approved public ID stable: cached profile HTML can still refer
    // to it. Move the pending final into that slot, then retire its queue row.
    const statements: Parameters<typeof guardedBatch>[1] = replaced ? [db.update(profileMedia).set({r2Key:record.media.r2Key,byteSize:record.media.byteSize,contentType:record.media.contentType,moderationStatus:"approved",isProfilePhoto:replaced.isProfilePhoto}).where(eq(profileMedia.id,replaced.id)),...otherCovers,db.insert(dataDeletionJobs).values({id:`replace_${crypto.randomUUID()}`,r2Key:replaced.r2Key}).onConflictDoNothing(),db.delete(profileMedia).where(eq(profileMedia.id,mediaId))] : [db.update(profileMedia).set({moderationStatus:"approved"}).where(eq(profileMedia.id,mediaId)),...otherCovers];
    const conflict=await save(statements);if(conflict)return conflict;
    await recordAdminAudit(admin, { category: "media", action: "media.public_approve", summary: `Aprobó ${record.media.mediaType === "video" ? "un video" : "una foto"} de la galería de ${record.profile.displayName}.`, entityType: "public_media", entityId: mediaId, entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`, before: { moderationStatus: record.media.moderationStatus, isProfilePhoto: record.media.isProfilePhoto }, after: { moderationStatus: "approved", isProfilePhoto: isCover }, metadata: { profileId: record.profile.id, ...(replaced ? { replacedMediaId: replaced.id, publishedMediaId: replaced.id } : {}) } });
    if (replaced) {
      const { env } = await import("cloudflare:workers");
      try { await env.MEDIA?.delete(replaced.r2Key); if (env.MEDIA) await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key,replaced.r2Key)); } catch { console.error("Approved replacement cleanup deferred",{mediaId}); }
    }
    return NextResponse.redirect(destination(request, formData, "approved"), 303);
  }

  if (action === "unapprove") {
    const conflict=await save([db.update(profileMedia).set({moderationStatus:"pending"}).where(eq(profileMedia.id,mediaId))]);if(conflict)return conflict;
    await recordAdminAudit(admin, { category: "media", action: "media.public_unapprove", summary: `Devolvió a revisión ${record.media.mediaType === "video" ? "un video" : "una foto"} de ${record.profile.displayName}.`, entityType: "public_media", entityId: mediaId, entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`, before: { moderationStatus: record.media.moderationStatus }, after: { moderationStatus: "pending" }, metadata: { profileId: record.profile.id } });
    return NextResponse.redirect(destination(request, formData, "unapproved"), 303);
  }

  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    const conflict=await save([db.insert(dataDeletionJobs).values({id:`delete_${crypto.randomUUID()}`,r2Key:record.media.r2Key}).onConflictDoNothing(),db.delete(profileMedia).where(eq(profileMedia.id,mediaId))]);if(conflict)return conflict;
    try{await env.MEDIA.delete(record.media.r2Key);await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key,record.media.r2Key));}catch{console.error("Deferred reviewed media storage cleanup",{mediaId});}
    await recordAdminAudit(admin, { category: "media", action: "media.public_delete", summary: `Eliminó ${record.media.mediaType === "video" ? "un video" : "una foto"} de la galería de ${record.profile.displayName}.`, entityType: "public_media", entityId: mediaId, entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`, before: { moderationStatus: record.media.moderationStatus, mediaType: record.media.mediaType, byteSize: record.media.byteSize, isProfilePhoto: record.media.isProfilePhoto }, metadata: { profileId: record.profile.id } });
    return NextResponse.redirect(destination(request, formData, "deleted"), 303);
  }

  return NextResponse.redirect(destination(request, formData, "error"), 303);
}
