import { and, eq, gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";
import { compactText, longText } from "@/lib/profile";
import { detectImageType, extensionForImageType } from "@/lib/media";
import { purgeExpiredImageStories } from "@/lib/stories";
import { MAX_STORY_IMAGE_BYTES, MAX_STORY_TEXT_LENGTH, storyExpiresAt } from "@/lib/story-data";

function acceptsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function response(request: Request, formData: FormData | null, notice: string, status = 200) {
  if (acceptsJson(request)) return NextResponse.json({ ok: status < 400, notice }, { status });
  const returnTo = formData?.get("return_to");
  const destination = safeAccountReturnTo(typeof returnTo === "string" ? returnTo : null);
  const url = new URL(destination, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return acceptsJson(request) ? NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }) : new Response("Solicitud no válida.", { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return acceptsJson(request) ? NextResponse.json({ error: "Ingresa para publicar historias." }, { status: 401 }) : NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return acceptsJson(request) ? NextResponse.json({ error: "La imagen supera el límite permitido para historias." }, { status: 413 }) : new Response("Archivo demasiado grande.", { status: 413 });
  }
  const profileId = compactText(formData.get("profile_id"), 80);
  const body = longText(formData.get("body"), MAX_STORY_TEXT_LENGTH);
  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;
  const storyType = hasImage ? "image" : "text" as const;
  if (!profileId || (!hasImage && body.length < 2)) return response(request, formData, "story_error", 400);

  let imageData: ArrayBuffer | null = null;
  let imageType: "image/jpeg" | "image/png" | "image/webp" | null = null;
  if (hasImage) {
    if (image.size > MAX_STORY_IMAGE_BYTES) return acceptsJson(request) ? NextResponse.json({ error: "La imagen de historia debe pesar 2 MB o menos." }, { status: 413 }) : response(request, formData, "story_error", 413);
    imageData = await image.arrayBuffer();
    imageType = detectImageType(imageData);
    if (!imageType) return response(request, formData, "story_error", 400);
  }

  await purgeExpiredImageStories();
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id), eq(profiles.status, "approved"))).limit(1);
  if (!profile) return response(request, formData, "story_error", 403);

  const activeStories = await db.select({ id: profileStatuses.id }).from(profileStatuses).where(and(eq(profileStatuses.profileId, profile.id), eq(profileStatuses.storyType, storyType), gt(profileStatuses.expiresAt, new Date().toISOString()))).limit(5);
  if (activeStories.length >= 5) return response(request, formData, "story_limit", 409);

  const id = `story_${crypto.randomUUID()}`;
  let r2Key: string | null = null;
  if (imageData && imageType) {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return response(request, formData, "story_error", 503);
    r2Key = `stories/${profile.id}/${id}.${extensionForImageType(imageType)}`;
    await env.MEDIA.put(r2Key, imageData, { httpMetadata: { contentType: imageType, cacheControl: "private, no-store" }, customMetadata: { category: "story", profileId: profile.id } });
  }
  try {
    await db.insert(profileStatuses).values({ id, profileId: profile.id, body, storyType, r2Key, contentType: imageType, byteSize: imageData?.byteLength ?? 0, expiresAt: storyExpiresAt() });
  } catch (error) {
    if (r2Key) {
      const { env } = await import("cloudflare:workers");
      await env.MEDIA?.delete(r2Key);
    }
    throw error;
  }
  return response(request, formData, "story_published", 201);
}
