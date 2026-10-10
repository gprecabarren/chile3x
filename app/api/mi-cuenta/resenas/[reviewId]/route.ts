import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { reviews } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

async function withdraw(request: NextRequest, params: Promise<{ reviewId: string }>) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403, headers }); }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para retirar tu reseña." }, { status: 401, headers });
  const { reviewId } = await params;
  const db = await getDb();
  // One conditional write: an approval racing with withdrawal cannot be undone.
  const changed = await db.update(reviews).set({ status: "withdrawn" })
    .where(and(eq(reviews.id, reviewId), eq(reviews.authorId, user.id), eq(reviews.status, "pending"))).returning({ id: reviews.id });
  if (!changed.length) {
    const [own] = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.id, reviewId), eq(reviews.authorId, user.id))).limit(1);
    return NextResponse.json({ error: own ? "La reseña ya no está pendiente. Actualiza la página." : "Reseña no encontrada." }, { status: own ? 409 : 404, headers });
  }
  return NextResponse.json({ message: "Reseña retirada. Ya no podrá publicarse." }, { headers });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) { return withdraw(request, params); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const result = await withdraw(request, params);
  return result.ok ? NextResponse.redirect(new URL("/mi-cuenta/comentarios?notice=withdrawn", request.url), 303) : result;
}
