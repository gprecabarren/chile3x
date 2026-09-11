import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { confirmTelegramLink } from "@/lib/telegram-linking";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 401 });
  const confirmed = await confirmTelegramLink(user, "account");
  return NextResponse.redirect(new URL(`/mi-cuenta/telegram?notice=${confirmed ? "linked" : "confirmation_error"}`, request.url), 303);
}
