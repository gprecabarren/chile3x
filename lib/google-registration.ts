import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { googleRegistrationIntents } from "@/db/schema";
import { createOpaqueToken, sha256 } from "@/lib/auth";

export const GOOGLE_REGISTRATION_COOKIE = "chile3x_google_registration";
const GOOGLE_REGISTRATION_DURATION_SECONDS = 10 * 60;

export type GoogleRegistrationIdentity = {
  id: string;
  subject: string;
  email: string;
  displayName: string;
  fullName: string;
};

export function splitGoogleRegistrationToken(value: string | undefined) {
  if (!value) return null;
  const [id, secret, extra] = value.split(".");
  return id && secret && !extra ? { id, secret } : null;
}

export async function createGoogleRegistrationIntent(identity: Omit<GoogleRegistrationIdentity, "id">) {
  const id = `google_registration_${crypto.randomUUID()}`;
  const secret = createOpaqueToken();
  const db = await getDb();
  await db.delete(googleRegistrationIntents).where(lt(googleRegistrationIntents.expiresAt, new Date().toISOString()));
  await db.insert(googleRegistrationIntents).values({
    id,
    tokenHash: await sha256(secret),
    googleSubject: identity.subject,
    email: identity.email,
    displayName: identity.displayName,
    fullName: identity.fullName,
    expiresAt: new Date(Date.now() + GOOGLE_REGISTRATION_DURATION_SECONDS * 1000).toISOString(),
  });
  return { value: `${id}.${secret}`, maxAge: GOOGLE_REGISTRATION_DURATION_SECONDS };
}

export async function readGoogleRegistrationIntent(value: string | undefined): Promise<GoogleRegistrationIdentity | null> {
  const token = splitGoogleRegistrationToken(value);
  if (!token) return null;
  const [record] = await (await getDb()).select({
    id: googleRegistrationIntents.id,
    subject: googleRegistrationIntents.googleSubject,
    email: googleRegistrationIntents.email,
    displayName: googleRegistrationIntents.displayName,
    fullName: googleRegistrationIntents.fullName,
  }).from(googleRegistrationIntents).where(and(
    eq(googleRegistrationIntents.id, token.id),
    eq(googleRegistrationIntents.tokenHash, await sha256(token.secret)),
    isNull(googleRegistrationIntents.usedAt),
    gt(googleRegistrationIntents.expiresAt, new Date().toISOString()),
  )).limit(1);
  return record ? { ...record, displayName: record.displayName ?? "", fullName: record.fullName ?? "" } : null;
}

export async function consumeGoogleRegistrationIntent(id: string) {
  await (await getDb()).delete(googleRegistrationIntents).where(eq(googleRegistrationIntents.id, id));
}
