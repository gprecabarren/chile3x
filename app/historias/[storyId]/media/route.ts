import { and, eq, gt, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { publicProfileCondition } from "@/lib/public-profile-visibility";
import { mediaByteRange } from "@/lib/media-byte-range";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const [row] = await (await getDb()).select({ story: profileStatuses, profile: profiles }).from(profileStatuses)
    .innerJoin(profiles, eq(profileStatuses.profileId, profiles.id))
    .where(and(eq(profileStatuses.id, storyId), inArray(profileStatuses.storyType, ["image", "video"]), publicProfileCondition, gt(profileStatuses.expiresAt, new Date().toISOString())))
    .limit(1);
  if (!row?.story.r2Key) notFound();

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  const range = mediaByteRange(request.headers.has("if-range") ? null : request.headers.get("range"), row.story.byteSize);
  if (range === "unsatisfiable") return new Response(null, { status:416,headers:{"content-range":`bytes */${row.story.byteSize}`,"accept-ranges":"bytes","cache-control":"private, no-store"} });
  const object = await env.MEDIA.get(row.story.r2Key, range ? {range} : undefined);
  if (!object) notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.story.contentType ?? "image/jpeg");
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("accept-ranges","bytes");
  headers.set("content-length",String(range?.length ?? object.size));
  if (range) headers.set("content-range",`bytes ${range.offset}-${range.offset+range.length-1}/${object.size}`);
  return new Response(object.body, { status:range ? 206 : 200,headers });
}
