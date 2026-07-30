import { and, eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
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
  const result = await (await getDb()).update(profiles).set({
    status: "pending",
    verificationStatus: "in_review",
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(profiles.id, profileId),
    eq(profiles.ownerId, user.id),
    or(eq(profiles.status, "draft"), eq(profiles.status, "rejected")),
  )).returning({ id: profiles.id });

  return NextResponse.redirect(new URL(`/mi-cuenta?notice=${result.length ? "submitted" : "error"}`, request.url), 303);
}
