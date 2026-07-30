import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { agencyMembers, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const { membershipId } = await params;
  const db = await getDb();
  const [membership] = await db.select({ membership: agencyMembers, agencyOwnerId: profiles.ownerId }).from(agencyMembers)
    .innerJoin(profiles, eq(agencyMembers.agencyProfileId, profiles.id)).where(eq(agencyMembers.id, membershipId)).limit(1);
  if (!membership) return NextResponse.redirect(new URL("/mi-cuenta?notice=invite_error", request.url), 303);
  const [memberProfile] = await db.select({ ownerId: profiles.ownerId }).from(profiles).where(eq(profiles.id, membership.membership.memberProfileId)).limit(1);
  if (membership.agencyOwnerId !== user.id && memberProfile?.ownerId !== user.id) return new Response("No autorizado.", { status: 401 });
  await db.delete(agencyMembers).where(eq(agencyMembers.id, membershipId));
  return NextResponse.redirect(new URL("/mi-cuenta?notice=membership_removed", request.url), 303);
}
