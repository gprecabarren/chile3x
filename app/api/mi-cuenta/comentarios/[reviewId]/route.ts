import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles, reviews } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers });
export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Inicia sesión para revisar tus comentarios.", 401);
  const action = (await request.formData()).get("action");
  if (!["approve", "reject", "delete"].includes(String(action))) return error("Acción no válida.", 400);
  const { reviewId } = await params;
  const db = await getDb();
  const [row] = await db.select({ status: reviews.status }).from(reviews).innerJoin(profiles, eq(profiles.id, reviews.profileId))
    .where(and(eq(reviews.id, reviewId), eq(profiles.ownerId, user.id))).limit(1);
  if (!row) return error("Comentario no encontrado.", 404);
  if ((action !== "delete" && row.status !== "pending") || !["pending", "approved"].includes(row.status)) return error("El comentario ya cambió de estado. Actualiza la página.", 409);
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "removed";
  const changed = await db.update(reviews).set({ status }).where(and(eq(reviews.id, reviewId), eq(reviews.status, row.status))).returning({ id: reviews.id });
  if (!changed.length) return error("El comentario ya cambió de estado. Actualiza la página.", 409);
  return NextResponse.redirect(new URL(`/mi-cuenta/comentarios?notice=${status}`, request.url), 303);
}
