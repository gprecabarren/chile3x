import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { ProfileMediaUploadError, uploadProfileMedia } from "@/lib/profile-media-upload";

export const dynamic = "force-dynamic";
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return error("No autorizado.", 401);
  if (!adminHasCapability(admin, "accounts.manage") || !adminHasCapability(admin, "media.moderate")) return error("No tienes permiso para cargar material de otras cuentas.", 403);
  const { profileId } = await params;
  const [row] = await (await getDb()).select({
    ownerId: profiles.ownerId, displayName: profiles.displayName, trashedAt: profiles.trashedAt, ownerActive: users.isActive, ownerRole: users.role,
  }).from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).where(eq(profiles.id, profileId)).limit(1);
  if (!row || row.trashedAt) return error("Anuncio no encontrado o en papelera.", 404);
  if (!row.ownerActive || row.ownerRole === "admin") return error("La cuenta propietaria no está activa o no admite anuncios.", 403);
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return error("Selecciona una foto o video para subir.", 400);
  const uploadKind = formData.get("upload_kind") === "profile_photo" ? "profile_photo" : "gallery";
  try {
    const result = await uploadProfileMedia({ profileId, file, uploadKind, uploadedBy: admin.id, moderationStatus: "approved" });
    await recordAdminAudit(admin, {
      category: "media", action: "media.public_approve", entityType: "public_media", entityId: result.media.id,
      entityLabel: `${result.media.mediaType === "video" ? "Video" : "Foto"} · ${row.displayName}`,
      summary: `Subió y aprobó ${uploadKind === "profile_photo" ? "una foto principal" : result.media.mediaType === "video" ? "un video" : "una foto"} para ${row.displayName}.`,
      after: { profileId, ownerId: row.ownerId, moderationStatus: "approved", mediaType: result.media.mediaType, byteSize: result.media.byteSize, uploadKind },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (cause) {
    if (cause instanceof ProfileMediaUploadError) return error(cause.message, cause.status);
    console.error("Admin profile media upload failed", cause);
    return error("No se pudo subir el archivo. Inténtalo nuevamente.", 500);
  }
}
