import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { collaborationGuards, dataDeletionJobs, privateProfileSamples, privateSampleMedia } from "@/db/schema";
import { CollaborationConflict, guardedBatch, type ReviewVersion } from "@/lib/collaboration";
import { sampleCanEdit } from "@/lib/private-sample-policy";
import {
  detectImageType, detectVideoType, extensionForImageType, extensionForVideoType,
  getMediaUsage, getMediaQuotaState, MAX_IMAGES_PER_PROFILE, MAX_VIDEOS_PER_PROFILE,
  MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_PROFILE_MEDIA_BYTES, MEDIA_HARD_LIMIT_BYTES,
} from "@/lib/media";
import { parsePhotoEditOptions, type PhotoEditOptions } from "@/lib/photo-edit-policy";
import { validatePreparedVideo } from "@/lib/video-validation";
import { applyGalleryOrder, validGalleryOrder } from "@/lib/media-order";

export class SampleMediaError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
type Db = Awaited<ReturnType<typeof getDb>>;
type Statements = Parameters<Db["batch"]>[0][number][];

async function storage() {
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) throw new SampleMediaError("El almacenamiento no está disponible.", 503);
  return env.MEDIA;
}

export async function editableSampleMedia(sampleId: string) {
  const db = await getDb();
  const row = (await db.select().from(privateProfileSamples).where(eq(privateProfileSamples.id, sampleId)).limit(1))[0];
  if (!row) throw new SampleMediaError("La muestra ya no está disponible.", 404);
  if (!sampleCanEdit(row)) throw new SampleMediaError("Restaura la muestra desde la papelera antes de modificar sus archivos. Una muestra convertida ya no se puede editar.", 409);
  const files = await db.select().from(privateSampleMedia).where(eq(privateSampleMedia.sampleId, sampleId)).orderBy(asc(privateSampleMedia.sortOrder), asc(privateSampleMedia.id));
  return { row, files };
}

async function sampleWrite(sampleId: string, version: ReviewVersion, actorId: string, statements: Statements) {
  if (version.key !== `sample:${sampleId}`) throw new CollaborationConflict();
  const db = await getDb(), guard = crypto.randomUUID();
  // Expiry can pass while the device prepares/uploads a file, without changing
  // a revision. Check both lifecycle and the revision in the same D1 batch.
  const result = await guardedBatch(version, [
    db.insert(collaborationGuards).values({ id: guard, allowed: sql`case when exists(select 1 from private_profile_samples where id=${sampleId} and migrated_at is null and trashed_at is null and expires_at>${Date.now()}) then 1 else 0 end` }),
    ...statements,
    db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    db.select({ revision: privateProfileSamples.revision }).from(privateProfileSamples).where(eq(privateProfileSamples.id, sampleId)),
  ], actorId);
  const rows = result.at(-1);
  if (!Array.isArray(rows) || !Number.isSafeInteger(rows[0]?.revision)) throw new Error("No se pudo confirmar la revisión guardada.");
  return rows[0].revision as number;
}

async function removeUnreferenced(key: string) {
  try {
    const db = await getDb();
    const row = await db.get<{ inUse: number }>(sql`select exists(select 1 from private_sample_media where r2_key=${key}) or exists(select 1 from profile_media where r2_key=${key}) as inUse`);
    if (row?.inUse === 0) {
      // Queue before touching R2, including files whose registration failed.
      // A lost R2 response or a temporary outage must not leave an orphan.
      await db.insert(dataDeletionJobs).values({ id: crypto.randomUUID(), r2Key: key }).onConflictDoNothing();
      await (await storage()).delete(key);
      await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key, key));
    }
  } catch { console.warn("sample_media_cleanup_deferred"); }
}

async function cleanupOld(keys: string[]) {
  for (const key of keys) {
    try {
      const db = await getDb();
      await removeUnreferenced(key);
      // Keep the durable deletion job if the object still exists or storage
      // could not be inspected; an uncertain failure is not evidence of removal.
      if (!await (await storage()).head(key)) await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key, key));
    } catch { console.warn("sample_media_old_cleanup_deferred"); }
  }
}

const quota = (bytes: number) => ({ bytes, ...getMediaQuotaState(bytes) });
const fileView = (sampleId: string, file: typeof privateSampleMedia.$inferSelect) => ({
  id: file.id, url: `/muestra/${sampleId}/archivo/${file.id}`, mediaType: file.mediaType, contentType: file.contentType,
  isProfilePhoto: file.isProfilePhoto, byteSize: file.byteSize, moderationStatus: "approved" as const, visibility: "public" as const,
});
const deletion = (db: Db, key: string) => db.insert(dataDeletionJobs).values({ id: crypto.randomUUID(), r2Key: key }).onConflictDoNothing();

export async function uploadSampleMedia(input: {
  sampleId: string; file: File; uploadKind: "profile_photo" | "gallery"; actorId: string;
  version: ReviewVersion; processing?: PhotoEditOptions;
}) {
  const { sampleId, file, uploadKind, actorId, version } = input;
  const { row, files } = await editableSampleMedia(sampleId);
  if (row.revision !== version.revision) throw new CollaborationConflict();
  if (!file.size || file.size > Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES)) throw new SampleMediaError("Envía una foto final de hasta 10 MB o un video preparado de hasta 12 MB.");
  const signature = await file.slice(0, 16).arrayBuffer(), image = detectImageType(signature), video = image ? null : detectVideoType(signature);
  if (!image && !video) throw new SampleMediaError("Solo se permiten fotos JPEG, PNG o WebP y videos MP4 o WebM válidos.");
  if (uploadKind === "profile_photo" && !image) throw new SampleMediaError("La foto de perfil debe ser una imagen.");
  if (file.size > (image ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) throw new SampleMediaError(image ? "La foto final supera 10 MB." : "El video final supera 12 MB.");
  if (video) {
    try { await validatePreparedVideo(await file.arrayBuffer(), video); }
    catch (cause) { throw new SampleMediaError(cause instanceof Error ? cause.message : "El video no es compatible."); }
  }
  const kind = image ? "image" as const : "video" as const;
  if (uploadKind === "gallery" && files.filter(item => item.mediaType === kind && !item.isProfilePhoto).length >= (image ? MAX_IMAGES_PER_PROFILE : MAX_VIDEOS_PER_PROFILE)) throw new SampleMediaError(image ? "La muestra ya tiene 10 fotos de galería." : "La muestra ya tiene 3 videos.");
  const previousCovers = uploadKind === "profile_photo" ? files.filter(item => item.isProfilePhoto) : [];
  if (previousCovers.length && files.filter(item => item.mediaType === "image").length > MAX_IMAGES_PER_PROFILE) throw new SampleMediaError("Retira una foto de la galería antes de subir otra principal. La foto principal anterior se conserva en la galería y el máximo es de 10 fotos.");
  if (files.reduce((total, item) => total + item.byteSize, 0) + file.size > MAX_PROFILE_MEDIA_BYTES) throw new SampleMediaError("La muestra superaría 45 MB. Elige un archivo más liviano o retira otro.");
  const usage = await getMediaUsage();
  if (usage.bytes + file.size > MEDIA_HARD_LIMIT_BYTES) throw new SampleMediaError("La operación superaría el margen de almacenamiento.", 503);
  const bucket = await storage(), db = await getDb(), id = `smp_${crypto.randomUUID()}`;
  const contentType = image ?? video!, extension = image ? extensionForImageType(image) : extensionForVideoType(video!);
  const r2Key = `private-samples/${sampleId}/${id}.${extension}`;
  const processing = input.processing ?? { watermark: false, blur: false, faceRegions: [] };
  const media = { id, sampleId, r2Key, byteSize: file.size, contentType, mediaType: kind, isProfilePhoto: uploadKind === "profile_photo", sortOrder: files.reduce((latest, item) => Math.max(latest, item.sortOrder), -1) + 1 };
  let revision: number;
  try {
    await bucket.put(r2Key, file.stream(), { httpMetadata: { contentType, cacheControl: "private, no-store" }, customMetadata: { sampleId, uploadedBy: actorId, mediaType: kind, uploadKind, watermark: String(processing.watermark), blur: String(processing.blur), photoOptions: JSON.stringify(processing) } });
    revision = await sampleWrite(sampleId, version, actorId, [
      ...(previousCovers.length ? [db.update(privateSampleMedia).set({ isProfilePhoto: false }).where(and(eq(privateSampleMedia.sampleId, sampleId), eq(privateSampleMedia.isProfilePhoto, true)))] : []),
      db.insert(privateSampleMedia).values(media),
    ]);
  } catch (cause) { await removeUnreferenced(r2Key); throw cause; }
  return { revision, media: fileView(sampleId, media), quota: quota(usage.bytes + file.size) };
}

export async function removeSampleMedia(sampleId: string, mediaId: string, version: ReviewVersion, actorId: string) {
  const { files } = await editableSampleMedia(sampleId), file = files.find(item => item.id === mediaId);
  if (!file) throw new SampleMediaError("Archivo no disponible.", 404);
  const db = await getDb(), usage = await getMediaUsage();
  const revision = await sampleWrite(sampleId, version, actorId, [deletion(db, file.r2Key), db.delete(privateSampleMedia).where(and(eq(privateSampleMedia.id, mediaId), eq(privateSampleMedia.sampleId, sampleId)))]);
  await cleanupOld([file.r2Key]);
  return { ok: true, revision, quota: quota(Math.max(0, usage.bytes - file.byteSize)) };
}

export async function setSampleCover(sampleId: string, mediaId: string, version: ReviewVersion, actorId: string) {
  const { files } = await editableSampleMedia(sampleId), file = files.find(item => item.id === mediaId);
  if (!file || file.mediaType !== "image") throw new SampleMediaError("Elige una foto de esta muestra.");
  const db = await getDb(), usage = await getMediaUsage();
  const revision = await sampleWrite(sampleId, version, actorId, [
    db.update(privateSampleMedia).set({ isProfilePhoto: false }).where(and(eq(privateSampleMedia.sampleId, sampleId), eq(privateSampleMedia.isProfilePhoto, true))),
    db.update(privateSampleMedia).set({ isProfilePhoto: true }).where(and(eq(privateSampleMedia.id, mediaId), eq(privateSampleMedia.sampleId, sampleId))),
  ]);
  return { ok: true, revision, mediaId, quota: quota(usage.bytes) };
}

export async function reorderSampleMedia(sampleId: string, order: unknown, version: ReviewVersion, actorId: string, kind?: unknown) {
  const { files } = await editableSampleMedia(sampleId);
  if (kind !== undefined) {
    if (!validGalleryOrder(files, kind, order)) throw new SampleMediaError("El orden no coincide con los archivos actuales. Recarga la muestra.");
    order = applyGalleryOrder(files, kind as "image" | "video", order).map(file => file.id);
  }
  if (!Array.isArray(order) || order.length !== files.length || order.some(id => typeof id !== "string") || new Set(order).size !== order.length || files.some(file => !order.includes(file.id))) throw new SampleMediaError("El orden no coincide con los archivos actuales. Recarga la muestra.");
  const db = await getDb(), usage = await getMediaUsage();
  const revision = await sampleWrite(sampleId, version, actorId, order.map((id, sortOrder) => db.update(privateSampleMedia).set({ sortOrder }).where(and(eq(privateSampleMedia.id, id), eq(privateSampleMedia.sampleId, sampleId)))));
  return { ok: true, revision, order, quota: quota(usage.bytes) };
}

export async function samplePhotoState(sampleId: string, mediaId: string) {
  const { row, files } = await editableSampleMedia(sampleId), file = files.find(item => item.id === mediaId);
  if (!file || file.mediaType !== "image") throw new SampleMediaError("Foto no disponible.", 404);
  const object = await (await storage()).head(file.r2Key);
  if (!object) throw new SampleMediaError("No se encontró la foto actual.", 404);
  const options = parsePhotoEditOptions(object.customMetadata?.photoOptions);
  const watermark = options?.watermark ?? object.customMetadata?.watermark === "true", blur = options?.blur ?? object.customMetadata?.blur === "true";
  return { id: mediaId, profileId: sampleId, revision: row.revision, watermark, blur, faceRegions: options?.faceRegions ?? [], hasBase: false, lockedWatermark: watermark, lockedBlur: blur, sourceUrl: `/api/admin/muestras/${encodeURIComponent(sampleId)}/media/${encodeURIComponent(mediaId)}/procesar?source=1` };
}

export async function samplePhotoSource(sampleId: string, mediaId: string) {
  const { files } = await editableSampleMedia(sampleId), file = files.find(item => item.id === mediaId);
  if (!file || file.mediaType !== "image") throw new SampleMediaError("Foto no disponible.", 404);
  const object = await (await storage()).get(file.r2Key);
  if (!object) throw new SampleMediaError("No se encontró la foto actual.", 404);
  return { body: object.body, size: object.size, contentType: file.contentType };
}

export async function processSamplePhoto(input: { sampleId: string; mediaId: string; file: File; options: PhotoEditOptions; version: ReviewVersion; actorId: string }) {
  const { sampleId, mediaId, file, options, version, actorId } = input;
  const { row, files } = await editableSampleMedia(sampleId), previous = files.find(item => item.id === mediaId);
  if (!previous || previous.mediaType !== "image") throw new SampleMediaError("Foto no disponible.", 404);
  if (row.revision !== version.revision) throw new CollaborationConflict();
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new SampleMediaError("Envía la foto final de hasta 10 MB.");
  const contentType = detectImageType(await file.slice(0, 16).arrayBuffer());
  if (!contentType) throw new SampleMediaError("La foto final debe ser JPEG, PNG o WebP válida.");
  if (files.reduce((sum, item) => sum + item.byteSize, 0) - previous.byteSize + file.size > MAX_PROFILE_MEDIA_BYTES) throw new SampleMediaError("La muestra superaría 45 MB.");
  const usage = await getMediaUsage(), totalBytes = usage.bytes - previous.byteSize + file.size;
  if (usage.bytes + file.size > MEDIA_HARD_LIMIT_BYTES) throw new SampleMediaError("La operación superaría el margen de almacenamiento.", 503);
  const bucket = await storage(), db = await getDb(), r2Key = `private-samples/${sampleId}/${mediaId}-edit-${crypto.randomUUID()}.${extensionForImageType(contentType)}`;
  let revision: number;
  try {
    await bucket.put(r2Key, file.stream(), { httpMetadata: { contentType, cacheControl: "private, no-store" }, customMetadata: { sampleId, processedBy: actorId, mediaType: "image", watermark: String(options.watermark), blur: String(options.blur), photoOptions: JSON.stringify(options) } });
    revision = await sampleWrite(sampleId, version, actorId, [
    db.update(privateSampleMedia).set({ r2Key, byteSize: file.size, contentType }).where(and(eq(privateSampleMedia.id, mediaId), eq(privateSampleMedia.sampleId, sampleId))),
    deletion(db, previous.r2Key),
  ]); } catch (cause) { await removeUnreferenced(r2Key); throw cause; }
  await cleanupOld([previous.r2Key]);
  return { ok: true, revision, mediaId, options, quota: quota(totalBytes) };
}
