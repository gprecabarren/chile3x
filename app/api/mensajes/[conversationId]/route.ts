import { NextRequest } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { getMessagePage, sendInternalMessage, updateConversationPreference } from "@/lib/internal-messages";

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const { conversationId } = await params;
  const before = request.nextUrl.searchParams.get("before");
  const page = await getMessagePage(conversationId, user.id, before);
  if (!page) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ messages: page.messages, hasMore: page.hasMore }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "invalid_origin" }, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  const result = await sendInternalMessage((await params).conversationId, user.id, payload?.body);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "rate_limited" ? 429 : result.error === "blocked" || result.error === "unavailable" ? 409 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ message: result.message }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "invalid_origin" }, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "authentication_required" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { action?: string } | null;
  const allowed = new Set(["mute", "unmute", "block", "unblock", "read"] as const);
  if (!payload?.action || !allowed.has(payload.action as "mute" | "unmute" | "block" | "unblock" | "read")) {
    return Response.json({ error: "invalid_action" }, { status: 400 });
  }
  const updated = await updateConversationPreference((await params).conversationId, user.id, payload.action as "mute" | "unmute" | "block" | "unblock" | "read");
  return updated ? Response.json({ ok: true }) : Response.json({ error: "not_found" }, { status: 404 });
}

