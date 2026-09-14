import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { beginTelegramLink } from "@/lib/telegram-linking";

export async function POST(request: NextRequest) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  try { assertSameOrigin(request); } catch {
    return wantsJson ? NextResponse.json({ error: "La solicitud no es válida." }, { status: 403 }) : new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return wantsJson ? NextResponse.json({ error: "La sesión de la cuenta expiró." }, { status: 401 }) : new Response("No autorizado.", { status: 401 });
  const attempt = await beginTelegramLink(user, "account");
  if (!attempt) return wantsJson
    ? NextResponse.json({ error: "El bot todavía no está configurado." }, { status: 503 })
    : NextResponse.redirect(new URL("/mi-cuenta/telegram?notice=not_configured", request.url), 303);
  if (wantsJson) return NextResponse.json({
    universalUrl: attempt.deepLink,
    nativeUrl: attempt.nativeDeepLink,
  }, { headers: { "cache-control": "no-store" } });
  return NextResponse.redirect(attempt.deepLink, 303);
}
