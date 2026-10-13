import { notFound } from "next/navigation";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";
import { adminHasCapability } from "@/lib/admin-permissions";
import { mediaByteRange } from "@/lib/media-byte-range";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record) notFound();

  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const canModerateMedia = adminHasCapability(admin, "media.moderate");
  const isPublic = record.ownerIsActive && !record.profile.trashedAt && !record.profile.ownerHiddenAt && record.media.visibility === "public" && record.media.moderationStatus === "approved" && record.profile.status === "approved";
  if (!isPublic) {
    // Legacy private media is only retained as a migration source. Access for
    // buyers is served exclusively by /contenido/:id, whose authorization is
    // based on the account-owned collection rather than a listing status.
    if ((user?.id !== record.profile.ownerId || Boolean(record.profile.trashedAt)) && !canModerateMedia) notFound();
  }

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  // If-Range can refer to a replaced object. A full response avoids mixing
  // versions; authorization is still checked above on every partial request.
  const range = mediaByteRange(request.headers.has("if-range") ? null : request.headers.get("range"), record.media.byteSize);
  if (range === "unsatisfiable") return new Response(null, { status: 416, headers: { "content-range": `bytes */${record.media.byteSize}`, "accept-ranges": "bytes", "cache-control": "private, no-store" } });
  const object = await env.MEDIA.get(record.media.r2Key, range ? { range } : undefined);
  if (!object) notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.media.contentType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  // Re-check authorization after a pause, rejection or account deactivation.
  // ETags still avoid downloading an unchanged image again.
  headers.set("cache-control", isPublic ? "public, no-cache, must-revalidate" : "private, no-store");
  if (isPublic && request.headers.get("if-none-match") === object.httpEtag) {
    await object.body.cancel();
    return new Response(null, { status: 304, headers });
  }
  headers.set("content-length", String(range?.length ?? object.size));
  if (range) headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
