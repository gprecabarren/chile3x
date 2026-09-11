import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { beginTelegramLink } from "@/lib/telegram-linking";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 401 });
  const attempt = await beginTelegramLink(user, "account");
  if (!attempt) return NextResponse.redirect(new URL("/mi-cuenta/telegram?notice=not_configured", request.url), 303);
  return NextResponse.redirect(attempt.deepLink, 303);
}
