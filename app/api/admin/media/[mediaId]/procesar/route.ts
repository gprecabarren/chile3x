import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { detectImageType, findProfileMedia, getMediaUsage, getProfileMedia, MAX_IMAGE_BYTES, MAX_PROFILE_MEDIA_BYTES, MEDIA_HARD_LIMIT_BYTES } from "@/lib/media";

export const dynamic = "force-dynamic";
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return error("No autorizado.", 401);
  if (!adminHasCapability(admin, "media.moderate")) return error("No tienes permiso para procesar imágenes.", 403);
  const { mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.mediaType !== "image" || record.media.visibility !== "public") return error("Imagen pública no encontrada.", 404);
  const formData = await request.formData();
  const file = formData.get("file");
  const watermark = formData.get("watermark") === "yes";
  const blur = formData.get("blur") === "yes";
  if (!watermark && !blur) return error("Selecciona al menos una transformación.", 400);
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) return error("La imagen procesada debe pesar 5 MB o menos.", 400);
  const data = await file.arrayBuffer();
  const contentType = detectImageType(data);
  if (contentType !== "image/jpeg") return error("La imagen procesada debe ser JPEG válida.", 400);
  const [usage, allProfileMedia] = await Promise.all([getMediaUsage(), getProfileMedia(record.media.profileId)]);
  if (usage.bytes - record.media.byteSize + data.byteLength > MEDIA_HARD_LIMIT_BYTES) return error("El almacenamiento alcanzaría el límite de seguridad.", 503);
  const profileBytes = allProfileMedia.filter((item) => item.visibility === "public").reduce((total, item) => total + item.byteSize, 0);
  if (profileBytes - record.media.byteSize + data.byteLength > MAX_PROFILE_MEDIA_BYTES) return error("El anuncio superaría el límite de 45 MB de medios.", 400);
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return error("El almacenamiento no está disponible.", 503);
  const newKey = `profiles/${record.media.profileId}/${mediaId}-processed-${crypto.randomUUID()}.jpg`;
  await env.MEDIA.put(newKey, data, {
    httpMetadata: { contentType, contentDisposition: "inline", cacheControl: "private, no-store" },
    customMetadata: { profileId: record.media.profileId, processedBy: admin.id, watermark: String(watermark), blur: String(blur), mediaType: "image" },
    storageClass: "Standard",
  });
  let updated: { id: string } | undefined;
  try {
    [updated] = await (await getDb()).update(profileMedia).set({ r2Key: newKey, byteSize: data.byteLength, contentType })
      .where(and(eq(profileMedia.id, mediaId), eq(profileMedia.r2Key, record.media.r2Key))).returning({ id: profileMedia.id });
  } catch (cause) {
    await env.MEDIA.delete(newKey);
    console.error("Could not update processed image", { mediaId, cause });
    return error("No se pudo guardar la imagen procesada.", 500);
  }
  if (!updated) { await env.MEDIA.delete(newKey); return error("La imagen cambió en otra sesión. Recarga antes de procesarla de nuevo.", 409); }
  await recordAdminAudit(admin, {
    category: "media", action: "media.public_process", entityType: "public_media", entityId: mediaId,
    entityLabel: `Foto · ${record.profile.displayName}`,
    summary: `Procesó una foto de ${record.profile.displayName}${watermark ? " con marca de agua" : ""}${blur ? " y difuminado de rostros" : ""}.`,
    before: { profileId: record.media.profileId, byteSize: record.media.byteSize, moderationStatus: record.media.moderationStatus },
    after: { byteSize: data.byteLength, watermark, blur, moderationStatus: record.media.moderationStatus },
  });
  try { await env.MEDIA.delete(record.media.r2Key); }
  catch (cause) { console.error("Could not remove replaced R2 image", { mediaId, cause }); }
  return NextResponse.json({ ok: true });
}
