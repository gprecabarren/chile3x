import { SAMPLE_TOKEN } from "./private-sample-policy";

const DOMAIN = "Chile3X:private-samples:v1";
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Enlace privado no válido.");
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0));
}
async function linkKey(source?: string) {
  if (source === undefined) {
    const { env } = await import("cloudflare:workers");
    source = env.X_SETTINGS_ENCRYPTION_KEY?.trim() ?? "";
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(source)) throw new Error("No está disponible el cifrado de enlaces privados.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${DOMAIN}:${source}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
// The sample ID is authenticated: a ciphertext cannot be moved to another row.
export async function encryptPrivateSampleToken(token: string, id: string, source?: string) {
  if (!SAMPLE_TOKEN.test(token)) throw new Error("Enlace privado no válido.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`${DOMAIN}:${id}`) }, await linkKey(source), new TextEncoder().encode(token));
  return `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}
export async function decryptPrivateSampleToken(value: string, id: string, source?: string) {
  const [version, nonce, data, extra] = value.split(".");
  if (version !== "v1" || !nonce || !data || extra || value.length > 512) throw new Error("Enlace privado no válido.");
  const iv = decode(nonce);
  if (iv.length !== 12) throw new Error("Enlace privado no válido.");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`${DOMAIN}:${id}`) }, await linkKey(source), decode(data));
  const token = new TextDecoder().decode(plaintext);
  if (!SAMPLE_TOKEN.test(token)) throw new Error("Enlace privado no válido.");
  return token;
}
