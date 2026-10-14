import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";
import { compactText } from "@/lib/profile";
import { getMediaUsage, MEDIA_HARD_LIMIT_BYTES } from "@/lib/media";
import { purgeExpiredImageStories } from "@/lib/stories";
import { storyExpiresAt, storyLimitForType } from "@/lib/story-data";
import { readStoryUpload, StoryUploadError } from "@/lib/story-upload";

function acceptsJson(request: Request) {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function response(request: Request, formData: FormData | null, notice: string, status = 200, message?: string) {
  if (acceptsJson(request)) return NextResponse.json({ ok: status < 400, notice, ...(status >= 400 ? { error: message ?? "No se pudo publicar. Revisa el anuncio y los límites del formulario." } : {}) }, { status });
  const returnTo = formData?.get("return_to");
  const destination = safeAccountReturnTo(typeof returnTo === "string" ? returnTo : null);
  const url = new URL(destination, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

async function publishStory(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return acceptsJson(request) ? NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }) : new Response("Solicitud no válida.", { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return acceptsJson(request) ? NextResponse.json({ error: "Ingresa para publicar historias." }, { status: 401 }) : NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return response(request, null, "story_error", 413, "No se pudo leer el envío. Foto final hasta 5 MB y video final hasta 12 MB; vuelve a preparar el archivo.");
  }
  const profileId = compactText(formData.get("profile_id"), 80);
  if (!profileId) return response(request, formData, "story_error", 400, "Selecciona el anuncio de esta historia.");
  let prepared: Awaited<ReturnType<typeof readStoryUpload>>;
  try { prepared = await readStoryUpload(formData); } catch (cause) { return response(request, formData, "story_error", cause instanceof StoryUploadError ? cause.status : 400, cause instanceof Error ? cause.message : "No se pudo leer el archivo; no se guardó."); }
  const { body, storyType, data: imageData, contentType: imageType, extension } = prepared;
  const limit = storyLimitForType(storyType);

  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id), eq(profiles.status, "approved"), isNull(profiles.trashedAt), isNull(profiles.ownerHiddenAt))).limit(1);
  if (!profile) return response(request, formData, "story_error", 403, "El anuncio debe ser tuyo, estar publicado, visible y fuera de la papelera.");
  if (imageData) await purgeExpiredImageStories();

  const activeStories = await db.select({ id: profileStatuses.id }).from(profileStatuses).where(and(eq(profileStatuses.profileId, profile.id), eq(profileStatuses.storyType, storyType), gt(profileStatuses.expiresAt, new Date().toISOString()))).limit(5);
  if (activeStories.length >= limit) return response(request, formData, "story_limit", 409, `Ya tienes ${limit} historias activas de este tipo. Elimina una o espera a que expire.`);

  const id = `story_${crypto.randomUUID()}`;
  let r2Key: string | null = null;
  try {
  if (imageData && imageType && extension) {
    const usage = await getMediaUsage();
    if (usage.bytes + imageData.byteLength > MEDIA_HARD_LIMIT_BYTES) return acceptsJson(request) ? NextResponse.json({ error: "No se pueden subir más imágenes: se alcanzó el margen de almacenamiento del sitio." }, { status: 413 }) : response(request, formData, "story_error", 413);
    const { env } = await import("cloudflare:workers");
    if (!env.MEDIA) return response(request, formData, "story_error", 503, "El almacenamiento no está disponible. El archivo no se subió; inténtalo más tarde.");
    r2Key = `stories/${profile.id}/${id}.${extension}`;
    await env.MEDIA.put(r2Key, imageData, { httpMetadata: { contentType: imageType, cacheControl: "private, no-store" }, customMetadata: { category: "story", profileId: profile.id } });
  }
    const { env } = await import("cloudflare:workers");
    // The count and insert share one statement: simultaneous requests cannot
    // exceed the type's active limit (five photos/texts or three videos).
    const now = new Date().toISOString();
    const inserted = await env.DB!.prepare(`INSERT INTO profile_statuses (id, profile_id, body, story_type, r2_key, content_type, byte_size, created_at, expires_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE
      (SELECT count(*) FROM profile_statuses WHERE profile_id = ? AND story_type = ? AND expires_at > ?) < ?
      AND EXISTS (SELECT 1 FROM profiles WHERE id = ? AND owner_id = ? AND status = 'approved' AND trashed_at IS NULL AND owner_hidden_at IS NULL)`)
      .bind(id, profile.id, body, storyType, r2Key, imageType, imageData?.byteLength ?? 0, now, storyExpiresAt(), profile.id, storyType, now, limit, profile.id, user.id).run();
    if (!inserted.meta.changes) {
      if (r2Key) await env.MEDIA?.delete(r2Key);
      return response(request, formData, "story_limit", 409, `No se publicó: cambió el estado del anuncio o se completó el límite de ${limit}. Actualiza las historias antes de reintentar.`);
    }
  } catch (error) {
    if (r2Key) {
      const { env } = await import("cloudflare:workers");
      await env.MEDIA?.delete(r2Key);
    }
    throw error;
  }
  return response(request, formData, "story_published", 201);
}

export async function POST(request: NextRequest) {
  try { return await publishStory(request); }
  catch (cause) {
    const reference = `HISTORIA-${crypto.randomUUID().slice(0,8)}`;
    console.error("Story upload failed", { reference, cause });
    return response(request, null, "story_error", 500, `No se pudo confirmar la publicación. Revisa tus historias antes de repetirla. Código de soporte: ${reference}.`);
  }
}
