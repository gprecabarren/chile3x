import { notFound } from "next/navigation";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { findProfileMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const record = await findProfileMedia(mediaId);
  if (!record || record.media.mediaType !== "image") notFound();

  const isPublic = record.media.moderationStatus === "approved" && record.profile.status === "approved";
  if (!isPublic) {
    const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
    if (user?.id !== record.profile.ownerId && !admin) notFound();
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
  headers.set("cache-control", isPublic ? "public, max-age=86400, stale-while-revalidate=604800" : "private, no-store");
  return new Response(object.body, { headers });
}
