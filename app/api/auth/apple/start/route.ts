import { NextRequest, NextResponse } from "next/server";
import { createAppleAuthAttempt } from "@/lib/apple-auth-flow";
import { safeAccountReturnTo } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  const settings = await getSiteSettings();
  let privateKey = "";
  let encryptionKey = "";
  try {
    const { env } = await import("cloudflare:workers");
    privateKey = env.APPLE_PRIVATE_KEY?.trim() ?? "";
    encryptionKey = env.APPLE_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
  } catch {
    // Local static checks do not expose Worker secrets.
  }
  const configured = settings.apple_sign_in_status === "enabled"
    && settings.apple_services_id && settings.apple_team_id && settings.apple_key_id
    && settings.apple_primary_app_id && privateKey && encryptionKey;
  if (!configured) return NextResponse.redirect(new URL("/ingresar?error=apple_unavailable", request.url), 303);

  const intent = request.nextUrl.searchParams.get("intent") === "register" ? "register" : "login";
  const returnTo = safeAccountReturnTo(request.nextUrl.searchParams.get("return_to"));
  const attempt = await createAppleAuthAttempt(intent, returnTo);
  const redirectUri = `${new URL(request.url).origin}/api/auth/apple/callback`;
  const authorization = new URL("https://appleid.apple.com/auth/authorize");
  authorization.searchParams.set("client_id", settings.apple_services_id);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code id_token");
  authorization.searchParams.set("response_mode", "form_post");
  authorization.searchParams.set("scope", "name email");
  authorization.searchParams.set("state", attempt.state);
  authorization.searchParams.set("nonce", attempt.nonce);
  return NextResponse.redirect(authorization, 302);
}

