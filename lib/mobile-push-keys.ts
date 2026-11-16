import { createECDH } from "node:crypto";

/** The existing Worker secret stays server-side. A domain-specific HMAC
 * derives a separate stable signing key so the free deployment needs no new provider. */
export async function mobilePushKeys(secret: string | undefined) {
  secret = secret?.trim();
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return null;
  const bytes = new TextEncoder();
  const root = await crypto.subtle.importKey("raw", bytes.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const curve = createECDH("prime256v1");
  for (let attempt = 0; attempt < 4; attempt++) {
    const privateKey = Buffer.from(await crypto.subtle.sign("HMAC", root, bytes.encode(`Chile3X:web-push:v1:${attempt}`)));
    try {
      curve.setPrivateKey(privateKey);
      return { publicKey: curve.getPublicKey().toString("base64url"), privateKey: privateKey.toString("base64url"), subject: "https://chile3x.cl" };
    } catch (error) {
      if ((error as {code?: string}).code !== "ERR_CRYPTO_INVALID_KEYTYPE") throw error;
    }
  }
  return null;
}
