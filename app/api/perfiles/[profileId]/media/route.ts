import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import {
  detectImageType,
  extensionForImageType,
  getMediaQuotaState,
  getMediaUsage,
  getProfileMedia,
  MAX_IMAGES_PER_PROFILE,
  MAX_IMAGE_BYTES,
  MAX_PROFILE_MEDIA_BYTES,
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
  if (!user) return error("Ingresa para subir fotos.", 401);

  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerId: profiles.ownerId })
    .from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile || profile.ownerId !== user.id) return error("No tienes permiso para administrar estas fotos.", 403);

  const formData = await request.formData();
  const entry = formData.get("file");
  if (!entry || typeof entry === "string") return error("Selecciona una imagen para subir.", 400);
  if (entry.size === 0 || entry.size > MAX_IMAGE_BYTES) {
    return error("Cada imagen debe pesar menos de 5 MB.", 400);
  }

  const existing = await getProfileMedia(profileId);
  if (existing.length >= MAX_IMAGES_PER_PROFILE) {
    return error("Este perfil ya alcanzó el máximo de 10 imágenes.", 400);
  }

  const profileBytes = existing.reduce((total, media) => total + media.byteSize, 0);
  if (profileBytes + entry.size > MAX_PROFILE_MEDIA_BYTES) {
    return error("Este perfil alcanzaría su límite de 25 MB en fotos. Elige una imagen más liviana.", 400);
  }

  const usage = await getMediaUsage();
  if (usage.bytes + entry.size > MEDIA_HARD_LIMIT_BYTES) {
    return error("La carga está pausada para proteger la cuota gratuita de almacenamiento.", 503);
  }

  const data = await entry.arrayBuffer();
  const contentType = detectImageType(data);
  if (!contentType) {
    return error("Solo se permiten imágenes JPEG, PNG o WebP válidas.", 400);
  }

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return error("El almacenamiento de fotos aún no está disponible.", 503);

  const id = `med_${crypto.randomUUID()}`;
  const r2Key = `profiles/${profileId}/${id}.${extensionForImageType(contentType)}`;
  await env.MEDIA.put(r2Key, data, {
    httpMetadata: {
      contentType,
      contentDisposition: "inline",
      cacheControl: "private, no-store",
    },
    customMetadata: {
      profileId,
      uploadedBy: user.id,
      moderation: "pending",
    },
    storageClass: "Standard",
  });

  const sortOrder = existing.reduce((latest, media) => Math.max(latest, media.sortOrder), -1) + 1;
  try {
    await db.insert(profileMedia).values({
      id,
      profileId,
      mediaType: "image",
      r2Key,
      byteSize: data.byteLength,
      contentType,
      moderationStatus: "pending",
      sortOrder,
    });
  } catch (cause) {
    await env.MEDIA.delete(r2Key);
    throw cause;
  }

  const totalBytes = usage.bytes + data.byteLength;
  return NextResponse.json({
    media: { id, url: `/media/${id}`, moderationStatus: "pending", byteSize: data.byteLength },
    quota: { bytes: totalBytes, ...getMediaQuotaState(totalBytes) },
  }, { status: 201 });
}
