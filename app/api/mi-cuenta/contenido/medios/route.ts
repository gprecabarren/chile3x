import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { exclusiveContentMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, hasTesterAutoApproval } from "@/lib/auth";
import { getOrCreateExclusiveContentCollection } from "@/lib/exclusive-content";
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
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Ingresa para subir contenido.", 401);
  const moderationStatus = hasTesterAutoApproval(user) ? "approved" : "pending";

  const formData = await request.formData();
  const entry = formData.get("file");
  if (!entry || typeof entry === "string") return error("Selecciona una imagen o video para subir.");
  if (entry.size === 0 || entry.size > Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES)) return error("El archivo supera el máximo permitido de 8 MB.");

  const data = await entry.arrayBuffer();
  const imageType = detectImageType(data);
  const videoType = imageType ? null : detectVideoType(data);
  if (!imageType && !videoType) return error("Solo se permiten imágenes JPEG, PNG o WebP, y videos MP4 o WebM válidos.");
  const mediaType = imageType ? "image" as const : "video" as const;
  const contentType = imageType ?? videoType!;
  if (entry.size > (mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) return error(mediaType === "image" ? "Cada imagen debe pesar menos de 5 MB." : "Cada video debe pesar menos de 8 MB.");

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
  await env.MEDIA.put(r2Key, data, {
    httpMetadata: { contentType, contentDisposition: "inline", cacheControl: "private, no-store" },
    customMetadata: { collectionId: collection.id, uploadedBy: user.id, moderation: moderationStatus, mediaType, visibility: "exclusive" },
    storageClass: "Standard",
  });

  const sortOrder = existing.reduce((latest, media) => Math.max(latest, media.sortOrder), -1) + 1;
  try {
    await db.insert(exclusiveContentMedia).values({ id, collectionId: collection.id, mediaType, r2Key, byteSize: data.byteLength, contentType, moderationStatus, sortOrder });
  } catch (cause) {
    await env.MEDIA.delete(r2Key);
    throw cause;
  }
  const total = usage.bytes + data.byteLength;
  return NextResponse.json({
    media: { id, url: `/contenido/${id}`, mediaType, contentType, moderationStatus, byteSize: data.byteLength },
    quota: { bytes: total, ...getMediaQuotaState(total) },
  }, { status: 201 });
}
