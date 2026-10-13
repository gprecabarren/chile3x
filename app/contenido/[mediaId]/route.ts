import { notFound } from "next/navigation";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { canAccessExclusiveContent, findExclusiveContentMedia } from "@/lib/exclusive-content";
import { adminHasCapability } from "@/lib/admin-permissions";
import { mediaByteRange } from "@/lib/media-byte-range";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const record = await findExclusiveContentMedia(mediaId);
  if (!record) notFound();
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const canModerateMedia = adminHasCapability(admin, "media.moderate");
  const canManage = user?.id === record.collection.ownerId || canModerateMedia;
  const canAccess = canManage || (record.media.moderationStatus === "approved" && await canAccessExclusiveContent(record.collection.id, user?.id, canModerateMedia));
  if (!canAccess) notFound();

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  const range = mediaByteRange(request.headers.has("if-range") ? null : request.headers.get("range"), record.media.byteSize);
  if (range === "unsatisfiable") return new Response(null, { status: 416, headers: { "content-range": `bytes */${record.media.byteSize}`, "accept-ranges": "bytes", "cache-control": "private, no-store" } });
  const object = await env.MEDIA.get(record.media.r2Key, range ? { range } : undefined);
  if (!object) notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.media.contentType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  headers.set("accept-ranges", "bytes");
  headers.set("content-length", String(range?.length ?? object.size));
  if (range) headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
