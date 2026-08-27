import { notFound } from "next/navigation";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { canAccessExclusiveContent, findExclusiveContentMedia } from "@/lib/exclusive-content";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const record = await findExclusiveContentMedia(mediaId);
  if (!record) notFound();
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const canManage = user?.id === record.collection.ownerId || Boolean(admin);
  const canAccess = canManage || (record.media.moderationStatus === "approved" && await canAccessExclusiveContent(record.collection.id, user?.id, Boolean(admin)));
  if (!canAccess) notFound();

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  const object = await env.MEDIA.get(record.media.r2Key);
  if (!object) notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.media.contentType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}
