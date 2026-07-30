import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { agencyMembers, agencyMembershipRequests, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const { requestId } = await params;
  const action = (await request.formData()).get("action");
  if (action !== "accepted" && action !== "declined") return NextResponse.redirect(new URL("/mi-cuenta?notice=invite_error", request.url), 303);
  const db = await getDb();
  const [requestRecord] = await db.select({ request: agencyMembershipRequests, ownerId: profiles.ownerId }).from(agencyMembershipRequests)
    .innerJoin(profiles, eq(agencyMembershipRequests.escortProfileId, profiles.id))
    .where(and(eq(agencyMembershipRequests.id, requestId), eq(agencyMembershipRequests.status, "pending"), eq(profiles.ownerId, user.id))).limit(1);
  if (!requestRecord) return NextResponse.redirect(new URL("/mi-cuenta?notice=invite_error", request.url), 303);
  const updated = await db.update(agencyMembershipRequests).set({ status: action, respondedAt: new Date().toISOString() })
    .where(and(eq(agencyMembershipRequests.id, requestId), eq(agencyMembershipRequests.status, "pending"))).returning({ id: agencyMembershipRequests.id });
  if (action === "accepted" && updated.length) {
    await db.insert(agencyMembers).values({ id: `agm_${crypto.randomUUID()}`, agencyProfileId: requestRecord.request.agencyProfileId, memberProfileId: requestRecord.request.escortProfileId }).onConflictDoNothing();
  }
  return NextResponse.redirect(new URL(`/mi-cuenta?notice=${action === "accepted" ? "invite_accepted" : "invite_declined"}`, request.url), 303);
}
