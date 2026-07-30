import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin/medios", request.url), 303);

  const { mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record) return NextResponse.redirect(new URL("/admin/medios?notice=missing", request.url), 303);

  const formData = await request.formData();
  const action = formData.get("action");
  const db = await getDb();
  if (action === "approve") {
    await db.update(profileMedia).set({ moderationStatus: "approved" }).where(eq(profileMedia.id, mediaId));
    return NextResponse.redirect(new URL("/admin/medios?notice=approved", request.url), 303);
  }

  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    await env.MEDIA.delete(record.media.r2Key);
    await db.delete(profileMedia).where(eq(profileMedia.id, mediaId));
    return NextResponse.redirect(new URL("/admin/medios?notice=deleted", request.url), 303);
  }

  return NextResponse.redirect(new URL("/admin/medios?notice=error", request.url), 303);
}
