import assert from "node:assert/strict";
import test from "node:test";
import {
  createAppleClientSecret,
  decryptAppleRefreshToken,
  encryptAppleRefreshToken,
  verifyAppleIdentity,
} from "../lib/apple-oauth.ts";

function base64url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

test("Apple identity tokens require signature, audience, nonce and verified email", async () => {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  Object.assign(jwk, { kid: "apple-test", alg: "RS256", use: "sig" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "cache-control": "max-age=3600" } });
  const nonce = "secure-apple-nonce-value-1234567890";
  const clientId = "cl.chile3x.web";
  const sign = async (overrides = {}) => {
    const header = base64url(JSON.stringify({ alg: "RS256", kid: "apple-test" }));
    const payload = base64url(JSON.stringify({
      iss: "https://appleid.apple.com",
      aud: clientId,
      sub: "apple-subject-123",
      email: "persona@privaterelay.appleid.com",
      email_verified: "true",
      nonce,
      iat: Math.floor(Date.now() / 1000) - 1,
      exp: Math.floor(Date.now() / 1000) + 300,
      ...overrides,
    }));
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${header}.${payload}`));
    return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
  };
  try {
    assert.deepEqual(await verifyAppleIdentity(await sign(), clientId, nonce), { subject: "apple-subject-123", email: "persona@privaterelay.appleid.com" });
    assert.equal(await verifyAppleIdentity(await sign({ aud: "cl.otro.web" }), clientId, nonce), null);
    assert.equal(await verifyAppleIdentity(await sign({ nonce: "other-secure-nonce-value-12345678" }), clientId, nonce), null);
    assert.equal(await verifyAppleIdentity(await sign({ email_verified: "false" }), clientId, nonce), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Apple client secrets use ES256 claims and refresh tokens are encrypted", async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(pkcs8).toString("base64")}\n-----END PRIVATE KEY-----`;
  const secret = await createAppleClientSecret({ servicesId: "cl.chile3x.web", teamId: "AB12CD34EF", keyId: "ZY98XW76VU", privateKey: pem });
  const [header, payload, signature] = secret.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), { alg: "ES256", kid: "ZY98XW76VU", typ: "JWT" });
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  assert.equal(claims.iss, "AB12CD34EF");
  assert.equal(claims.sub, "cl.chile3x.web");
  assert.equal(claims.aud, "https://appleid.apple.com");
  assert.equal(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, Buffer.from(signature, "base64url"), new TextEncoder().encode(`${header}.${payload}`)), true);

  const encryptionKey = Buffer.from(Uint8Array.from({ length: 32 }, (_, index) => index + 1)).toString("base64url");
  const encrypted = await encryptAppleRefreshToken("refresh-token-private", encryptionKey);
  assert.ok(encrypted?.startsWith("v1."));
  assert.doesNotMatch(encrypted, /refresh-token-private/);
  assert.equal(await decryptAppleRefreshToken(encrypted, encryptionKey), "refresh-token-private");
});

