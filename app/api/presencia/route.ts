import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { accountPresence } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response(null, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const now = new Date().toISOString();
  await (await getDb()).insert(accountPresence).values({ userId: user.id, lastActiveAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: accountPresence.userId, set: { lastActiveAt: now, updatedAt: now } });
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

