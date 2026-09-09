import assert from "node:assert/strict";
import test from "node:test";
import { verifyGoogleCredential } from "../lib/google-auth.ts";

function base64url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function fixture() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });
  const sign = async (overrides = {}) => {
    const header = base64url(JSON.stringify({ alg: "RS256", kid: "test-key" }));
    const payload = base64url(JSON.stringify({
      iss: "https://accounts.google.com",
      aud: "test-client.apps.googleusercontent.com",
      azp: "test-client.apps.googleusercontent.com",
      sub: "google-subject-123",
      email: "persona@gmail.com",
      email_verified: true,
      name: "Persona de Prueba",
      nonce: "nonce-with-at-least-thirty-two-characters",
      iat: Math.floor(Date.now() / 1000) - 1,
      exp: Math.floor(Date.now() / 1000) + 300,
      ...overrides,
    }));
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${header}.${payload}`));
    return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
  };
  return { jwk, sign };
}

test("Google credentials require a valid signature, audience, nonce and verified email", async () => {
  const { jwk, sign } = await fixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "cache-control": "max-age=3600" } });
  try {
    const nonce = "nonce-with-at-least-thirty-two-characters";
    const valid = await verifyGoogleCredential(await sign(), "test-client.apps.googleusercontent.com", nonce);
    assert.deepEqual(valid, {
      subject: "google-subject-123",
      email: "persona@gmail.com",
      displayName: "Persona de Prueba",
      fullName: "Persona de Prueba",
    });
    assert.equal(await verifyGoogleCredential(await sign({ aud: "other-client" }), "test-client.apps.googleusercontent.com", nonce), null);
    assert.equal(await verifyGoogleCredential(await sign({ nonce: "another-secure-nonce-value-12345678" }), "test-client.apps.googleusercontent.com", nonce), null);
    assert.equal(await verifyGoogleCredential(await sign({ email_verified: false }), "test-client.apps.googleusercontent.com", nonce), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
