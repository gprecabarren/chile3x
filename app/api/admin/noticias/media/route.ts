import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { newsMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { detectImageType, extensionForImageType, MAX_IMAGE_BYTES } from "@/lib/media";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }); }
  const admin = await getCurrentAdmin(); if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Selecciona una imagen de hasta 5 MB." }, { status: 400 });
  const bytes = await file.arrayBuffer(); const contentType = detectImageType(bytes); if (!contentType) return NextResponse.json({ error: "Solo se permiten imágenes JPEG, PNG o WebP válidas." }, { status: 400 });
  const { env } = await import("cloudflare:workers"); if (!env.MEDIA) return NextResponse.json({ error: "R2 no está disponible." }, { status: 503 });
  const id = `news_media_${crypto.randomUUID()}`; const r2Key = `news/${id}.${extensionForImageType(contentType)}`;
  await env.MEDIA.put(r2Key, bytes, { httpMetadata: { contentType, contentDisposition: "inline", cacheControl: "public, max-age=86400" }, customMetadata: { uploadedBy: admin.id, purpose: "news" } });
  try { await (await getDb()).insert(newsMedia).values({ id, r2Key, byteSize: bytes.byteLength, contentType, uploadedBy: admin.id }); } catch (cause) { await env.MEDIA.delete(r2Key); throw cause; }
  return NextResponse.json({ id, url: `/noticias/media/${id}` }, { status: 201 });
}
