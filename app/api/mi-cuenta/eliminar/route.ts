import { NextRequest, NextResponse } from "next/server";
import { permanentlyDeleteAccount } from "@/lib/account-deletion";
import { assertSameOrigin, getCurrentUser, getUserSessionCookieName, getUserSessionDuration, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 401 });
  const formData = await request.formData();
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim().toLowerCase() : "";
  if (email !== user.email.toLowerCase() || formData.get("confirmation") !== "ELIMINAR") {
    return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=delete_confirmation", request.url), 303);
  }
  const deleted = await permanentlyDeleteAccount(user.id, { kind: "user" });
  if (!deleted) return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=delete_error", request.url), 303);
  const response = NextResponse.redirect(new URL("/registro?notice=account_deleted", request.url), 303);
  response.cookies.set({ name: getUserSessionCookieName(), value: "", ...sessionCookieOptions(getUserSessionDuration()), maxAge: 0 });
  return response;
}
