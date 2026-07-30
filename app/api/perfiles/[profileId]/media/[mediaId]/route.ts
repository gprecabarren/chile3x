import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { findProfileMedia, getMediaQuotaState, getMediaUsage } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string; mediaId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingresa para administrar fotos." }, { status: 401 });

  const { profileId, mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.profileId !== profileId || record.profile.ownerId !== user.id) {
    return NextResponse.json({ error: "No tienes permiso para eliminar esta foto." }, { status: 403 });
  }

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return NextResponse.json({ error: "El almacenamiento no está disponible." }, { status: 503 });

  await env.MEDIA.delete(record.media.r2Key);
  await (await getDb()).delete(profileMedia).where(eq(profileMedia.id, mediaId));
  const usage = await getMediaUsage();
  return NextResponse.json({ ok: true, quota: { ...usage, ...getMediaQuotaState(usage.bytes) } });
}
