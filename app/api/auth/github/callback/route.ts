import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings, users } from "@/db/schema";
import {
  createAdminSession,
  getGitHubOAuthConfig,
  getSessionCookieName,
  safeAdminReturnTo,
  sessionCookieOptions,
} from "@/lib/auth";

const OAUTH_STATE_COOKIE = "chile3x_admin_oauth_state";
const OAUTH_RETURN_TO_COOKIE = "chile3x_admin_oauth_return_to";

type GitHubUser = {
  email: string | null;
  login: string;
};

function accessDenied(request: Request) {
  return NextResponse.redirect(new URL("/admin/acceso-denegado", request.url));
}

export async function GET(request: NextRequest) {
  const config = await getGitHubOAuthConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!config || !code || !state || !storedState || state !== storedState) {
    return accessDenied(request);
  }

  const callbackUrl = new URL("/api/auth/github/callback", request.url).toString();
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!tokenResponse.ok) {
    return accessDenied(request);
  }

  const token = await tokenResponse.json() as { access_token?: string };

  if (!token.access_token) {
    return accessDenied(request);
  }

  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token.access_token}`,
      "user-agent": "Chile3X-Administration",
      "x-github-api-version": "2026-03-10",
    },
  });

  if (!githubUserResponse.ok) {
    return accessDenied(request);
  }

  const githubUser = await githubUserResponse.json() as GitHubUser;
  const email = githubUser.email?.trim().toLowerCase();
  const githubLogin = githubUser.login.trim().toLowerCase();
  const db = await getDb();
  let admin: { id: string } | undefined;

  if (email) {
    [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.email, email),
        eq(users.role, "admin"),
      ))
      .limit(1);
  }

  if (!admin && githubLogin) {
    const [allowedLogins] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, "admin_github_logins"))
      .limit(1);
    const isAllowed = allowedLogins?.value.split(",").some((login) => login.trim().toLowerCase() === githubLogin);

    if (isAllowed) {
      [admin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
    }
  }

  if (!admin) {
    return accessDenied(request);
  }

  const returnTo = safeAdminReturnTo(request.cookies.get(OAUTH_RETURN_TO_COOKIE)?.value ?? null);
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/github" });
  response.cookies.delete({ name: OAUTH_RETURN_TO_COOKIE, path: "/api/auth/github" });
  response.cookies.set({
    name: getSessionCookieName(),
    value: await createAdminSession(admin.id),
    ...sessionCookieOptions(),
  });
  return response;
}
