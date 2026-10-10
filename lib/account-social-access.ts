import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accountAppleIdentities, accountAuthEvents, accountGoogleIdentities, accountXIdentities } from "@/db/schema";

export type SocialProvider = "google" | "apple" | "x";
export const socialProviderLabels = { google: "Google", apple: "Apple", x: "X" };

export async function getAccountSocialAccess(userId: string) {
  const db = await getDb();
  const [google, apple, x, events] = await Promise.all([
    db.select({ createdAt: accountGoogleIdentities.createdAt }).from(accountGoogleIdentities).where(eq(accountGoogleIdentities.userId, userId)).limit(1),
    db.select({ createdAt: accountAppleIdentities.createdAt }).from(accountAppleIdentities).where(eq(accountAppleIdentities.userId, userId)).limit(1),
    db.select({ createdAt: accountXIdentities.createdAt }).from(accountXIdentities).where(eq(accountXIdentities.userId, userId)).limit(1),
    db.select().from(accountAuthEvents).where(eq(accountAuthEvents.userId, userId)).orderBy(desc(accountAuthEvents.createdAt), desc(accountAuthEvents.id)).limit(30),
  ]);
  return { linked: { google: google[0] ?? null, apple: apple[0] ?? null, x: x[0] ?? null }, events };
}

// Do not silently undo an explicit unlink via the providers' legacy email matching.
export async function wasSocialProviderUnlinked(userId: string, provider: SocialProvider) {
  const [event] = await (await getDb()).select({ action: accountAuthEvents.action }).from(accountAuthEvents)
    .where(and(eq(accountAuthEvents.userId, userId), eq(accountAuthEvents.provider, provider)))
    .orderBy(desc(accountAuthEvents.createdAt), desc(accountAuthEvents.id)).limit(1);
  return event?.action === "unlinked";
}

export function authEventLabel(event: { provider: string; action: string }) {
  const provider = socialProviderLabels[event.provider as SocialProvider] ?? "Contraseña";
  return event.action === "unlinked" ? `${provider} desvinculado por la persona`
    : event.action === "linked" ? `${provider} vinculado por la persona`
    : event.action === "password_created" ? "Contraseña creada por la persona" : "Contraseña actualizada por la persona";
}
