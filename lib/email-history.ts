import { eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminGithubAccess, adminGithubIdentities, emailDeliveryLogs, users } from "@/db/schema";
import { historySubject, safeEmailAttempts, type EmailAttempt, type EmailKind } from "@/lib/email-history-policy";
import { recordOperationalEvent } from "@/lib/operations";

export async function beginEmailHistory(input: { email: string; subject: string; kind: EmailKind; startedAt: string }) {
  try {
    const db = await getDb();
    const recipient = input.email.trim().toLowerCase().slice(0, 254);
    const [account] = await db.select({ id: users.id, role: users.role, accessLevel: adminGithubAccess.accessLevel }).from(users)
      .leftJoin(adminGithubIdentities, eq(adminGithubIdentities.userId, users.id))
      .leftJoin(adminGithubAccess, eq(adminGithubAccess.userId, users.id))
      .where(or(eq(sql`lower(${users.email})`, recipient), eq(sql`lower(${adminGithubIdentities.githubEmail})`, recipient), eq(sql`lower(${adminGithubAccess.protectedEmail})`, recipient))).limit(1);
    const id = `email_${crypto.randomUUID()}`;
    const audience = account ? account.role === "admin" ? account.accessLevel === "owner" ? "owner" : "admin" : "account" : "other";
    await db.insert(emailDeliveryLogs).values({ id, recipient, userId: account?.id ?? null, audience, kind: input.kind, subject: historySubject(input.subject), status: "sending", createdAt: input.startedAt });
    return id;
  } catch {
    await recordOperationalEvent({ category: "email", eventName: "email.history", outcome: "failure", detail: "No pudo iniciarse el registro de un correo; no se copian destinatarios ni mensajes al diagnóstico." });
    return null;
  }
}

export async function finishEmailHistory(id: string | null, input: { status: "accepted" | "failed" | "skipped"; provider: EmailAttempt["provider"] | null; detail: string; durationMs: number; attempts: EmailAttempt[] }) {
  if (!id) return;
  try {
    await (await getDb()).update(emailDeliveryLogs).set({
      status: input.status, provider: input.provider, detail: input.detail.slice(0, 300),
      durationMs: Math.max(0, Math.round(input.durationMs)), attempts: safeEmailAttempts(input.attempts), finishedAt: new Date().toISOString(),
    }).where(eq(emailDeliveryLogs.id, id));
  } catch {
    await recordOperationalEvent({ category: "email", eventName: "email.history", outcome: "failure", detail: "No pudo finalizarse el registro de un correo; su estado queda sin confirmar." });
  }
}
