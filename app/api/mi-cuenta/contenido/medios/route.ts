import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { exclusiveContentMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, hasTesterAutoApproval } from "@/lib/auth";
import { getOrCreateExclusiveContentCollection } from "@/lib/exclusive-content";
import { validatePreparedVideo } from "@/lib/video-validation";
import { MediaUploadRequestError, readMediaUploadForm } from "@/lib/media-upload-form";
import { createAdminNotification } from "@/lib/admin-notifications";
import {
  detectImageType,
  detectVideoType,
  extensionForImageType,
  extensionForVideoType,
  getMediaQuotaState,
  getMediaUsage,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_HARD_LIMIT_BYTES,
} from "@/lib/media";

const MAX_EXCLUSIVE_IMAGES = 20;
const MAX_EXCLUSIVE_VIDEOS = 4;

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let stage = "validación de la solicitud";
  try {
    try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
    const user = await getCurrentUser();
    if (!user) return error("Ingresa para subir contenido.", 401);
    const moderationStatus = hasTesterAutoApproval(user) ? "approved" : "pending";

    const formData = await readMediaUploadForm(request, Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES));
    const entry = formData.get("file");
    if (!entry || typeof entry === "string") return error("Selecciona una imagen o video para subir.");
    if (entry.size === 0) return error("El archivo llegó vacío. Descarga el original en tu dispositivo y vuelve a seleccionarlo.");
    if (entry.size > Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES)) return error(`El archivo preparado supera el máximo: fotos de hasta ${MAX_IMAGE_BYTES / 1_000_000} MB y videos de hasta ${MAX_VIDEO_BYTES / 1_000_000} MB.`);

    const data = await entry.arrayBuffer();
    const imageType = detectImageType(data);
    const videoType = imageType ? null : detectVideoType(data);
    if (!imageType && !videoType) return error("Solo se permiten imágenes JPEG, PNG o WebP, y videos MP4 o WebM válidos.");
    const mediaType = imageType ? "image" as const : "video" as const;
    const contentType = imageType ?? videoType!;
    if (entry.size > (mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) return error(mediaType === "image" ? `Cada imagen debe pesar como máximo ${MAX_IMAGE_BYTES / 1_000_000} MB.` : `Cada video debe pesar como máximo ${MAX_VIDEO_BYTES / 1_000_000} MB.`);
    if (videoType) {
      try { await validatePreparedVideo(data, videoType); }
      catch (cause) { return error(cause instanceof Error ? cause.message : "No se pudo validar el video."); }
    }

    const db = await getDb();
    const collection = await getOrCreateExclusiveContentCollection(user.id);
    const existing = await db.select().from(exclusiveContentMedia).where(eq(exclusiveContentMedia.collectionId, collection.id)).orderBy(asc(exclusiveContentMedia.sortOrder));
    const limit = mediaType === "image" ? MAX_EXCLUSIVE_IMAGES : MAX_EXCLUSIVE_VIDEOS;
    if (existing.filter((media) => media.mediaType === mediaType).length >= limit) return error(mediaType === "image" ? "Tu contenido exclusivo ya alcanzó el máximo de 20 imágenes." : "Tu contenido exclusivo ya alcanzó el máximo de 4 videos.");

    const usage = await getMediaUsage();
    if (usage.bytes + data.byteLength > MEDIA_HARD_LIMIT_BYTES) return error("La carga está pausada para proteger la cuota gratuita de almacenamiento.", 503);
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return error("El almacenamiento de medios aún no está disponible.", 503);

    const id = `ecm_${crypto.randomUUID()}`;
    const extension = imageType ? extensionForImageType(imageType) : extensionForVideoType(videoType!);
    const r2Key = `content/${collection.id}/${id}.${extension}`;
    stage = "guardado del archivo en el almacenamiento";
    await env.MEDIA.put(r2Key, data, {
      httpMetadata: { contentType, contentDisposition: "inline", cacheControl: "private, no-store" },
      customMetadata: { collectionId: collection.id, uploadedBy: user.id, moderation: moderationStatus, mediaType, visibility: "exclusive" },
      storageClass: "Standard",
    });

    const sortOrder = existing.reduce((latest, media) => Math.max(latest, media.sortOrder), -1) + 1;
    stage = "registro del archivo en la biblioteca privada";
    try {
      await db.insert(exclusiveContentMedia).values({ id, collectionId: collection.id, mediaType, r2Key, byteSize: data.byteLength, contentType, moderationStatus, sortOrder });
    } catch (cause) {
      if (cause instanceof MediaUploadRequestError) return error(cause.message, cause.status);
      await env.MEDIA.delete(r2Key);
      throw cause;
    }
    const total = usage.bytes + data.byteLength;
    if (moderationStatus === "pending") await createAdminNotification({ kind: "media_uploaded", actorUserId: user.id, profileId: collection.profileId, summary: `Se recibió ${mediaType === "video" ? "un video" : "una foto"} de contenido exclusivo pendiente de moderación.` });
    return NextResponse.json({
      media: { id, url: `/contenido/${id}`, mediaType, contentType, moderationStatus, byteSize: data.byteLength },
      quota: { bytes: total, ...getMediaQuotaState(total) },
    }, { status: 201 });
  } catch (cause) {
    const reference = `CARGA-${crypto.randomUUID().slice(0,8)}`;
    console.error("Exclusive media upload failed", { stage, reference, cause });
    return error(`Falló el paso de ${stage}. No se confirmó la carga. Código de soporte: ${reference}.`, 500);
  }
}
