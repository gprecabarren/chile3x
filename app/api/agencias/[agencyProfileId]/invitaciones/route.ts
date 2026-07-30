import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { agencyMembershipRequests, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ agencyProfileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const { agencyProfileId } = await params;
  const formData = await request.formData();
  const escortValue = formData.get("escort_profile_id");
  const messageValue = formData.get("message");
  const escortProfileId = typeof escortValue === "string" ? escortValue : "";
  const message = typeof messageValue === "string" ? messageValue.trim().slice(0, 240) : null;
  const db = await getDb();
  const [[agency], [escort]] = await Promise.all([
    db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, agencyProfileId), eq(profiles.ownerId, user.id), eq(profiles.type, "agency"))).limit(1),
    db.select({ id: profiles.id, ownerId: profiles.ownerId }).from(profiles).where(and(eq(profiles.id, escortProfileId), eq(profiles.type, "escort"), eq(profiles.status, "approved"))).limit(1),
  ]);
  if (!agency || !escort || agencyProfileId === escortProfileId) return NextResponse.redirect(new URL("/mi-cuenta?notice=invite_error", request.url), 303);
  await db.insert(agencyMembershipRequests).values({
    id: `amr_${crypto.randomUUID()}`,
    agencyProfileId,
    escortProfileId,
    requestedBy: user.id,
    status: "pending",
    message: message || null,
  }).onConflictDoUpdate({
    target: [agencyMembershipRequests.agencyProfileId, agencyMembershipRequests.escortProfileId],
    set: { status: "pending", requestedBy: user.id, message: message || null, respondedAt: null },
  });
  return NextResponse.redirect(new URL("/mi-cuenta?notice=invite_sent", request.url), 303);
}
