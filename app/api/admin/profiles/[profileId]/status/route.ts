import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const allowedStatuses = new Set(["draft", "pending", "approved", "paused", "rejected", "expired"]);
const allowedVerification = new Set(["unreviewed", "in_review", "reviewed"]);
const allowedHealthReview = new Set(["not_requested", "in_review", "reviewed"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  if (!await getCurrentAdmin()) {
    return new Response("No autorizado.", { status: 401 });
  }

  const formData = await request.formData();
  const status = formData.get("status");
  const verificationStatus = formData.get("verification_status");
  const healthReviewStatus = formData.get("health_review_status");
  const { profileId } = await params;

  if (typeof status !== "string" || typeof verificationStatus !== "string" || typeof healthReviewStatus !== "string" || !allowedStatuses.has(status) || !allowedVerification.has(verificationStatus) || !allowedHealthReview.has(healthReviewStatus)) {
    return new Response("Estado no válido.", { status: 400 });
  }

  await (await getDb()).update(profiles).set({
    status: status as typeof profiles.$inferInsert.status,
    verificationStatus: verificationStatus as typeof profiles.$inferInsert.verificationStatus,
    healthReviewStatus: healthReviewStatus as typeof profiles.$inferInsert.healthReviewStatus,
    updatedAt: new Date().toISOString(),
  }).where(eq(profiles.id, profileId));

  return NextResponse.redirect(new URL("/admin/perfiles", request.url), 303);
}
