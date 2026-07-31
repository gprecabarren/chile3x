import { and, eq, gt } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const [row] = await (await getDb()).select({ story: profileStatuses, profile: profiles }).from(profileStatuses)
    .innerJoin(profiles, eq(profileStatuses.profileId, profiles.id))
    .where(and(eq(profileStatuses.id, storyId), eq(profileStatuses.storyType, "image"), eq(profiles.status, "approved"), gt(profileStatuses.expiresAt, new Date().toISOString())))
    .limit(1);
  if (!row?.story.r2Key) notFound();

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  const object = await env.MEDIA.get(row.story.r2Key);
  if (!object) notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.story.contentType ?? "image/jpeg");
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
