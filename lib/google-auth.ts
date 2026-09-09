type GoogleJwtHeader = { alg?: unknown; kid?: unknown };

export const GOOGLE_NONCE_COOKIE = "chile3x_google_nonce";

export type VerifiedGoogleIdentity = {
  subject: string;
  email: string;
  displayName: string;
  fullName: string;
};

type GoogleJwtPayload = {
  aud?: unknown;
  azp?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  name?: unknown;
  nonce?: unknown;
  sub?: unknown;
};

type GoogleJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

let cachedKeys: { expiresAt: number; keys: GoogleJwk[] } | null = null;

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
  } catch {
    return null;
  }
}

async function getGoogleKeys(forceRefresh = false) {
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("Google signing keys are unavailable");
  const body = await response.json() as { keys?: GoogleJwk[] };
  if (!Array.isArray(body.keys) || !body.keys.length) throw new Error("Google signing keys are invalid");
  const maximumAge = Number.parseInt(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? "3600", 10);
  cachedKeys = { keys: body.keys, expiresAt: Date.now() + Math.min(Math.max(maximumAge, 300), 21_600) * 1000 };
  return body.keys;
}

async function signingKey(kid: string) {
  let keys = await getGoogleKeys();
  let key = keys.find((item) => item.kid === kid);
  if (!key) {
    keys = await getGoogleKeys(true);
    key = keys.find((item) => item.kid === kid);
  }
  return key ?? null;
}

export async function verifyGoogleCredential(credential: string, clientId: string, expectedNonce: string): Promise<VerifiedGoogleIdentity | null> {
  if (credential.length > 12_000 || clientId.length > 180 || expectedNonce.length < 32) return null;
  const [encodedHeader, encodedPayload, encodedSignature, extra] = credential.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) return null;
  const header = decodeJson<GoogleJwtHeader>(encodedHeader);
  const payload = decodeJson<GoogleJwtPayload>(encodedPayload);
  if (!header || !payload || header.alg !== "RS256" || typeof header.kid !== "string") return null;
  const key = await signingKey(header.kid);
  if (!key || (key.alg && key.alg !== "RS256") || (key.use && key.use !== "sig")) return null;

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!signatureValid) return null;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const issuerValid = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (
    !issuerValid
    || !audiences.includes(clientId)
    || (typeof payload.azp === "string" && payload.azp !== clientId)
    || typeof payload.exp !== "number" || payload.exp < now - 60
    || typeof payload.iat !== "number" || payload.iat > now + 60
    || payload.nonce !== expectedNonce
    || payload.email_verified !== true
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255
  ) return null;

  const fullName = typeof payload.name === "string" ? payload.name.trim().slice(0, 160) : "";
  return {
    subject: payload.sub,
    email,
    displayName: fullName.slice(0, 80) || email.split("@")[0].slice(0, 80),
    fullName,
  };
}
