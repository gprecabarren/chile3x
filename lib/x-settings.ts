import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { getSiteSettings } from "@/lib/site-settings";
import { decryptXClientSecret } from "@/lib/x-secrets";

export const X_CALLBACK_URL = "https://chile3x.cl/api/auth/x/callback";
export const X_PRIVATE_SECRET_SETTING = "x_oauth_client_secret_encrypted";

// This private setting is intentionally absent from siteSettingDefaults.
// Never return the secret/ciphertext to a client component or HTML form.
export const readXServerCredentials = cache(async function readXServerCredentials() {
  const { env } = await import("cloudflare:workers");
  const settings = await getSiteSettings();
  const [stored] = await (await getDb()).select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, X_PRIVATE_SECRET_SETTING)).limit(1);
  const encryptionKey = env.X_SETTINGS_ENCRYPTION_KEY?.trim() ?? "";
  const fallbackClientId = env.X_OAUTH_CLIENT_ID?.trim() || "";
  const clientId = settings.x_oauth_client_id.trim() || fallbackClientId;
  const clientSecret = stored ? await decryptXClientSecret(stored.value, encryptionKey) : env.X_OAUTH_CLIENT_SECRET?.trim() || "";
  return { clientId, fallbackClientId, clientSecret, encryptionReady: /^[A-Za-z0-9_-]{43}$/.test(encryptionKey), secretSource: stored ? "panel" : clientSecret ? "cloudflare" : "none" };
});

export async function getXAdminConfiguration() {
  try {
    const { clientId, clientSecret, encryptionReady, secretSource } = await readXServerCredentials();
    return { clientId, secretConfigured: Boolean(clientSecret), encryptionReady, secretSource, configurationError: false };
  } catch {
    return { clientId: "", secretConfigured: false, encryptionReady: false, secretSource: "none", configurationError: true };
  }
}
