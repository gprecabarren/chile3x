import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { dataDeletionJobs, profileMedia, profiles, users } from "@/db/schema";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse } from "@/lib/collaboration";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia, getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { approvedPhotoBeingReplaced, editableMediaItem } from "@/lib/owner-photo-edit";

export const dynamic = "force-dynamic";
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string; mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return error("No autorizado.", 401);
  if (!adminHasCapability(admin, "accounts.manage") || !adminHasCapability(admin, "media.moderate")) return error("No tienes permiso para eliminar material de otras cuentas.", 403);
  const { profileId, mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.profileId !== profileId) return error("Archivo no encontrado en este anuncio.", 404);
  const [owner] = await (await getDb()).select({ isActive: users.isActive }).from(users).where(eq(users.id, record.profile.ownerId)).limit(1);
  if (!owner?.isActive) return error("La cuenta propietaria está deshabilitada.", 403);
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return error("El almacenamiento no está disponible.", 503);
  const db=await getDb(),restored=await approvedPhotoBeingReplaced(record.media);let revision:number|undefined;
  try{const result=await guardedBatch(expectedVersion(await request.formData(),`profile:${profileId}`),[db.insert(dataDeletionJobs).values({id:crypto.randomUUID(),r2Key:record.media.r2Key}).onConflictDoNothing(),db.delete(profileMedia).where(eq(profileMedia.id,mediaId)),db.select({revision:profiles.revision}).from(profiles).where(eq(profiles.id,profileId))],admin.id);const rows=result.at(-1);if(Array.isArray(rows)&&rows[0]&&typeof rows[0].revision==='number')revision=rows[0].revision;}
  catch(cause){if(cause instanceof CollaborationConflict)return conflictResponse();throw cause;}
  try{await env.MEDIA.delete(record.media.r2Key);await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key,record.media.r2Key));}catch{console.error("Deferred administrative storage cleanup",{mediaId});}
  await recordAdminAudit(admin, {
    category: "media", action: "media.public_delete", entityType: "public_media", entityId: mediaId,
    entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`,
    summary: `Eliminó ${record.media.mediaType === "video" ? "un video" : "una foto"} de ${record.profile.displayName}.`,
    before: { profileId, moderationStatus: record.media.moderationStatus, mediaType: record.media.mediaType, byteSize: record.media.byteSize },
  });
  const usage = await getMediaUsage();
  return NextResponse.json({ ok: true,revision, quota: { ...usage, ...getMediaQuotaState(usage.bytes) }, ...(restored ? { restoredMedia: editableMediaItem(restored) } : {}) });
}
