import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, hasTesterAutoApproval } from "@/lib/auth";
import { ProfileMediaUploadError, uploadProfileMedia } from "@/lib/profile-media-upload";

export const dynamic = "force-dynamic";

function error(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Ingresa para subir archivos.", 401);
  const { profileId } = await params;
  const [profile] = await (await getDb()).select({ ownerId: profiles.ownerId }).from(profiles).where(and(eq(profiles.id, profileId), isNull(profiles.trashedAt))).limit(1);
  if (!profile || profile.ownerId !== user.id) return error("No tienes permiso para administrar este material.", 403);
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return error("Selecciona una foto o video para subir.", 400);
  try {
    const result = await uploadProfileMedia({
      profileId, file, uploadKind: formData.get("upload_kind") === "profile_photo" ? "profile_photo" : "gallery",
      uploadedBy: user.id, moderationStatus: hasTesterAutoApproval(user) ? "approved" : "pending",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (cause) {
    if (cause instanceof ProfileMediaUploadError) return error(cause.message, cause.status);
    console.error("Profile media upload failed", cause);
    return error("No se pudo subir el archivo. Inténtalo nuevamente.", 500);
  }
}
