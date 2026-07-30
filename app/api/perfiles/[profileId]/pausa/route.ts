import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { listingPeriods, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  }
  const { profileId } = await params;
  const action = (await request.formData()).get("action");
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, status: profiles.status }).from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id))).limit(1);
  const [period] = await db.select().from(listingPeriods).where(eq(listingPeriods.profileId, profileId)).orderBy(desc(listingPeriods.createdAt)).limit(1);

  if (!profile || !period) {
    return NextResponse.redirect(new URL("/mi-cuenta?notice=error", request.url), 303);
  }

  const now = new Date();
  if (action === "pause" && profile.status === "approved" && period.status === "active" && period.pauseCount < 2) {
    await db.update(listingPeriods).set({ status: "paused", pausedAt: now.toISOString(), pauseCount: period.pauseCount + 1 }).where(eq(listingPeriods.id, period.id));
    await db.update(profiles).set({ status: "paused", updatedAt: now.toISOString() }).where(eq(profiles.id, profile.id));
    return NextResponse.redirect(new URL("/mi-cuenta?notice=paused", request.url), 303);
  }

  if (action === "resume" && profile.status === "paused" && period.status === "paused" && period.pausedAt) {
    const pausedAt = new Date(period.pausedAt).getTime();
    const oldEnd = new Date(period.endsAt).getTime();
    const pauseDuration = Number.isFinite(pausedAt) ? Math.max(0, now.getTime() - pausedAt) : 0;
    await db.update(listingPeriods).set({ status: "active", pausedAt: null, endsAt: new Date(oldEnd + pauseDuration).toISOString() }).where(eq(listingPeriods.id, period.id));
    await db.update(profiles).set({ status: "pending", verificationStatus: "in_review", updatedAt: now.toISOString() }).where(eq(profiles.id, profile.id));
    return NextResponse.redirect(new URL("/mi-cuenta?notice=resumed", request.url), 303);
  }

  return NextResponse.redirect(new URL("/mi-cuenta?notice=error", request.url), 303);
}
