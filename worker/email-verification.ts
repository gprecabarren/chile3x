import { emailVerificationState } from "../lib/email-verification-policy";
import { createAccountToken, sendAccountEmail } from "../lib/account-email";
import { sha256 } from "../lib/auth";

export function verificationGuardExemptPath(path: string) {
  // Public files/verification/OAuth remain accessible; their own handlers still
  // enforce ownership and admin permission. Never whitelist normal account APIs.
  return path === "/verificar-correo" || path === "/ingresar" || path === "/registro"
    || path === "/recuperar-clave" || path === "/restablecer-clave" || path === "/reactivar-cuenta"
    || path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/")
    || path.startsWith("/api/auth/") || path.startsWith("/assets/")
    || path.startsWith("/_vinext/") || path.startsWith("/_next/") || path.startsWith("/media/")
    || /\.(?:css|js|woff2?|png|jpg|jpeg|webp|svg|ico|txt|xml|webmanifest)$/.test(path);
}

export async function enforceEmailVerification(request: Request, db: D1Database): Promise<Response | null> {
  const url = new URL(request.url);
  if (verificationGuardExemptPath(url.pathname)) return null;
  const token = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith("chile3x_user_session="))?.slice("chile3x_user_session=".length);
  const parts = token?.split(".");
  if (!parts || parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const user = await db.prepare(`SELECT u.role, u.created_at AS createdAt, u.email_verified_at AS emailVerifiedAt,
      u.email_verification_deadline AS emailVerificationDeadline, u.email_verification_exempt_at AS emailVerificationExemptAt
    FROM auth_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.token_hash = ? AND datetime(s.expires_at) > datetime(?) AND u.is_active = 1 LIMIT 1`)
    .bind(parts[0], await sha256(parts[1]), new Date().toISOString()).first<{
      role: string; createdAt: string; emailVerifiedAt: string | null; emailVerificationDeadline: string | null; emailVerificationExemptAt: string | null;
    }>();
  if (!user || emailVerificationState(user) !== "blocked") return null;
  const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
  if (url.pathname.startsWith("/api/") && !/application\/x-www-form-urlencoded|multipart\/form-data/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json({ error: "email_verification_required", message: "Verifica tu correo para recuperar el acceso.", verificationUrl: "/verificar-correo" }, { status: 403, headers });
  }
  return new Response(null, { status: 303, headers: { ...headers, location: new URL("/verificar-correo", request.url).toString() } });
}

const pendingAccount = "role <> 'admin' AND email_verified_at IS NULL AND email_verification_exempt_at IS NULL";

export async function trashLongBlockedProfiles(db: D1Database, now = new Date().toISOString()) {
  // One bounded atomic update. Re-check actual verification/exemption at write
  // time to avoid racing verification. Do not change moderation or delete R2.
  const { results } = await db.prepare(`UPDATE profiles SET trashed_at = ?, trashed_by_kind = 'email_verification',
      trashed_by_actor_id = NULL, trashed_by_admin_login = NULL, updated_at = ?
    WHERE trashed_at IS NULL AND id IN (SELECT p.id FROM profiles p JOIN users u ON u.id = p.owner_id
      WHERE p.trashed_at IS NULL AND u.role <> 'admin' AND u.email_verified_at IS NULL AND u.email_verification_exempt_at IS NULL
      AND julianday(coalesce(u.email_verification_deadline, datetime(u.created_at, '+7 days'))) <= julianday(?, '-31 days')
      ORDER BY u.email_verification_deadline, p.id LIMIT 50)
    RETURNING id, display_name`).bind(now, now, now).all<{ id: string; display_name: string }>();
  if (results.length) await db.batch(results.map(profile => db.prepare(`INSERT INTO admin_audit_logs
    (id, actor_email, actor_name, category, action, outcome, entity_type, entity_id, entity_label, summary, after_data)
    VALUES (?, 'sistema@chile3x.local', 'Sistema Chile3X', 'profiles', 'profile.trash_email_verification', 'success', 'profile', ?, ?, ?, ?)`)
    .bind(`audit_${crypto.randomUUID()}`, profile.id, profile.display_name, "Envió el anuncio a la papelera tras 31 días de bloqueo por correo sin verificar.", JSON.stringify({ trashedAt: now, origin: "email_verification", recoverable: true }))));
  return results.length;
}

export async function handleEmailVerificationScheduled(env: Env) {
  const now = new Date().toISOString();
  // Only 5 notices per tick; failures retry no more than hourly. The access
  // guard uses the deadline immediately, independent of email/cron availability.
  const { results } = await env.DB.prepare(`UPDATE users SET
      email_verification_blocked_at = coalesce(email_verification_blocked_at, email_verification_deadline, datetime(created_at, '+7 days')),
      email_verification_notice_attempt_at = ?
    WHERE id IN (SELECT id FROM users WHERE ${pendingAccount} AND is_active = 1
      AND julianday(coalesce(email_verification_deadline, datetime(created_at, '+7 days'))) <= julianday(?)
      AND email_verification_notice_at IS NULL
      AND (email_verification_notice_attempt_at IS NULL OR datetime(email_verification_notice_attempt_at) <= datetime(?, '-1 hour'))
      ORDER BY email_verification_deadline LIMIT 5)
    RETURNING id, email, display_name`).bind(now, now, now).all<{ id: string; email: string; display_name: string | null }>();
  for (const user of results) {
    try {
      const stillPending = await env.DB.prepare(`SELECT id FROM users WHERE id = ? AND ${pendingAccount}`).bind(user.id).first();
      if (!stillPending) continue;
      const token = await createAccountToken(user.id, "verify_email");
      const delivered = await sendAccountEmail({ email: user.email, displayName: user.display_name, purpose: "verify_email", token, blocked: true });
      if (delivered) await env.DB.prepare(`UPDATE users SET email_verification_notice_at = ? WHERE id = ? AND ${pendingAccount}`)
        .bind(new Date().toISOString(), user.id).run();
    } catch {
      console.error(JSON.stringify({ event: "email_verification.notice_failed", detail: "El recordatorio se reintentará en el siguiente ciclo elegible." }));
    }
  }
  await trashLongBlockedProfiles(env.DB, now);
}
