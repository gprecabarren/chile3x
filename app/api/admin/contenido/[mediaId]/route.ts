import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { exclusiveContentMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findExclusiveContentMedia } from "@/lib/exclusive-content";

function destination(request: NextRequest, formData: FormData, notice: string) {
  const requested = String(formData.get("return_to") ?? "");
  const path = requested.startsWith("/admin/medios") ? requested : "/admin/medios";
  const url = new URL(path, request.url); url.searchParams.set("notice", notice); return url;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  if (!await getCurrentAdmin()) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin/medios", request.url), 303);
  const { mediaId } = await params;
  const formData = await request.formData();
  const record = await findExclusiveContentMedia(mediaId);
  if (!record) return NextResponse.redirect(destination(request, formData, "missing"), 303);
  const db = await getDb();
  const action = formData.get("action");
  if (action === "approve") {
    await db.update(exclusiveContentMedia).set({ moderationStatus: "approved" }).where(eq(exclusiveContentMedia.id, mediaId));
    return NextResponse.redirect(destination(request, formData, "approved"), 303);
  }
  if (action === "unapprove") {
    await db.update(exclusiveContentMedia).set({ moderationStatus: "pending" }).where(eq(exclusiveContentMedia.id, mediaId));
    return NextResponse.redirect(destination(request, formData, "unapproved"), 303);
  }
  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    await env.MEDIA.delete(record.media.r2Key);
    await db.delete(exclusiveContentMedia).where(eq(exclusiveContentMedia.id, mediaId));
    return NextResponse.redirect(destination(request, formData, "deleted"), 303);
  }
  return NextResponse.redirect(destination(request, formData, "error"), 303);
}
