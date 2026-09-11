import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { requestTelegramMemberInvite } from "@/lib/telegram-linking";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 401 });
  const job = await requestTelegramMemberInvite(user.id);
  return NextResponse.redirect(new URL(`/mi-cuenta/telegram?notice=${job ? "invite_sent" : "invite_error"}`, request.url), 303);
}
