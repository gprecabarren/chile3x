import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { accountTokens, authSessions, users } from "@/db/schema";
import { createOpaqueToken, sha256 } from "@/lib/auth";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

export type AccountTokenPurpose = "verify_email" | "reset_password";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function createAccountToken(userId: string, purpose: AccountTokenPurpose) {
  const db = await getDb();
  const tokenId = crypto.randomUUID();
  const secret = createOpaqueToken();
  const hours = purpose === "verify_email" ? 24 : 1;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await db.delete(accountTokens).where(and(eq(accountTokens.userId, userId), eq(accountTokens.purpose, purpose), isNull(accountTokens.usedAt)));
  await db.insert(accountTokens).values({
    id: tokenId,
    userId,
    purpose,
    tokenHash: await sha256(secret),
    expiresAt,
  });
  return `${tokenId}.${secret}`;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function accountLink(pathname: string, token: string, siteUrl: string) {
  const url = new URL(pathname, siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

type AccountEmailMessage = {
  email: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

async function sendWithAppsScript(message: AccountEmailMessage, relayUrl?: string, relaySecret?: string) {
  if (!relayUrl || !relaySecret) return false;

  try {
    const response = await fetch(relayUrl, {
      method: "POST",
      // Apps Script accepts plain text reliably and still lets its handler read
      // the JSON payload. The shared secret blocks anonymous relay abuse.
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        secret: relaySecret,
        to: message.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Google Apps Script email relay returned an error", { status: response.status });
      return false;
    }

    const result = await response.json().catch(() => null) as { ok?: unknown } | null;
    return result?.ok === true;
  } catch (error) {
    console.error("Google Apps Script email relay failed", { error });
    return false;
  }
}

export async function sendAccountEmail({ email, displayName, purpose, token }: { email: string; displayName: string | null; purpose: AccountTokenPurpose; token: string }) {
  const { env } = await import("cloudflare:workers");
  const settings = await getSiteSettings();
  const link = accountLink(purpose === "verify_email" ? "/api/auth/verificar-correo" : "/restablecer-clave", token, siteBaseUrl(settings.site_url));
  const replyTo = settings.contact_email.trim().toLowerCase();
  const firstName = escapeHtml(displayName?.trim() || "");
  const isVerification = purpose === "verify_email";
  const subject = isVerification ? "Verifica tu correo en Chile3X" : "Restablece tu contraseña de Chile3X";
  const action = isVerification ? "Verificar correo" : "Restablecer contraseña";
  const text = `${firstName ? `Hola ${displayName},\n\n` : ""}${isVerification ? "Confirma tu correo para activar tu cuenta." : "Recibimos una solicitud para restablecer tu contraseña."}\n\n${action}: ${link}\n\n${isVerification ? "Este enlace vence en 24 horas." : "Este enlace vence en 1 hora. Si no solicitaste este cambio, ignora este correo."}`;
  const html = `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#171922"><p style="color:#d4151d;font-size:12px;font-weight:700;letter-spacing:.08em">CHILE3X</p><h1 style="font-family:Georgia,serif;font-weight:400">${isVerification ? "Verifica tu correo" : "Restablece tu contraseña"}</h1>${firstName ? `<p>Hola ${firstName},</p>` : ""}<p>${isVerification ? "Confirma tu correo para activar tu cuenta y proteger tus publicaciones." : "Recibimos una solicitud para restablecer tu contraseña."}</p><p style="margin:28px 0"><a href="${link}" style="display:inline-block;padding:13px 18px;background:#d4151d;color:#fff;text-decoration:none;font-weight:700">${action}</a></p><p style="font-size:13px;color:#5d6272">${isVerification ? "El enlace vence en 24 horas." : "El enlace vence en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo."}</p></main>`;
  const message: AccountEmailMessage = { email, subject, text, html, replyTo: isEmail(replyTo) ? replyTo : undefined };

  // The Google relay is deliberately first: Cloudflare's free Email Service
  // can accept a call without being able to deliver to arbitrary recipients.
  // For the beta, a successful Gmail relay is the definitive delivery path.
  if (await sendWithAppsScript(message, env.GOOGLE_APPS_SCRIPT_URL, env.GOOGLE_APPS_SCRIPT_SECRET)) return true;

  if (!env.EMAIL) return false;
  try {
    await env.EMAIL.send({
      to: email,
      from: { email: "noreply@chile3x.cl", name: "Chile3X" },
      replyTo: isEmail(replyTo) ? replyTo : undefined,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("Cloudflare account email delivery failed", { purpose, error });
    return false;
  }
}

export async function verifyEmailToken(token: string) {
  const [id, secret] = token.split(".");
  if (!id || !secret) return false;
  const db = await getDb();
  const [record] = await db.select({ id: accountTokens.id, userId: accountTokens.userId }).from(accountTokens).where(and(
    eq(accountTokens.id, id),
    eq(accountTokens.purpose, "verify_email"),
    eq(accountTokens.tokenHash, await sha256(secret)),
    isNull(accountTokens.usedAt),
    gt(accountTokens.expiresAt, new Date().toISOString()),
  )).limit(1);
  if (!record) return false;
  const now = new Date().toISOString();
  await db.update(accountTokens).set({ usedAt: now }).where(eq(accountTokens.id, record.id));
  await db.update(users).set({ emailVerifiedAt: now }).where(eq(users.id, record.userId));
  return true;
}

export async function resetPasswordWithToken(token: string, passwordHash: string) {
  const [id, secret] = token.split(".");
  if (!id || !secret) return false;
  const db = await getDb();
  const [record] = await db.select({ id: accountTokens.id, userId: accountTokens.userId }).from(accountTokens).where(and(
    eq(accountTokens.id, id),
    eq(accountTokens.purpose, "reset_password"),
    eq(accountTokens.tokenHash, await sha256(secret)),
    isNull(accountTokens.usedAt),
    gt(accountTokens.expiresAt, new Date().toISOString()),
  )).limit(1);
  if (!record) return false;
  const now = new Date().toISOString();
  await db.update(accountTokens).set({ usedAt: now }).where(eq(accountTokens.id, record.id));
  await db.update(users).set({ passwordHash, emailVerifiedAt: now }).where(eq(users.id, record.userId));
  await db.delete(authSessions).where(eq(authSessions.userId, record.userId));
  return true;
}
