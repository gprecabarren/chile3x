import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, hashPassword } from "@/lib/auth";
import { resetPasswordWithToken } from "@/lib/account-email";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const formData = await request.formData();
  const token = typeof formData.get("token") === "string" ? String(formData.get("token")) : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
  if (password.length < 12 || !await resetPasswordWithToken(token, await hashPassword(password))) return NextResponse.redirect(new URL("/restablecer-clave?error=invalid", request.url), 303);
  return NextResponse.redirect(new URL("/ingresar?reset=1", request.url), 303);
}
