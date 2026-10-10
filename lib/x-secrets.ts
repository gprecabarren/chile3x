const context = new TextEncoder().encode("Chile3X:X:OAuth:ClientSecret:v1");

function encode(bytes: Uint8Array) {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join("")).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encrypted X configuration");
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), char => char.charCodeAt(0));
}

async function keyFrom(value: string, usage: "encrypt" | "decrypt") {
  const bytes = decode(value);
  if (bytes.byteLength !== 32) throw new Error("Invalid X settings encryption key");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [usage]);
}

export async function encryptXClientSecret(value: string, encryptionKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(encryptionKey, "encrypt");
  const body = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: context }, key, new TextEncoder().encode(value));
  return `v1.${encode(iv)}.${encode(new Uint8Array(body))}`;
}

export async function decryptXClientSecret(value: string, encryptionKey: string) {
  const [version, ivValue, bodyValue, extra] = value.split(".");
  if (version !== "v1" || !ivValue || !bodyValue || extra) throw new Error("Invalid encrypted X configuration");
  const iv = decode(ivValue), body = decode(bodyValue);
  if (iv.byteLength !== 12 || body.byteLength < 17) throw new Error("Invalid encrypted X configuration");
  const key = await keyFrom(encryptionKey, "decrypt");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: context }, key, body));
}

export function validXClientId(value: string) {
  return /^[A-Za-z0-9_+/=-]{8,180}$/.test(value);
}

export function validXClientSecret(value: string) {
  return /^[\x21-\x7e]{16,512}$/.test(value);
}
