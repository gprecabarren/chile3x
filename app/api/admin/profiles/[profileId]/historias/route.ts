import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { getMediaUsage, MEDIA_HARD_LIMIT_BYTES } from "@/lib/media";
import { purgeExpiredImageStories } from "@/lib/stories";
import { storyExpiresAt, storyLimitForType } from "@/lib/story-data";
import { readStoryUpload, StoryUploadError } from "@/lib/story-upload";

async function handleStoryRequest(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return error("No autorizado.", 401);
  if (!adminHasCapability(admin, "profiles.moderate")) return error("No tienes permiso para administrar historias de anuncios.", 403);
  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, name: profiles.displayName, ownerId: profiles.ownerId, status: profiles.status, hiddenAt: profiles.ownerHiddenAt, ownerActive: users.isActive })
    .from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).where(and(eq(profiles.id, profileId), isNull(profiles.trashedAt))).limit(1);
  if (!profile) return error("Anuncio no encontrado o en papelera.", 404);
  let form: FormData;
  try { form = await request.formData(); } catch { return error("No se pudo leer el envío. La foto final admite 5 MB y el video final 12 MB. Prepáralo nuevamente.", 413); }
  const destination = new URL(`/admin/anuncios-publicaciones/${encodeURIComponent(profileId)}/editar#historias`, request.url);

  if (form.get("action") === "delete") {
    const storyId = form.get("story_id");
    if (typeof storyId !== "string" || storyId.length > 80) return error("Selecciona una historia válida.", 400);
    const [story] = await db.select().from(profileStatuses).where(and(eq(profileStatuses.id, storyId), eq(profileStatuses.profileId, profileId))).limit(1);
    if (!story) return error("La historia no pertenece a este anuncio o ya se eliminó.", 404);
    if (story.storyType !== "text" && !adminHasCapability(admin, "media.moderate")) return error("No tienes permiso para eliminar historias de fotos o videos.", 403);
    if (story.r2Key) { const { env } = await import("cloudflare:workers"); if (!env.MEDIA) return error("El almacenamiento no está disponible. No se eliminó la historia; inténtalo más tarde.",503); await env.MEDIA.delete(story.r2Key); }
    await db.delete(profileStatuses).where(and(eq(profileStatuses.id, story.id), eq(profileStatuses.profileId, profileId)));
    await recordAdminAudit(admin, { category: "profiles", action: "story.delete", entityType: "story", entityId: story.id, entityLabel: profile.name, summary: `Eliminó una historia de ${story.storyType === "image" ? "imagen" : story.storyType === "video" ? "video" : "texto"} de ${profile.name}.`, before: { storyType: story.storyType, expiresAt: story.expiresAt }, metadata: { profileId, ownerId: profile.ownerId } });
    destination.searchParams.set("notice", "story_deleted");
    return NextResponse.redirect(destination, 303);
  }
  if (form.get("action") && form.get("action") !== "publish") return error("Acción no válida.", 400);
  if (!profile.ownerActive || profile.status !== "approved" || profile.hiddenAt) return error("El anuncio debe estar publicado y visible, y su cuenta propietaria debe estar activa.", 409);
  let prepared: Awaited<ReturnType<typeof readStoryUpload>>;
  try { prepared = await readStoryUpload(form); } catch (cause) { return error(cause instanceof Error ? cause.message : "No se pudo leer el archivo. No se subió.", cause instanceof StoryUploadError ? cause.status : 400); }
  const { body, storyType, data: imageData, contentType: imageType, extension } = prepared;
  if (imageData && !adminHasCapability(admin, "media.moderate")) return error("No tienes permiso para subir historias de fotos o videos.", 403);
  const limit = storyLimitForType(storyType);
  const now = new Date().toISOString();
  const active = await db.select({ id: profileStatuses.id }).from(profileStatuses).where(and(eq(profileStatuses.profileId, profileId), eq(profileStatuses.storyType, storyType), gt(profileStatuses.expiresAt, now))).limit(5);
  if (active.length >= limit) return error(`Este anuncio ya tiene ${limit} historias activas de este tipo. Elimina una o espera a que expire.`, 409);
  const { env } = await import("cloudflare:workers");
  if (!env.DB) return error("La base de datos no está disponible. Inténtalo nuevamente.", 503);
  let r2Key: string | null = null;
  const id = `story_${crypto.randomUUID()}`;
  const expiresAt = storyExpiresAt();
  let insertedSuccessfully = false;
  try {
    if (imageData && imageType && extension) {
      if (!env.MEDIA) return error("El almacenamiento de imágenes no está disponible.", 503);
      await purgeExpiredImageStories();
      const usage = await getMediaUsage();
      if (usage.bytes + imageData.byteLength > MEDIA_HARD_LIMIT_BYTES) return error("Se alcanzó el margen de almacenamiento del sitio. La imagen no se subió.", 413);
      r2Key = `stories/${profileId}/${id}.${extension}`;
      await env.MEDIA.put(r2Key, imageData, { httpMetadata: { contentType: imageType, cacheControl: "private, no-store" }, customMetadata: { category: "story", profileId } });
    }
    // Count and publication-state check remain atomic even with concurrent uploads.
    const inserted = await env.DB.prepare(`INSERT INTO profile_statuses (id, profile_id, body, story_type, r2_key, content_type, byte_size, created_at, expires_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE
      (SELECT count(*) FROM profile_statuses WHERE profile_id = ? AND story_type = ? AND expires_at > ?) < ?
      AND EXISTS (SELECT 1 FROM profiles p JOIN users u ON u.id = p.owner_id WHERE p.id = ? AND p.owner_id = ? AND p.status = 'approved' AND p.trashed_at IS NULL AND p.owner_hidden_at IS NULL AND u.is_active = 1)`)
      .bind(id, profileId, body, storyType, r2Key, imageType, imageData?.byteLength ?? 0, now, expiresAt, profileId, storyType, now, limit, profileId, profile.ownerId).run();
    if (!inserted.meta.changes) {
      if (r2Key) await env.MEDIA?.delete(r2Key);
      return error(`No se publicó: cambió la disponibilidad del anuncio o se completó el límite de ${limit} historias. Actualiza la página antes de repetirlo.`, 409);
    }
    insertedSuccessfully = true;
    await recordAdminAudit(admin, { category: "profiles", action: "story.create", entityType: "story", entityId: id, entityLabel: profile.name, summary: `Publicó una historia de ${storyType === "image" ? "imagen" : storyType === "video" ? "video" : "texto"} para ${profile.name}.`, after: { storyType, expiresAt, byteSize: imageData?.byteLength ?? 0 }, metadata: { profileId, ownerId: profile.ownerId } });
    return NextResponse.json({ ok: true, notice: "story_published" }, { status: 201 });
  } catch (cause) {
    if (r2Key && !insertedSuccessfully) await env.MEDIA?.delete(r2Key);
    const reference = `HISTORIA-${crypto.randomUUID().slice(0, 8)}`;
    console.error("Administrative story publication failed", { reference, profileId, cause });
    return error(`No se pudo confirmar la publicación. Revisa las historias antes de repetirla. Código de soporte: ${reference}.`, 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ profileId: string }> }) {
  try { return await handleStoryRequest(request, context); }
  catch (cause) {
    const reference = `HISTORIA-${crypto.randomUUID().slice(0,8)}`;
    console.error("Administrative story operation failed", { reference, cause });
    return NextResponse.json({ error: `El servidor no pudo confirmar la operación. Revisa las historias antes de repetirla. Código de soporte: ${reference}.` }, { status:500 });
  }
}
