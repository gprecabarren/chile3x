import { NextResponse } from "next/server";
import { createOpaqueToken, getGitHubOAuthConfig, safeAdminReturnTo } from "@/lib/auth";

const OAUTH_STATE_COOKIE = "chile3x_admin_oauth_state";
const OAUTH_RETURN_TO_COOKIE = "chile3x_admin_oauth_return_to";

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

  const response = NextResponse.redirect(githubUrl);
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/auth/github",
    sameSite: "lax",
    secure: true,
  });
  response.cookies.set({
    name: OAUTH_RETURN_TO_COOKIE,
    value: returnTo,
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/auth/github",
    sameSite: "lax",
    secure: true,
  });
  return response;
}
