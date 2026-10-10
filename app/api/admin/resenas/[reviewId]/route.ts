import { and, eq, inArray } from "drizzle-orm";
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
  if (!adminHasCapability(admin, "reviews.moderate")) return new Response("No tienes permiso para gestionar reseñas.", { status: 403 });
  const form = await request.formData();
  // Administration can remove a review, never approve or reject for the owner.
  if (form.get("action") !== "delete") return new Response("Solo la persona propietaria del anuncio puede aprobar o rechazar comentarios.", { status: 403 });
  const { reviewId } = await params;
  const changed = await (await getDb()).update(reviews).set({ status: "removed" })
    .where(and(eq(reviews.id, reviewId), inArray(reviews.status, ["pending", "approved"])))
    .returning({ profileId: reviews.profileId, authorId: reviews.authorId });
  if (!changed.length) return new Response("Comentario no encontrado o ya retirado.", { status: 404 });
  await recordAdminAudit(admin, { category: "reviews", action: "review.delete", summary: `Eliminó la reseña ${reviewId}.`, entityType: "review", entityId: reviewId, entityLabel: `Reseña ${reviewId}`, after: { status: "removed" }, metadata: changed[0] });
  return NextResponse.redirect(new URL(`/admin/resenas?perfil=${encodeURIComponent(changed[0].profileId)}&notice=deleted`, request.url), 303);
}
