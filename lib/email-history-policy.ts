import { adminHasCapability, type AdminAccessLevel } from "./admin-permissions.ts";

export const EMAIL_KINDS = {
  account_verification: "Verificación de correo",
  password_reset: "Restablecimiento de contraseña",
  profile_approved: "Anuncio aprobado",
  account_disabled: "Cuenta deshabilitada",
  city_alert: "Alerta de ciudad",
  portal_notification: "Notificación del portal",
  moderation_alert: "Alerta de moderación al equipo",
} as const;
export type EmailKind = keyof typeof EMAIL_KINDS;
export const EMAIL_STATUSES = { sending: "En proceso / sin resultado", accepted: "Aceptado por el servicio", failed: "Envío fallido", skipped: "Envío omitido" } as const;
export const EMAIL_PROVIDERS = { google_relay: "Google · relay", cloudflare_email: "Cloudflare Email" } as const;
export const EMAIL_AUDIENCES = { account: "Usuario del sitio", admin: "Administrador", owner: "Propietario", other: "Otro destinatario" } as const;
export type EmailAttempt = { provider: keyof typeof EMAIL_PROVIDERS; accepted: boolean; code: string; messageId?: string };

export function canViewEmailHistory(admin: { accessLevel: AdminAccessLevel; isProtectedOwner?: boolean } | null) {
  return adminHasCapability(admin, "accounts.manage") && adminHasCapability(admin, "audit.view") && adminHasCapability(admin, "private.view");
}

// Never serialize arbitrary provider errors, message bodies or authentication URLs.
export function safeEmailAttempts(attempts: readonly EmailAttempt[]) {
  return JSON.stringify(attempts.slice(0, 3).map(attempt => ({
    provider: Object.hasOwn(EMAIL_PROVIDERS, attempt.provider) ? attempt.provider : "cloudflare_email",
    accepted: attempt.accepted === true,
    code: /^[A-Z0-9_]{1,60}$/.test(attempt.code) ? attempt.code : "PROVIDER_ERROR",
    ...(attempt.messageId && /^[\w.@<>-]{1,200}$/.test(attempt.messageId) ? { messageId: attempt.messageId } : {}),
  })));
}

export function parseEmailAttempts(value: string | null): EmailAttempt[] {
  try {
    const items = JSON.parse(value ?? "[]");
    if (!Array.isArray(items)) return [];
    return JSON.parse(safeEmailAttempts(items.filter(item => item && typeof item === "object"))) as EmailAttempt[];
  } catch { return []; }
}

export function emailErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^E_[A-Z_]{1,55}$/.test(error.code)) return error.code;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return "PROVIDER_TIMEOUT";
  return "PROVIDER_ERROR";
}

export function historySubject(value: string) {
  return value.replace(/https?:\/\/\S+/gi, "[enlace protegido]").replace(/[\r\n\t]+/g, " ").trim().slice(0, 200);
}
