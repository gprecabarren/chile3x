import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accountAppleIdentities } from "@/db/schema";
import { decryptAppleRefreshToken, revokeAppleRefreshToken } from "@/lib/apple-oauth";
import { getSiteSettings } from "@/lib/site-settings";

export async function revokeAppleGrantForUser(userId: string) {
  const [identity] = await (await getDb()).select({ refreshTokenEncrypted: accountAppleIdentities.refreshTokenEncrypted })
    .from(accountAppleIdentities).where(eq(accountAppleIdentities.userId, userId)).limit(1);
  if (!identity?.refreshTokenEncrypted) return false;
  const [settings, workers] = await Promise.all([getSiteSettings(), import("cloudflare:workers")]);
  const privateKey = workers.env.APPLE_PRIVATE_KEY?.trim() ?? "";
  const encryptionKey = workers.env.APPLE_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
  if (!settings.apple_services_id || !settings.apple_team_id || !settings.apple_key_id || !privateKey || !encryptionKey) throw new Error("Apple revocation configuration is incomplete");
  const refreshToken = await decryptAppleRefreshToken(identity.refreshTokenEncrypted, encryptionKey);
  await revokeAppleRefreshToken(refreshToken, {
    servicesId: settings.apple_services_id,
    teamId: settings.apple_team_id,
    keyId: settings.apple_key_id,
    privateKey,
  });
  return true;
}

