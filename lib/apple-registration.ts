import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { appleRegistrationIntents } from "@/db/schema";
import { sha256 } from "@/lib/auth";

export const APPLE_REGISTRATION_COOKIE = "chile3x_apple_registration";
const APPLE_REGISTRATION_DURATION_SECONDS = 10 * 60;

export type AppleRegistrationIdentity = {
  id: string;
  subject: string;
  email: string;
  displayName: string;
  fullName: string;
  refreshTokenEncrypted: string | null;
};

function splitToken(value: string | undefined) {
  if (!value) return null;
  const [id, secret, extra] = value.split(".");
  return id && secret && !extra ? { id, secret } : null;
}

export async function createAppleRegistrationIntent(identity: Omit<AppleRegistrationIdentity, "id">) {
  const id = `apple_registration_${crypto.randomUUID()}`;
  const secret = crypto.randomUUID() + crypto.randomUUID();
  const db = await getDb();
  await db.delete(appleRegistrationIntents).where(lt(appleRegistrationIntents.expiresAt, new Date().toISOString()));
  await db.insert(appleRegistrationIntents).values({
    id,
    tokenHash: await sha256(secret),
    appleSubject: identity.subject,
    email: identity.email,
    displayName: identity.displayName,
    fullName: identity.fullName,
    refreshTokenEncrypted: identity.refreshTokenEncrypted,
    expiresAt: new Date(Date.now() + APPLE_REGISTRATION_DURATION_SECONDS * 1000).toISOString(),
  });
  return { value: `${id}.${secret}`, maxAge: APPLE_REGISTRATION_DURATION_SECONDS };
}

export async function readAppleRegistrationIntent(value: string | undefined): Promise<AppleRegistrationIdentity | null> {
  const token = splitToken(value);
  if (!token) return null;
  const [record] = await (await getDb()).select({
    id: appleRegistrationIntents.id,
    subject: appleRegistrationIntents.appleSubject,
    email: appleRegistrationIntents.email,
    displayName: appleRegistrationIntents.displayName,
    fullName: appleRegistrationIntents.fullName,
    refreshTokenEncrypted: appleRegistrationIntents.refreshTokenEncrypted,
  }).from(appleRegistrationIntents).where(and(
    eq(appleRegistrationIntents.id, token.id),
    eq(appleRegistrationIntents.tokenHash, await sha256(token.secret)),
    gt(appleRegistrationIntents.expiresAt, new Date().toISOString()),
  )).limit(1);
  return record ? { ...record, displayName: record.displayName ?? "", fullName: record.fullName ?? "" } : null;
}

export async function consumeAppleRegistrationIntent(id: string) {
  await (await getDb()).delete(appleRegistrationIntents).where(eq(appleRegistrationIntents.id, id));
}

