import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { exclusiveContentMedia } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { findExclusiveContentMedia } from "@/lib/exclusive-content";
import { getMediaQuotaState, getMediaUsage } from "@/lib/media";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingresa para administrar contenido." }, { status: 401 });
  const { mediaId } = await params;
  const record = await findExclusiveContentMedia(mediaId);
  if (!record || record.collection.ownerId !== user.id) return NextResponse.json({ error: "No tienes permiso para eliminar este archivo." }, { status: 403 });
  const { env } = await import("cloudflare:workers");
  if (env.MEDIA) await env.MEDIA.delete(record.media.r2Key);
  await (await getDb()).delete(exclusiveContentMedia).where(and(
    eq(exclusiveContentMedia.id, mediaId),
    eq(exclusiveContentMedia.collectionId, record.collection.id),
  ));
  const usage = await getMediaUsage();
  return NextResponse.json({ ok: true, quota: { bytes: usage.bytes, ...getMediaQuotaState(usage.bytes) } });
}
