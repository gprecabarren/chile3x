import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { reviews } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "reviews.moderate")) return new Response("No tienes permiso para moderar reseñas.", { status: 403 });
  const { reviewId } = await params;
  const action = (await request.formData()).get("action");
  const db = await getDb();
  const [existing] = await db.select({ status: reviews.status, profileId: reviews.profileId, authorId: reviews.authorId }).from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!existing) return new Response("Reseña no encontrada.", { status: 404 });
  if (action === "delete") { await db.delete(reviews).where(eq(reviews.id, reviewId)); await recordAdminAudit(admin, { category: "reviews", action: "review.delete", summary: `Eliminó la reseña ${reviewId}.`, entityType: "review", entityId: reviewId, entityLabel: `Reseña ${reviewId}`, before: { status: existing.status }, metadata: { profileId: existing.profileId, authorId: existing.authorId } }); return NextResponse.redirect(new URL("/admin/resenas?notice=deleted", request.url), 303); }
  if (action === "approve" || action === "reject") { const nextStatus = action === "approve" ? "approved" : "rejected"; await db.update(reviews).set({ status: nextStatus }).where(eq(reviews.id, reviewId)); await recordAdminAudit(admin, { category: "reviews", action: action === "approve" ? "review.approve" : "review.reject", summary: `${action === "approve" ? "Publicó" : "Rechazó"} la reseña ${reviewId}.`, entityType: "review", entityId: reviewId, entityLabel: `Reseña ${reviewId}`, before: { status: existing.status }, after: { status: nextStatus }, metadata: { profileId: existing.profileId, authorId: existing.authorId } }); return NextResponse.redirect(new URL(`/admin/resenas?estado=${nextStatus}&notice=${nextStatus}`, request.url), 303); }
  return NextResponse.redirect(new URL("/admin/resenas?notice=error", request.url), 303);
}
