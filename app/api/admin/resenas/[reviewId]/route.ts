import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { reviews } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  if (!await getCurrentAdmin()) return new Response("No autorizado.", { status: 401 });
  const { reviewId } = await params;
  const action = (await request.formData()).get("action");
  const db = await getDb();
  if (action === "delete") { await db.delete(reviews).where(eq(reviews.id, reviewId)); return NextResponse.redirect(new URL("/admin/resenas?notice=deleted", request.url), 303); }
  if (action === "approve" || action === "reject") { await db.update(reviews).set({ status: action === "approve" ? "approved" : "rejected" }).where(eq(reviews.id, reviewId)); return NextResponse.redirect(new URL(`/admin/resenas?estado=${action === "approve" ? "approved" : "rejected"}&notice=${action === "approve" ? "approved" : "rejected"}`, request.url), 303); }
  return NextResponse.redirect(new URL("/admin/resenas?notice=error", request.url), 303);
}
