import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { decryptXClientSecret, encryptXClientSecret } from "@/lib/x-secrets";

export const MAIL_SECRET_KEY = "mail_google_relay_secret_encrypted";
// Derive an independent key domain from the existing protected server key.
export async function mailEncryptionKey(source: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(source)) throw new Error("Falta la clave de cifrado del servidor.");
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`Chile3X:mail-settings:v1:${source}`)));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export const readMailCredentials = cache(async function readMailCredentials() {
  const { env } = await import("cloudflare:workers");
  const [stored] = await (await getDb()).select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, MAIL_SECRET_KEY)).limit(1);
  const source = env.X_SETTINGS_ENCRYPTION_KEY?.trim() ?? "";
  const encryptionReady = /^[A-Za-z0-9_-]{43}$/.test(source);
  return { secret: stored ? await decryptXClientSecret(stored.value, await mailEncryptionKey(source)) : env.GOOGLE_APPS_SCRIPT_SECRET || "", fallbackUrl: env.GOOGLE_APPS_SCRIPT_URL || "", encryptionReady, source: stored ? "panel" : "cloudflare" };
});
export async function encryptMailSecret(value: string) {
  const { env } = await import("cloudflare:workers");
  return encryptXClientSecret(value, await mailEncryptionKey(env.X_SETTINGS_ENCRYPTION_KEY?.trim() ?? ""));
}
