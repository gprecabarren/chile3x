import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { newsMedia } from "@/db/schema";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) { const { mediaId } = await params; const [media] = await (await getDb()).select().from(newsMedia).where(eq(newsMedia.id, mediaId)).limit(1); if (!media) notFound(); const { env } = await import("cloudflare:workers"); const object = await env.MEDIA?.get(media.r2Key); if (!object) notFound(); const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("content-type", media.contentType); headers.set("x-content-type-options", "nosniff"); headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800"); return new Response(object.body, { headers }); }
