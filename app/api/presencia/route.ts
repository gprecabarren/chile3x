import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { accountPresence } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { onlinePublicProfileIds, presenceProfileIds } from "@/lib/public-presence";

export async function GET(request: NextRequest) {
  const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
  if (request.url.length > 9_000) return Response.json({ error: "Consulta demasiado extensa." }, { status: 400, headers });
  const ids = presenceProfileIds(new URL(request.url).searchParams.getAll("id"));
  if (!ids) return Response.json({ error: "Consulta de presencia no válida." }, { status: 400, headers });
  return Response.json({ onlineProfileIds: await onlinePublicProfileIds(ids) }, { headers });
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response(null, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const now = new Date().toISOString();
  await (await getDb()).insert(accountPresence).values({ userId: user.id, lastActiveAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: accountPresence.userId, set: { lastActiveAt: now, updatedAt: now } });
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

