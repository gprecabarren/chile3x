import { NextResponse } from "next/server";
import { createOpaqueToken, getGitHubOAuthConfig, safeAdminReturnTo } from "@/lib/auth";
import { ADMIN_OAUTH_STATE_COOKIE as OAUTH_STATE_COOKIE, ADMIN_OAUTH_RETURN_TO_COOKIE as OAUTH_RETURN_TO_COOKIE, ADMIN_OAUTH_COOKIE_PATH } from "@/lib/session-policy";

export async function GET(request: Request) {
  const config = await getGitHubOAuthConfig();

  if (!config) {
    return new Response("La administración de Chile3X aún no está configurada.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const requestUrl = new URL(request.url);
  const returnTo = safeAdminReturnTo(requestUrl.searchParams.get("return_to"));
  const state = createOpaqueToken();
  const callbackUrl = new URL("/api/auth/github/callback", request.url).toString();
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", config.clientId);
  githubUrl.searchParams.set("redirect_uri", callbackUrl);
  githubUrl.searchParams.set("scope", "read:user user:email");
  githubUrl.searchParams.set("state", state);
  // Signing out of Chile3X cannot clear github.com cookies. Always offer the
  // account picker, including ordinary entry after logout or browser history.
  githubUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(githubUrl);
  response.headers.set("cache-control", "no-store");
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    maxAge: 10 * 60,
    path: ADMIN_OAUTH_COOKIE_PATH,
    sameSite: "lax",
    secure: true,
  });
  response.cookies.set({
    name: OAUTH_RETURN_TO_COOKIE,
    value: returnTo,
    httpOnly: true,
    maxAge: 10 * 60,
    path: ADMIN_OAUTH_COOKIE_PATH,
    sameSite: "lax",
    secure: true,
  });
  return response;
}
