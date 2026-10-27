import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { dataDeletionJobs, profileMedia, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { findProfileMedia, getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { approvedPhotoBeingReplaced, editableMediaItem } from "@/lib/owner-photo-edit";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse } from "@/lib/collaboration";
import { MediaUploadRequestError, readMediaUploadForm } from "@/lib/media-upload-form";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string; mediaId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingresa para administrar fotos." }, { status: 401 });

  const { profileId, mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.profileId !== profileId || record.profile.ownerId !== user.id || !record.ownerIsActive || record.profile.trashedAt) {
    return NextResponse.json({ error: "No tienes permiso para eliminar esta foto." }, { status: 403 });
  }

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return NextResponse.json({ error: "El almacenamiento no está disponible." }, { status: 503 });

  const db = await getDb(), restored = await approvedPhotoBeingReplaced(record.media);
  let revision = record.profile.revision;
  try {
    const form = request.headers.get("content-type")?.includes("multipart/form-data") ? await readMediaUploadForm(request, 8_000, 16_000) : null;
    const version = form?.has("review_revision") ? expectedVersion(form, `profile:${profileId}`) : { key: `profile:${profileId}` as const, revision };
    const results = await guardedBatch(version, [
      db.insert(dataDeletionJobs).values({ id: crypto.randomUUID(), r2Key: record.media.r2Key }).onConflictDoNothing(),
      db.delete(profileMedia).where(eq(profileMedia.id, mediaId)),
      db.select({ revision: profiles.revision }).from(profiles).where(eq(profiles.id, profileId)),
    ]);
    const last = results.at(-1); if (Array.isArray(last) && typeof last[0]?.revision === "number") revision = last[0].revision;
  } catch (cause) {
    if (cause instanceof CollaborationConflict) return conflictResponse();
    if (cause instanceof MediaUploadRequestError) return NextResponse.json({ error: cause.message }, { status: cause.status });
    throw cause;
  }
  try { await env.MEDIA.delete(record.media.r2Key); await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key, record.media.r2Key)); }
  catch { console.error("Deferred owner media cleanup", { mediaId }); }
  const usage = await getMediaUsage();
  return NextResponse.json({ ok: true, revision, quota: { ...usage, ...getMediaQuotaState(usage.bytes) }, ...(restored ? { restoredMedia: editableMediaItem(restored) } : {}) });
}
