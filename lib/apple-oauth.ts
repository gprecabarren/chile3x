type AppleJwtHeader = { alg?: unknown; kid?: unknown };

type AppleJwtPayload = {
  aud?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  nonce?: unknown;
  sub?: unknown;
};

type AppleJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

export type VerifiedAppleIdentity = {
  subject: string;
  email: string;
};

export type AppleOAuthConfiguration = {
  servicesId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
};

let cachedKeys: { expiresAt: number; keys: AppleJwk[] } | null = null;

function encodeBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

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

async function getAppleKeys(forceRefresh = false) {
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch("https://appleid.apple.com/auth/keys", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Apple signing keys are unavailable");
  const body = await response.json() as { keys?: AppleJwk[] };
  if (!Array.isArray(body.keys) || !body.keys.length) throw new Error("Apple signing keys are invalid");
  const maximumAge = Number.parseInt(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? "3600", 10);
  cachedKeys = { keys: body.keys, expiresAt: Date.now() + Math.min(Math.max(maximumAge, 300), 21_600) * 1000 };
  return body.keys;
}

async function signingKey(kid: string) {
  let keys = await getAppleKeys();
  let key = keys.find((item) => item.kid === kid);
  if (!key) {
    keys = await getAppleKeys(true);
    key = keys.find((item) => item.kid === kid);
  }
  return key ?? null;
}

export async function verifyAppleIdentity(identityToken: string, servicesId: string, expectedNonce: string): Promise<VerifiedAppleIdentity | null> {
  if (identityToken.length > 12_000 || servicesId.length > 180 || expectedNonce.length < 32) return null;
  const [encodedHeader, encodedPayload, encodedSignature, extra] = identityToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) return null;
  const header = decodeJson<AppleJwtHeader>(encodedHeader);
  const payload = decodeJson<AppleJwtPayload>(encodedPayload);
  if (!header || !payload || header.alg !== "RS256" || typeof header.kid !== "string") return null;
  const key = await signingKey(header.kid);
  if (!key || (key.alg && key.alg !== "RS256") || (key.use && key.use !== "sig")) return null;
  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!signatureValid) return null;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (
    payload.iss !== "https://appleid.apple.com"
    || !audiences.includes(servicesId)
    || typeof payload.exp !== "number" || payload.exp < now - 60
    || typeof payload.iat !== "number" || payload.iat > now + 60
    || payload.nonce !== expectedNonce
    || !emailVerified
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255
  ) return null;
  return { subject: payload.sub, email };
}

function privateKeyBytes(value: string) {
  const normalized = value.replaceAll("\\n", "\n").trim();
  const encoded = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  if (!encoded) throw new Error("Apple private key is empty");
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
}

export async function createAppleClientSecret(configuration: Omit<AppleOAuthConfiguration, "redirectUri">) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "ES256", kid: configuration.keyId, typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({
    iss: configuration.teamId,
    iat: now,
    exp: now + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: configuration.servicesId,
  }));
  const key = await crypto.subtle.importKey("pkcs8", privateKeyBytes(configuration.privateKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function exchangeAppleAuthorizationCode(code: string, configuration: AppleOAuthConfiguration) {
  const clientSecret = await createAppleClientSecret(configuration);
  const body = new URLSearchParams({
    client_id: configuration.servicesId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: configuration.redirectUri,
  });
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json() as { id_token?: unknown; refresh_token?: unknown; error?: unknown };
  if (!response.ok || typeof result.id_token !== "string") throw new Error(typeof result.error === "string" ? result.error : "Apple token exchange failed");
  return {
    identityToken: result.id_token,
    refreshToken: typeof result.refresh_token === "string" ? result.refresh_token : null,
  };
}

function encryptionKeyBytes(value: string) {
  const normalized = value.trim().replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.trim().length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 32) throw new Error("APPLE_TOKEN_ENCRYPTION_KEY must contain 32 base64url bytes");
  return bytes;
}

export async function encryptAppleRefreshToken(token: string | null, encryptionKey: string) {
  if (!token) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(encryptionKey), "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return `v1.${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptAppleRefreshToken(value: string, encryptionKey: string) {
  const [version, encodedIv, encodedBody, extra] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedBody || extra) throw new Error("Invalid encrypted Apple token");
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(encryptionKey), "AES-GCM", false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64Url(encodedIv) }, key, decodeBase64Url(encodedBody));
  return new TextDecoder().decode(clear);
}

export async function revokeAppleRefreshToken(refreshToken: string, configuration: Omit<AppleOAuthConfiguration, "redirectUri">) {
  const clientSecret = await createAppleClientSecret(configuration);
  const response = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.servicesId,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Apple token revocation failed (${response.status})`);
}

