import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accountTokens, authSessions, users } from "@/db/schema";
import { createOpaqueToken, sha256 } from "@/lib/auth";
import { recordOperationalEvent } from "@/lib/operations";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { isReservedTestEmail } from "@/lib/test-email";
import { emailVerificationState } from "@/lib/email-verification-policy";

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
  // A reminder must not invalidate a still-valid verification link in transit.
  await db.delete(accountTokens).where(and(eq(accountTokens.userId, userId), eq(accountTokens.purpose, purpose), purpose === "verify_email" ? sql`datetime(${accountTokens.expiresAt}) <= datetime('now')` : isNull(accountTokens.usedAt)));
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

export type PortalEmailNotification = {
  email: string;
  displayName?: string | null;
  subject: string;
  heading: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  note?: string;
  kind?: "account_verification" | "password_reset" | "profile_approved" | "account_disabled" | "city_alert" | "portal_notification";
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

export async function sendPortalEmail({ email, displayName, subject, heading, message, action, note, kind = "portal_notification" }: PortalEmailNotification) {
  if (isReservedTestEmail(email)) return false;
  const startedAt = performance.now();
  const finish = async (delivered: boolean, provider: string | null, detail: string) => {
    await recordOperationalEvent({
      category: "email",
      eventName: "portal.email",
      outcome: delivered ? "success" : "failure",
      durationMs: performance.now() - startedAt,
      detail,
      metadata: { provider, kind },
    });
    return delivered;
  };
  if (!isEmail(email)) return finish(false, null, "El destinatario no tenía un formato válido.");

  const { env } = await import("cloudflare:workers");
  const settings = await getSiteSettings();
  const replyTo = settings.contact_email.trim().toLowerCase();
  const name = displayName?.trim().replace(/[\r\n]+/g, " ") || "";
  const safeName = escapeHtml(name);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const safeNote = note ? escapeHtml(note) : "";
  const safeActionLabel = action ? escapeHtml(action.label) : "";
  const safeActionHref = action ? escapeHtml(action.href) : "";
  const greeting = name ? `Hola ${name},\n\n` : "";
  const text = `${greeting}${message}${action ? `\n\n${action.label}: ${action.href}` : ""}${note ? `\n\n${note}` : ""}`;
  const html = `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#171922"><p style="color:#d4151d;font-size:12px;font-weight:700;letter-spacing:.08em">CHILE3X</p><h1 style="font-family:Georgia,serif;font-weight:400">${safeHeading}</h1>${safeName ? `<p>Hola ${safeName},</p>` : ""}<p>${safeMessage}</p>${action ? `<p style="margin:28px 0"><a href="${safeActionHref}" style="display:inline-block;padding:13px 18px;background:#d4151d;color:#fff;text-decoration:none;font-weight:700">${safeActionLabel}</a></p>` : ""}${safeNote ? `<p style="font-size:13px;color:#5d6272">${safeNote}</p>` : ""}</main>`;
  const emailMessage: AccountEmailMessage = { email, subject, text, html, replyTo: isEmail(replyTo) ? replyTo : undefined };

  // The Google relay is deliberately first: Cloudflare's free Email Service
  // can accept a call without being able to deliver to arbitrary recipients.
  // For the beta, a successful Gmail relay is the definitive delivery path.
  if (await sendWithAppsScript(emailMessage, env.GOOGLE_APPS_SCRIPT_URL, env.GOOGLE_APPS_SCRIPT_SECRET)) {
    return finish(true, "google_relay", "Correo entregado mediante el relay principal.");
  }

  if (!env.EMAIL) return finish(false, null, "No había una alternativa de entrega disponible.");
  try {
    await env.EMAIL.send({
      to: email,
      from: { email: "noreply@chile3x.cl", name: "Chile3X" },
      subject,
      html,
      text,
    });
    return finish(true, "cloudflare_email", "Correo entregado mediante el servicio alternativo.");
  } catch (error) {
    console.error("Cloudflare portal email delivery failed", { subject, error });
    return finish(false, "cloudflare_email", "Las alternativas de entrega no pudieron completar el envío.");
  }
}

export async function sendAccountEmail({ email, displayName, purpose, token, blocked = false, exempt = false }: { email: string; displayName: string | null; purpose: AccountTokenPurpose; token: string; blocked?: boolean; exempt?: boolean }) {
  const settings = await getSiteSettings();
  const isVerification = purpose === "verify_email";
  const link = accountLink(isVerification ? "/api/auth/verificar-correo" : "/restablecer-clave", token, siteBaseUrl(settings.site_url));
  return sendPortalEmail({
    email,
    displayName,
    subject: isVerification ? blocked ? "Verifica tu correo para recuperar el acceso a Chile3X" : "Verifica tu correo en Chile3X" : "Restablece tu contraseña de Chile3X",
    heading: isVerification ? "Verifica tu correo" : "Restablece tu contraseña",
    message: isVerification ? blocked ? "El plazo de 7 días terminó y el acceso a tu cuenta está bloqueado hasta verificar el correo. Tus datos y fotos siguen guardados. Abre el botón Verificar correo y luego vuelve a Mi cuenta. Si el enlace venció, entra al sitio, inicia sesión y elige Reenviar enlace." : exempt ? "Tu cuenta tiene una excepción de acceso autorizada por administración. Verifica este correo para confirmar que te pertenece y proteger tus publicaciones." : "Ya puedes entrar a tu cuenta. Verifica este correo dentro de 7 días desde el registro para mantener el acceso y proteger tus publicaciones." : "Recibimos una solicitud para restablecer tu contraseña.",
    action: { label: isVerification ? "Verificar correo" : "Restablecer contraseña", href: link },
    note: isVerification ? blocked ? "El enlace vence en 24 horas. Tras 31 días de bloqueo continuo, los anuncios pasan a la papelera recuperable de administración; no se eliminan definitivamente." : "El enlace vence en 24 horas. Puedes reenviarlo desde Mi cuenta sin reiniciar el plazo de 7 días." : "El enlace vence en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.",
    kind: isVerification ? "account_verification" : "password_reset",
  });
}

export async function requestVerificationEmail(user: { id: string; email: string; displayName: string | null }) {
  const db = await getDb();
  const now = new Date().toISOString();
  // Atomic persistent throttle across requests/isolates, including failed sends.
  const claimed = await db.update(users).set({ emailVerificationLastSentAt: now }).where(and(
    eq(users.id, user.id), isNull(users.emailVerifiedAt),
    sql`(${users.emailVerificationLastSentAt} is null or datetime(${users.emailVerificationLastSentAt}) <= datetime(${now}, '-5 minutes'))`,
  )).returning({ id: users.id, role: users.role, createdAt: users.createdAt, emailVerifiedAt: users.emailVerifiedAt, emailVerificationDeadline: users.emailVerificationDeadline, emailVerificationExemptAt: users.emailVerificationExemptAt });
  if (!claimed.length) return false;
  const token = await createAccountToken(user.id, "verify_email");
  const state = emailVerificationState(claimed[0]);
  return sendAccountEmail({ email: user.email, displayName: user.displayName, purpose: "verify_email", token, blocked: state === "blocked", exempt: state === "exempt" });
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
  const consumed = await db.update(accountTokens).set({ usedAt: now }).where(and(eq(accountTokens.id, record.id), isNull(accountTokens.usedAt), gt(accountTokens.expiresAt, now))).returning({ id: accountTokens.id });
  if (!consumed.length) return false;
  await db.update(users).set({ emailVerifiedAt: now, emailVerificationBlockedAt: null }).where(eq(users.id, record.userId));
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
