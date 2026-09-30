import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { profileMedia } from "@/db/schema";
import {
  detectImageType, detectVideoType, extensionForImageType, extensionForVideoType,
  getMediaQuotaState, getMediaUsage, getProfileMedia, MAX_IMAGES_PER_PROFILE,
  MAX_IMAGE_BYTES, MAX_PROFILE_MEDIA_BYTES, MAX_VIDEOS_PER_PROFILE,
  MAX_VIDEO_BYTES, MEDIA_HARD_LIMIT_BYTES,
} from "@/lib/media";

export class ProfileMediaUploadError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function uploadProfileMedia(input: {
  profileId: string;
  file: File;
  uploadKind: "profile_photo" | "gallery";
  uploadedBy: string;
  moderationStatus: "pending" | "approved";
}) {
  const { profileId, file, uploadKind, uploadedBy, moderationStatus } = input;
  if (file.size === 0 || file.size > Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES)) {
    throw new ProfileMediaUploadError("El archivo supera el máximo permitido de 8 MB.");
  }
  const data = await file.arrayBuffer();
  const imageType = detectImageType(data);
  const videoType = imageType ? null : detectVideoType(data);
  if (!imageType && !videoType) throw new ProfileMediaUploadError("Solo se permiten imágenes JPEG, PNG o WebP, y videos MP4 o WebM válidos.");
  const mediaType = imageType ? "image" as const : "video" as const;
  const contentType = imageType ?? videoType!;
  if (uploadKind === "profile_photo" && mediaType !== "image") throw new ProfileMediaUploadError("La foto de perfil debe ser una imagen JPEG, PNG o WebP.");
  if (file.size > (imageType ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
    throw new ProfileMediaUploadError(imageType ? "Cada imagen debe pesar menos de 5 MB." : "Cada video debe pesar menos de 8 MB.");
  }
  const existing = await getProfileMedia(profileId);
  const activeMedia = existing.filter((item) => item.visibility === "public");
  const sameTypeCount = activeMedia.filter((item) => item.mediaType === mediaType && !item.isProfilePhoto).length;
  if (uploadKind === "gallery" && sameTypeCount >= (imageType ? MAX_IMAGES_PER_PROFILE : MAX_VIDEOS_PER_PROFILE)) {
    throw new ProfileMediaUploadError(imageType ? "Este perfil ya alcanzó el máximo de 10 imágenes de galería." : "Este perfil ya alcanzó el máximo de 3 videos de galería.");
  }
  const profileBytes = activeMedia.reduce((total, media) => total + media.byteSize, 0);
  if (profileBytes + file.size > MAX_PROFILE_MEDIA_BYTES) throw new ProfileMediaUploadError("Este perfil alcanzaría el límite de 45 MB para fotos y videos. Elige un archivo más liviano.");
  const usage = await getMediaUsage();
  if (usage.bytes + file.size > MEDIA_HARD_LIMIT_BYTES) throw new ProfileMediaUploadError("La carga está pausada para proteger la cuota gratuita de almacenamiento.", 503);
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) throw new ProfileMediaUploadError("El almacenamiento de medios aún no está disponible.", 503);
  const id = `med_${crypto.randomUUID()}`;
  const extension = imageType ? extensionForImageType(imageType) : extensionForVideoType(videoType!);
  const r2Key = `profiles/${profileId}/${id}.${extension}`;
  await env.MEDIA.put(r2Key, data, {
    httpMetadata: { contentType, contentDisposition: "inline", cacheControl: "private, no-store" },
    customMetadata: { profileId, uploadedBy, moderation: moderationStatus, mediaType, uploadKind },
    storageClass: "Standard",
  });
  const db = await getDb();
  const sortOrder = activeMedia.reduce((latest, media) => Math.max(latest, media.sortOrder), -1) + 1;
  try {
    await db.insert(profileMedia).values({ id, profileId, mediaType, r2Key, byteSize: data.byteLength, contentType, moderationStatus, visibility: "public", isProfilePhoto: uploadKind === "profile_photo", sortOrder });
    if (moderationStatus === "approved" && uploadKind === "profile_photo") {
      await db.update(profileMedia).set({ isProfilePhoto: false }).where(and(
        eq(profileMedia.profileId, profileId), eq(profileMedia.isProfilePhoto, true), eq(profileMedia.moderationStatus, "approved"),
        // The newly uploaded photo must remain the selected cover.
        ne(profileMedia.id, id),
      ));
    }
  } catch (cause) {
    await db.delete(profileMedia).where(eq(profileMedia.id, id));
    await env.MEDIA.delete(r2Key);
    throw cause;
  }
  const totalBytes = usage.bytes + data.byteLength;
  return {
    media: { id, url: `/media/${id}`, mediaType, contentType, moderationStatus, visibility: "public" as const, isProfilePhoto: uploadKind === "profile_photo", byteSize: data.byteLength },
    quota: { bytes: totalBytes, ...getMediaQuotaState(totalBytes) },
  };
}
