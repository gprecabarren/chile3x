import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

function destination(request: NextRequest, formData: FormData, notice: string) {
  const requested = String(formData.get("return_to") ?? "");
  const path = requested.startsWith("/admin/medios") ? requested : "/admin/medios";
  const url = new URL(path, request.url);
  url.searchParams.set("notice", notice);
  return url;
}

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
  const formData = await request.formData();
  if (!record) return NextResponse.redirect(destination(request, formData, "missing"), 303);
  const action = formData.get("action");
  const db = await getDb();
  if (action === "approve") {
    if (record.media.isProfilePhoto) {
      await db.update(profileMedia).set({ isProfilePhoto: false }).where(and(
        eq(profileMedia.profileId, record.media.profileId),
        eq(profileMedia.isProfilePhoto, true),
        ne(profileMedia.id, mediaId),
        eq(profileMedia.moderationStatus, "approved"),
      ));
    }
    await db.update(profileMedia).set({ moderationStatus: "approved" }).where(eq(profileMedia.id, mediaId));
    return NextResponse.redirect(destination(request, formData, "approved"), 303);
  }

  if (action === "unapprove") {
    await db.update(profileMedia).set({ moderationStatus: "pending" }).where(eq(profileMedia.id, mediaId));
    return NextResponse.redirect(destination(request, formData, "unapproved"), 303);
  }

  if (action === "delete") {
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
    await env.MEDIA.delete(record.media.r2Key);
    await db.delete(profileMedia).where(eq(profileMedia.id, mediaId));
    return NextResponse.redirect(destination(request, formData, "deleted"), 303);
  }

  return NextResponse.redirect(destination(request, formData, "error"), 303);
}
