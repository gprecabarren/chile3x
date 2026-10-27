import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dataDeletionJobs, profileMedia, profiles } from "@/db/schema";
import { createAdminNotification } from "@/lib/admin-notifications";
import { expectedVersion, guardedBatch } from "@/lib/collaboration";
import { findProfileMedia, getProfileMedia, getMediaUsage, getMediaQuotaState, detectImageType, MAX_IMAGE_BYTES, MAX_PROFILE_MEDIA_BYTES, MEDIA_HARD_LIMIT_BYTES, type ProfileMediaRecord } from "@/lib/media";
import { parsePhotoEditOptions, type PhotoEditOptions } from "@/lib/photo-edit-policy";
import { getSiteSettings } from "@/lib/site-settings";

export class OwnerPhotoEditError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export type OwnerEditableMedia = ProfileMediaRecord & { replacementOf?: string };
const validId = (value: unknown): value is string => typeof value === "string" && /^[\w-]{1,120}$/.test(value);

/** This pointer is written by the server, never accepted from multipart input.
 * Validate both rows before using it to hide or retire an approved rendition. */
export function replacementBase(row: ProfileMediaRecord, rows: ProfileMediaRecord[], pointer: unknown) {
  if (row.mediaType !== "image" || row.visibility !== "public" || row.moderationStatus !== "pending" || !validId(pointer) || pointer === row.id) return null;
  return rows.find(base => base.id === pointer && base.profileId === row.profileId && base.mediaType === "image" && base.visibility === "public" && base.moderationStatus === "approved") ?? null;
}

async function mediaBucket() {
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) throw new OwnerPhotoEditError("El almacenamiento no está disponible.", 503);
  return env.MEDIA;
}

export async function pendingPhotoReplacements(rows: ProfileMediaRecord[]) {
  const candidates = rows.filter(row => row.mediaType === "image" && row.visibility === "public" && row.moderationStatus === "pending");
  const result = new Map<string, ProfileMediaRecord>();
  if (!candidates.length || !rows.some(row => row.moderationStatus === "approved" && row.mediaType === "image" && row.visibility === "public")) return result;
  const bucket = await mediaBucket();
  // At most the profile's bounded media set; no account data or source bytes.
  const metadata = await Promise.all(candidates.map(async row => ({ row, object: await bucket.head(row.r2Key) })));
  for (const { row, object } of metadata) {
    const base = replacementBase(row, rows, object?.customMetadata?.replacesMediaId);
    if (base) result.set(row.id, base);
  }
  return result;
}

export async function logicalProfileMedia(rows: ProfileMediaRecord[]): Promise<OwnerEditableMedia[]> {
  const replacements = await pendingPhotoReplacements(rows), hidden = new Set([...replacements.values()].map(row => row.id));
  return rows.filter(row => !hidden.has(row.id)).map(row => ({ ...row, ...(replacements.has(row.id) ? { replacementOf: replacements.get(row.id)!.id } : {}) }));
}

export async function getOwnerEditableProfileMedia(profileId: string) {
  return logicalProfileMedia(await getProfileMedia(profileId));
}

export async function approvedPhotoBeingReplaced(row: ProfileMediaRecord) {
  if (row.moderationStatus !== "pending" || row.mediaType !== "image" || row.visibility !== "public") return null;
  const rows = await getProfileMedia(row.profileId);
  return (await pendingPhotoReplacements(rows)).get(row.id) ?? null;
}

export function editableMediaItem(row: ProfileMediaRecord) {
  return { id: row.id, url: `/media/${row.id}`, mediaType: row.mediaType, contentType: row.contentType, moderationStatus: row.moderationStatus, visibility: row.visibility, isProfilePhoto: row.isProfilePhoto, byteSize: row.byteSize };
}

export async function ownedPhoto(profileId: string, mediaId: string, ownerId: string) {
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.profileId !== profileId || record.profile.ownerId !== ownerId || !record.ownerIsActive || record.profile.trashedAt || record.media.visibility !== "public" || record.media.mediaType !== "image") throw new OwnerPhotoEditError("No tienes permiso para editar esta foto.", 404);
  return record;
}

export async function ownerPhotoState(profileId: string, mediaId: string, ownerId: string, source: boolean) {
  const record = await ownedPhoto(profileId, mediaId, ownerId), bucket = await mediaBucket();
  const object = await bucket.head(record.media.r2Key);
  if (!object) throw new OwnerPhotoEditError("No se encontró la foto actual.", 404);
  if (source) {
    const file = await bucket.get(record.media.r2Key);
    if (!file) throw new OwnerPhotoEditError("No se encontró la foto actual.", 404);
    return { body: file.body, contentType: record.media.contentType, size: file.size };
  }
  const options = parsePhotoEditOptions(object.customMetadata?.photoOptions);
  const watermark = options?.watermark ?? object.customMetadata?.watermark === "true", blur = options?.blur ?? object.customMetadata?.blur === "true";
  return { id: mediaId, profileId, revision: record.profile.revision, watermark, blur, faceRegions: options?.faceRegions ?? [], hasBase: false, lockedWatermark: watermark, lockedBlur: blur, sourceUrl: `/api/perfiles/${encodeURIComponent(profileId)}/media/${encodeURIComponent(mediaId)}/procesar?source=1` };
}

export async function saveOwnerPhoto(profileId: string, mediaId: string, ownerId: string, form: FormData) {
  const record = await ownedPhoto(profileId, mediaId, ownerId), options = parsePhotoEditOptions(form.get("options")), file = form.get("file");
  if (!options) throw new OwnerPhotoEditError("Opciones de privacidad no válidas.");
  if (options.blur && (await getSiteSettings()).profile_gallery_face_blur_enabled !== "enabled") throw new OwnerPhotoEditError("El difuminado facial está desactivado temporalmente por el equipo.", 403);
  if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES) throw new OwnerPhotoEditError("Envía la foto final de hasta 10 MB.");
  const contentType = detectImageType(await file.slice(0, 16).arrayBuffer());
  if (!contentType) throw new OwnerPhotoEditError("La foto final debe ser JPEG, PNG o WebP válida.");
  const version = expectedVersion(form, `profile:${profileId}`);
  const [usage, rows] = await Promise.all([getMediaUsage(), getProfileMedia(profileId)]), bucket = await mediaBucket();
  const replacements = await pendingPhotoReplacements(rows);
  const existing = record.media.moderationStatus === "approved" ? rows.find(row => replacements.get(row.id)?.id === mediaId) : record.media;
  // An approved image stays public. The new final is a separate pending row;
  // later edits replace only that pending final, without storing an archive.
  const targetId = existing?.id ?? `med_${crypto.randomUUID()}`;
  const oldObject = existing ? await bucket.head(existing.r2Key) : null;
  const base = record.media.moderationStatus === "approved" ? record.media : replacementBase(record.media, rows, oldObject?.customMetadata?.replacesMediaId);
  const activeBytes = rows.filter(row => row.visibility === "public").reduce((sum, row) => sum + row.byteSize, 0), previousBytes = existing?.byteSize ?? 0;
  if (activeBytes - previousBytes + file.size > MAX_PROFILE_MEDIA_BYTES) throw new OwnerPhotoEditError("El anuncio superaría 45 MB. Conservamos la foto aprobada mientras se revisa la nueva versión.");
  const totalBytes = usage.bytes - previousBytes + file.size;
  if (totalBytes > MEDIA_HARD_LIMIT_BYTES) throw new OwnerPhotoEditError("La operación superaría el margen de almacenamiento.", 503);
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `profiles/${profileId}/${targetId}-edit-${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, file.stream(), { httpMetadata: { contentType, cacheControl: "private, no-store" }, customMetadata: { profileId, uploadedBy: ownerId, moderation: "pending", mediaType: "image", watermark: String(options.watermark), blur: String(options.blur), photoOptions: JSON.stringify(options), ...(base ? { replacesMediaId: base.id } : {}) } });
  const db = await getDb(); let revision = record.profile.revision;
  try {
    const fields = { r2Key: key, byteSize: file.size, contentType, moderationStatus: "pending" as const };
    const mutation = existing ? db.update(profileMedia).set(fields).where(eq(profileMedia.id, targetId)) : db.insert(profileMedia).values({ ...fields, id: targetId, profileId, mediaType: "image", visibility: "public", isProfilePhoto: record.media.isProfilePhoto, sortOrder: record.media.sortOrder });
    const result = await guardedBatch(version, [mutation, ...(existing ? [db.insert(dataDeletionJobs).values({ id: crypto.randomUUID(), r2Key: existing.r2Key }).onConflictDoNothing()] : []), db.select({ revision: profiles.revision }).from(profiles).where(eq(profiles.id, profileId))]);
    const last = result.at(-1); if (Array.isArray(last) && typeof last[0]?.revision === "number") revision = last[0].revision;
  } catch (error) { try { await bucket.delete(key); } catch { console.error("Uncommitted owner photo cleanup deferred", { mediaId: targetId }); } throw error; }
  if (existing) {
    try { await bucket.delete(existing.r2Key); await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key, existing.r2Key)); } catch { console.error("Owner photo cleanup deferred", { mediaId: targetId }); }
  }
  await createAdminNotification({ kind: "media_uploaded", actorUserId: ownerId, profileId, summary: "Se recibió una edición de foto pendiente de revisión. La foto aprobada se conserva hasta aceptar su reemplazo." });
  const replacement = { id: targetId, url: `/media/${targetId}`, mediaType: "image" as const, contentType, moderationStatus: "pending" as const, visibility: "public" as const, isProfilePhoto: record.media.isProfilePhoto, byteSize: file.size, ...(base ? { replacementOf: base.id } : {}) };
  return { ok: true, revision, mediaId, options: options as PhotoEditOptions, quota: { bytes: totalBytes, ...getMediaQuotaState(totalBytes) }, ...(targetId !== mediaId ? { replacement } : {}) };
}
