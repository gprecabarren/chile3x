import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia, users } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia, getMediaQuotaState, getMediaUsage } from "@/lib/media";

export const dynamic = "force-dynamic";
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string; mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return error("No autorizado.", 401);
  if (!adminHasCapability(admin, "accounts.manage") || !adminHasCapability(admin, "media.moderate")) return error("No tienes permiso para eliminar material de otras cuentas.", 403);
  const { profileId, mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.profileId !== profileId) return error("Archivo no encontrado en este anuncio.", 404);
  const [owner] = await (await getDb()).select({ isActive: users.isActive }).from(users).where(eq(users.id, record.profile.ownerId)).limit(1);
  if (!owner?.isActive) return error("La cuenta propietaria está deshabilitada.", 403);
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return error("El almacenamiento no está disponible.", 503);
  await env.MEDIA.delete(record.media.r2Key);
  await (await getDb()).delete(profileMedia).where(eq(profileMedia.id, mediaId));
  await recordAdminAudit(admin, {
    category: "media", action: "media.public_delete", entityType: "public_media", entityId: mediaId,
    entityLabel: `${record.media.mediaType === "video" ? "Video" : "Foto"} · ${record.profile.displayName}`,
    summary: `Eliminó ${record.media.mediaType === "video" ? "un video" : "una foto"} de ${record.profile.displayName}.`,
    before: { profileId, moderationStatus: record.media.moderationStatus, mediaType: record.media.mediaType, byteSize: record.media.byteSize },
  });
  const usage = await getMediaUsage();
  return NextResponse.json({ ok: true, quota: { ...usage, ...getMediaQuotaState(usage.bytes) } });
}
