import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, hasTesterAutoApproval } from "@/lib/auth";
import {
  detectImageType,
  detectVideoType,
  extensionForImageType,
  extensionForVideoType,
  getMediaQuotaState,
  getMediaUsage,
  getProfileMedia,
  MAX_IMAGES_PER_PROFILE,
  MAX_IMAGE_BYTES,
  MAX_PROFILE_MEDIA_BYTES,
  MAX_VIDEOS_PER_PROFILE,
  MAX_VIDEO_BYTES,
  MEDIA_HARD_LIMIT_BYTES,
} from "@/lib/media";

export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return error("Solicitud no válida.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return error("Ingresa para subir archivos.", 401);
  const moderationStatus = hasTesterAutoApproval(user) ? "approved" : "pending";

  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerId: profiles.ownerId })
    .from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile || profile.ownerId !== user.id) return error("No tienes permiso para administrar este material.", 403);

  const formData = await request.formData();
  const entry = formData.get("file");
  const uploadKindInput = formData.get("upload_kind");
  const uploadKind = uploadKindInput === "profile_photo" ? "profile_photo" : "gallery";
  if (!entry || typeof entry === "string") return error("Selecciona una foto o video para subir.", 400);
  // Reject oversized bodies before copying the file into Worker memory.
  if (entry.size === 0 || entry.size > Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES)) {
    return error("El archivo supera el máximo permitido de 8 MB.", 400);
  }

  const data = await entry.arrayBuffer();
  const imageType = detectImageType(data);
  const videoType = imageType ? null : detectVideoType(data);
  if (!imageType && !videoType) return error("Solo se permiten imágenes JPEG, PNG o WebP, y videos MP4 o WebM válidos.", 400);

  const mediaType = imageType ? "image" as const : "video" as const;
  const contentType = imageType ?? videoType!;
  if (uploadKind === "profile_photo" && mediaType !== "image") return error("La foto de perfil debe ser una imagen JPEG, PNG o WebP.", 400);
  const maxBytes = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (entry.size > maxBytes) return error(mediaType === "image" ? "Cada imagen debe pesar menos de 5 MB." : "Cada video debe pesar menos de 8 MB.", 400);

  const existing = await getProfileMedia(profileId);
  const activeMedia = existing.filter((item) => item.visibility === "public");
  const sameTypeCount = activeMedia.filter((item) => item.mediaType === mediaType && !item.isProfilePhoto).length;
  const sameTypeLimit = mediaType === "image" ? MAX_IMAGES_PER_PROFILE : MAX_VIDEOS_PER_PROFILE;
  if (uploadKind !== "profile_photo" && sameTypeCount >= sameTypeLimit) return error(mediaType === "image" ? "Este perfil ya alcanzó el máximo de 10 imágenes de galería." : "Este perfil ya alcanzó el máximo de 3 videos de galería.", 400);

  const profileBytes = activeMedia.reduce((total, media) => total + media.byteSize, 0);
  if (profileBytes + entry.size > MAX_PROFILE_MEDIA_BYTES) return error("Este perfil alcanzaría el límite de 45 MB para fotos y videos. Elige un archivo más liviano.", 400);

  const usage = await getMediaUsage();
  if (usage.bytes + entry.size > MEDIA_HARD_LIMIT_BYTES) return error("La carga está pausada para proteger la cuota gratuita de almacenamiento.", 503);

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return error("El almacenamiento de medios aún no está disponible.", 503);

  const id = `med_${crypto.randomUUID()}`;
  const extension = imageType ? extensionForImageType(imageType) : extensionForVideoType(videoType!);
  const r2Key = `profiles/${profileId}/${id}.${extension}`;
  await env.MEDIA.put(r2Key, data, {
    httpMetadata: { contentType, contentDisposition: "inline", cacheControl: "private, no-store" },
    customMetadata: { profileId, uploadedBy: user.id, moderation: moderationStatus, mediaType, uploadKind },
    storageClass: "Standard",
  });

  const sortOrder = activeMedia.reduce((latest, media) => Math.max(latest, media.sortOrder), -1) + 1;
  try {
    if (moderationStatus === "approved" && uploadKind === "profile_photo") {
      await db.update(profileMedia).set({ isProfilePhoto: false }).where(and(
        eq(profileMedia.profileId, profileId),
        eq(profileMedia.isProfilePhoto, true),
        eq(profileMedia.moderationStatus, "approved"),
      ));
    }
    await db.insert(profileMedia).values({ id, profileId, mediaType, r2Key, byteSize: data.byteLength, contentType, moderationStatus, visibility: "public", isProfilePhoto: uploadKind === "profile_photo", sortOrder });
  } catch (cause) {
    await env.MEDIA.delete(r2Key);
    throw cause;
  }

  const totalBytes = usage.bytes + data.byteLength;
  return NextResponse.json({
    media: { id, url: `/media/${id}`, mediaType, contentType, moderationStatus, visibility: "public", isProfilePhoto: uploadKind === "profile_photo", byteSize: data.byteLength },
    quota: { bytes: totalBytes, ...getMediaQuotaState(totalBytes) },
  }, { status: 201 });
}
