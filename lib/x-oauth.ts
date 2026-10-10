export const X_AUTH_COOKIE = "chile3x_x_auth";
export const X_REGISTRATION_COOKIE = "chile3x_x_registration";
export const X_SCOPES = "tweet.read users.read users.email";
export type XIdentity = { subject: string; username: string; displayName: string; email: string | null };
export type XConfig = { clientId: string; clientSecret: string; redirectUri: string };

export async function xCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function parseXIdentity(value: unknown): XIdentity | null {
  const data = (value as { data?: Record<string, unknown> } | null)?.data;
  if (!data || typeof data.id !== "string" || !/^\d{1,30}$/.test(data.id) || typeof data.username !== "string" || !/^[A-Za-z0-9_]{1,50}$/.test(data.username)) return null;
  const email = typeof data.confirmed_email === "string" ? data.confirmed_email.trim().toLowerCase() : "";
  return { subject: data.id, username: data.username, displayName: typeof data.name === "string" ? data.name.trim().slice(0, 80) || data.username : data.username,
    email: email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null };
}

export function xAuthorizationUrl(config: XConfig, state: string, challenge: string) {
  const url = new URL("https://x.com/i/oauth2/authorize");
  for (const [key, value] of Object.entries({ response_type: "code", client_id: config.clientId, redirect_uri: config.redirectUri, scope: X_SCOPES, state, code_challenge: challenge, code_challenge_method: "S256" })) url.searchParams.set(key, value);
  return url;
}

export async function exchangeXCode(code: string, verifier: string, config: XConfig): Promise<XIdentity> {
  const credentials = btoa(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`);
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST", headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: config.redirectUri, code_verifier: verifier }), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("X token exchange unavailable");
  const token = await response.json() as { access_token?: unknown; token_type?: unknown };
  if (typeof token.access_token !== "string" || token.token_type?.toString().toLowerCase() !== "bearer") throw new Error("Invalid X token");
  // No refresh token, offline scope, posts or DMs are retained or requested.
  try {
    const profile = await fetch("https://api.x.com/2/users/me?user.fields=confirmed_email,name,username", { headers: { authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(12_000) });
    if (!profile.ok) throw new Error("X identity unavailable");
    const identity = parseXIdentity(await profile.json());
    if (!identity) throw new Error("Invalid X identity");
    return identity;
  } finally {
    // Login only: discard and revoke the short-lived token once identity is read.
    await fetch("https://api.x.com/2/oauth2/revoke", { method: "POST", headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: token.access_token }), signal: AbortSignal.timeout(3_000) }).catch(() => {});
  }
}
