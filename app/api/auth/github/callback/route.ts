import { and, eq, ne, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminGithubAccess, adminGithubIdentities, users } from "@/db/schema";
import {
  createAdminSession,
  getGitHubOAuthConfig,
  getSessionCookieName,
  safeAdminReturnTo,
  sessionCookieOptions,
} from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";

const OAUTH_STATE_COOKIE = "chile3x_admin_oauth_state";
const OAUTH_RETURN_TO_COOKIE = "chile3x_admin_oauth_return_to";

type GitHubUser = {
  id: number;
  email: string | null;
  login: string;
  name?: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function accessDenied(request: Request, reason?: string) {
  const url = new URL("/admin/acceso-denegado", request.url);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
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
  const githubEmailsResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token.access_token}`,
      "user-agent": "Chile3X-Administration",
      "x-github-api-version": "2026-03-10",
    },
  });
  const githubEmails = githubEmailsResponse.ok ? await githubEmailsResponse.json() as GitHubEmail[] : [];
  const verifiedEmails = githubEmails
    .filter((item) => item.verified)
    .map((item) => item.email.trim().toLowerCase());
  // Only GitHub's authenticated /user/emails endpoint can reserve an email
  // for administration. A public profile email is not sufficient proof.
  const email = (githubEmails.find((item) => item.primary && item.verified)?.email
    ?? githubEmails.find((item) => item.verified)?.email)?.trim().toLowerCase();
  const githubLogin = githubUser.login.trim().toLowerCase();
  const githubUserId = String(githubUser.id);
  const db = await getDb();
  let admin: { id: string; email: string; username: string | null; displayName: string | null; role: "admin" } | undefined;

  // Authentication comes from GitHub, but authorization always comes from an
  // active Chile3X grant. Existing OAuth identities cannot bypass a revocation.
  const [grant] = await db.select({
    id: adminGithubAccess.id,
    userId: adminGithubAccess.userId,
    githubUserId: adminGithubAccess.githubUserId,
    accessLevel: adminGithubAccess.accessLevel,
    protectedEmail: adminGithubAccess.protectedEmail,
    isProtectedOwner: adminGithubAccess.isProtectedOwner,
  }).from(adminGithubAccess).where(and(
    eq(adminGithubAccess.isActive, true),
    or(eq(adminGithubAccess.githubUserId, githubUserId), eq(adminGithubAccess.githubLogin, githubLogin)),
  )).limit(1);

  const administrativeEmail = grant?.protectedEmail && verifiedEmails.includes(grant.protectedEmail)
    ? grant.protectedEmail
    : email;

  if (
    !grant
    || (grant.githubUserId && grant.githubUserId !== githubUserId)
    || !administrativeEmail
    || (grant.protectedEmail && !verifiedEmails.includes(grant.protectedEmail))
  ) {
    return accessDenied(request);
  }

  const [publicAccountConflict] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.email, administrativeEmail), ne(users.role, "admin"))).limit(1);
  if (publicAccountConflict) return accessDenied(request, "email_conflict");

  if (grant.userId) {
    const [grantedAdmin] = await db.select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName, role: users.role })
      .from(users)
      .where(and(eq(users.id, grant.userId), eq(users.role, "admin"), eq(users.isActive, true)))
      .limit(1);
    if (grantedAdmin?.role === "admin") admin = { ...grantedAdmin, role: "admin" };
  }

  if (!admin) {
    const [identityAdmin] = await db
      .select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName, role: users.role })
      .from(adminGithubIdentities)
      .innerJoin(users, eq(adminGithubIdentities.userId, users.id))
      .where(and(
        or(eq(adminGithubIdentities.githubUserId, githubUserId), eq(adminGithubIdentities.githubLogin, githubLogin)),
        eq(users.role, "admin"),
        eq(users.isActive, true),
      ))
      .limit(1);
    if (identityAdmin?.role === "admin") admin = { ...identityAdmin, role: "admin" };
  }

  if (!admin && !grant.userId) {
    const adminId = `usr_admin_${crypto.randomUUID()}`;
    const adminEmail = `github+${githubUserId}@users.noreply.chile3x.cl`;
    const displayName = githubUser.name?.trim().slice(0, 80) || githubUser.login;
    await db.insert(users).values({
      id: adminId,
      email: adminEmail,
      displayName,
      role: "admin",
      emailVerifiedAt: new Date().toISOString(),
    }).onConflictDoNothing({ target: users.email });
    const [createdAdmin] = await db.select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName, role: users.role })
      .from(users)
      .where(and(eq(users.email, adminEmail), eq(users.role, "admin"), eq(users.isActive, true)))
      .limit(1);
    if (createdAdmin?.role === "admin") admin = { ...createdAdmin, role: "admin" };
  }

  if (!admin) return accessDenied(request);

  const now = new Date().toISOString();
  const [existingIdentity] = await db.select({ id: adminGithubIdentities.id })
    .from(adminGithubIdentities)
    .where(or(
      eq(adminGithubIdentities.githubUserId, githubUserId),
      eq(adminGithubIdentities.githubLogin, githubLogin),
      eq(adminGithubIdentities.userId, admin.id),
    ))
    .limit(1);
  if (existingIdentity) {
    await db.update(adminGithubIdentities).set({
      userId: admin.id,
      githubUserId,
      githubLogin,
      githubEmail: administrativeEmail,
      lastLoginAt: now,
    }).where(eq(adminGithubIdentities.id, existingIdentity.id));
  } else {
    await db.insert(adminGithubIdentities).values({
      id: `admin_identity_${crypto.randomUUID()}`,
      userId: admin.id,
      githubUserId,
      githubLogin,
      githubEmail: administrativeEmail,
      lastLoginAt: now,
    });
  }
  await db.update(adminGithubAccess).set({
    userId: admin.id,
    githubUserId,
    githubLogin,
    protectedEmail: administrativeEmail,
    revokedAt: null,
    revokedBy: null,
    updatedAt: now,
  }).where(eq(adminGithubAccess.id, grant.id));
  await recordAdminAudit({
    ...admin,
    accessLevel: grant.accessLevel,
    githubLogin,
    isProtectedOwner: grant.isProtectedOwner,
  }, {
    category: "access",
    action: "admin.login",
    entityType: "admin",
    entityId: admin.id,
    entityLabel: `@${githubUser.login}`,
    summary: `${githubUser.login} inició sesión mediante GitHub.`,
    metadata: { provider: "github" },
  });

  const returnTo = safeAdminReturnTo(request.cookies.get(OAUTH_RETURN_TO_COOKIE)?.value ?? null);
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/github" });
  response.cookies.delete({ name: OAUTH_RETURN_TO_COOKIE, path: "/api/auth/github" });
  response.cookies.set({
    name: getSessionCookieName(),
    value: await createAdminSession(admin.id, request),
    ...sessionCookieOptions(),
  });
  return response;
}
