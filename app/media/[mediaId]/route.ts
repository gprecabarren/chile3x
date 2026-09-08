import { notFound } from "next/navigation";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";
import { adminHasCapability } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record) notFound();

  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const canModerateMedia = adminHasCapability(admin, "media.moderate");
  const isPublic = record.ownerIsActive && record.media.visibility === "public" && record.media.moderationStatus === "approved" && record.profile.status === "approved";
  if (!isPublic) {
    // Legacy private media is only retained as a migration source. Access for
    // buyers is served exclusively by /contenido/:id, whose authorization is
    // based on the account-owned collection rather than a listing status.
    if (user?.id !== record.profile.ownerId && !canModerateMedia) notFound();
  }

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  const object = await env.MEDIA.get(record.media.r2Key);
  if (!object) notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.media.contentType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("etag", object.httpEtag);
  // Re-check authorization after a pause, rejection or account deactivation.
  // ETags still avoid downloading an unchanged image again.
  headers.set("cache-control", isPublic ? "public, no-cache, must-revalidate" : "private, no-store");
  if (isPublic && request.headers.get("if-none-match") === object.httpEtag) {
    await object.body.cancel();
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}
