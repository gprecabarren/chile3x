import { and, eq, gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { compactText, longText } from "@/lib/profile";
import { storyExpiresAt } from "@/lib/stories";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  }

  const formData = await request.formData();
  const profileId = compactText(formData.get("profile_id"), 80);
  const body = longText(formData.get("body"), 180);
  if (!profileId || body.length < 2) {
    return NextResponse.redirect(new URL("/mi-cuenta?notice=story_error", request.url), 303);
  }

  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(
    eq(profiles.id, profileId),
    eq(profiles.ownerId, user.id),
    eq(profiles.type, "escort"),
    eq(profiles.status, "approved"),
  )).limit(1);
  if (!profile) {
    return NextResponse.redirect(new URL("/mi-cuenta?notice=story_error", request.url), 303);
  }

  const activeStories = await db.select({ id: profileStatuses.id }).from(profileStatuses).where(and(
    eq(profileStatuses.profileId, profile.id),
    gt(profileStatuses.expiresAt, new Date().toISOString()),
  )).limit(5);
  if (activeStories.length >= 5) {
    return NextResponse.redirect(new URL("/mi-cuenta?notice=story_limit", request.url), 303);
  }

  await db.insert(profileStatuses).values({
    id: `story_${crypto.randomUUID()}`,
    profileId: profile.id,
    body,
    expiresAt: storyExpiresAt(),
  });
  return NextResponse.redirect(new URL("/mi-cuenta?notice=story_published", request.url), 303);
}
