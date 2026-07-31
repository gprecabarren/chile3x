import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado.", { status: 401 });
  const [{ storyId }, formData] = await Promise.all([params, request.formData()]);
  const db = await getDb();
  const [row] = await db.select({ story: profileStatuses, profile: profiles }).from(profileStatuses).innerJoin(profiles, eq(profileStatuses.profileId, profiles.id)).where(and(eq(profileStatuses.id, storyId), eq(profiles.ownerId, user.id))).limit(1);
  if (!row) return new Response("No encontrado.", { status: 404 });
  await db.delete(profileStatuses).where(eq(profileStatuses.id, storyId));
  if (row.story.r2Key) {
    const { env } = await import("cloudflare:workers");
    await env.MEDIA?.delete(row.story.r2Key);
  }
  const destination = safeAccountReturnTo(typeof formData.get("return_to") === "string" ? formData.get("return_to") : null);
  return NextResponse.redirect(new URL(destination, request.url), 303);
}
