import { NextRequest } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { startMessageConversation } from "@/lib/internal-messages";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "invalid_origin" }, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { profileId?: string } | null;
  const profileId = typeof payload?.profileId === "string" ? payload.profileId.slice(0, 100) : "";
  if (!profileId) return Response.json({ error: "invalid_profile" }, { status: 400 });
  const conversationId = await startMessageConversation(profileId, user.id);
  if (!conversationId) return Response.json({ error: "conversation_unavailable" }, { status: 409 });
  return Response.json({ conversationId, href: `/mi-cuenta/mensajes?conversacion=${encodeURIComponent(conversationId)}` }, { headers: { "cache-control": "no-store" } });
}

