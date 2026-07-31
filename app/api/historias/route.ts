import { and, eq, gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";
import { compactText, longText } from "@/lib/profile";
import { detectImageType, extensionForImageType, MAX_IMAGE_BYTES } from "@/lib/media";
import { storyExpiresAt } from "@/lib/stories";

function returnTo(request: Request, formData: FormData, notice: string) {
  const url = new URL(safeAccountReturnTo(typeof formData.get("return_to") === "string" ? formData.get("return_to") : null), request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);

  const formData = await request.formData();
  const profileId = compactText(formData.get("profile_id"), 80);
  const body = longText(formData.get("body"), 180);
  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;
  const storyType = hasImage ? "image" : "text" as const;
  if (!profileId || (!hasImage && body.length < 2)) return returnTo(request, formData, "story_error");

  let imageData: ArrayBuffer | null = null;
  let imageType: "image/jpeg" | "image/png" | "image/webp" | null = null;
  if (hasImage) {
    if (image.size > MAX_IMAGE_BYTES) return returnTo(request, formData, "story_error");
    imageData = await image.arrayBuffer();
    imageType = detectImageType(imageData);
    if (!imageType) return returnTo(request, formData, "story_error");
  }

  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(
    eq(profiles.id, profileId),
    eq(profiles.ownerId, user.id),
    eq(profiles.status, "approved"),
  )).limit(1);
  if (!profile) return returnTo(request, formData, "story_error");

  const activeStories = await db.select({ id: profileStatuses.id }).from(profileStatuses).where(and(
    eq(profileStatuses.profileId, profile.id),
    eq(profileStatuses.storyType, storyType),
    gt(profileStatuses.expiresAt, new Date().toISOString()),
  )).limit(5);
  if (activeStories.length >= 5) return returnTo(request, formData, "story_limit");

  const id = `story_${crypto.randomUUID()}`;
  let r2Key: string | null = null;
  if (imageData && imageType) {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return returnTo(request, formData, "story_error");
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
  return returnTo(request, formData, "story_published");
}
