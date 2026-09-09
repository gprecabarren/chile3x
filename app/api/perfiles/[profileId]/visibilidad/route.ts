import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const [{ profileId }, formData] = await Promise.all([params, request.formData()]);
  const action = formData.get("action");
  const requestedReturnTo = typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : "/mi-cuenta";
  const returnTo = safeAccountReturnTo(requestedReturnTo);
  if (action !== "hide" && action !== "show") return NextResponse.redirect(new URL(`${returnTo}?notice=error`, request.url), 303);
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id))).limit(1);
  if (!profile) return NextResponse.redirect(new URL("/mi-cuenta?notice=error", request.url), 303);
  await db.update(profiles).set({ ownerHiddenAt: action === "hide" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }).where(eq(profiles.id, profileId));
  const destination = new URL(returnTo, request.url);
  destination.searchParams.set("notice", action === "hide" ? "hidden" : "shown");
  return NextResponse.redirect(destination, 303);
}
