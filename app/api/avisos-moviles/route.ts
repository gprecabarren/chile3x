import { assertSameOrigin, getCurrentAdmin, getCurrentUser, sha256 } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { readBoundedJson, RequestBodyError } from "@/lib/bounded-json";
import { mobilePushKeys } from "@/lib/mobile-push-keys";
import { readMobilePushSubscription } from "@/lib/mobile-push-policy";
import { browserSessionKey, browserSessionState, parseSessionToken } from "@/lib/session-policy";

const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
const reply = (body: object, status = 200) => Response.json(body, { headers, status });

async function context(request: Request) {
  const cookie = request.headers.get("cookie");
  const session = browserSessionState(cookie);
  const token = parseSessionToken(session.entries.find(entry => entry.value)?.value);
  const browserKey = browserSessionKey(cookie);
  if (session.conflict || !session.mode || !token || !browserKey) return null;
  const admin = session.mode === "admin" ? await getCurrentAdmin() : null;
  if (session.mode === "admin" && !adminHasCapability(admin, "audit.view")) return null;
  const user = admin ?? await getCurrentUser();
  if (!user) return null;
  const { env } = await import("cloudflare:workers");
  return { db: env.DB, secret: env.X_SETTINGS_ENCRYPTION_KEY, user, sessionId: token.id, browserHash: await sha256(browserKey) };
}

export async function GET(request: Request) {
  const viewer = await context(request);
  if (!viewer) return reply({ error: "Vuelve a iniciar sesión para configurar los avisos." }, 403);
  const keys = await mobilePushKeys(viewer.secret);
  if (!keys) return reply({ error: "Las notificaciones móviles aún no están disponibles." }, 503);
  const device = await viewer.db.prepare("SELECT audit_enabled FROM mobile_push_devices WHERE browser_key_hash=? AND user_id=?")
    .bind(viewer.browserHash, viewer.user.id).first<{ audit_enabled: number }>();
  return reply({ publicKey: keys.publicKey, enabled: Boolean(device), auditEnabled: device?.audit_enabled === 1 });
}

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return reply({ error: "Solicitud no válida." }, 403); }
  const viewer = await context(request);
  if (!viewer) return reply({ error: "Vuelve a iniciar sesión para configurar los avisos." }, 403);
  let body: unknown;
  try { body = await readBoundedJson(request, 4096); }
  catch (error) {
    if (error instanceof RequestBodyError) return reply({ error: error.message }, error.status);
    throw error;
  }
  if (!body || typeof body !== "object" || !("action" in body)) return reply({ error: "Solicitud no válida." }, 400);
  const { db, browserHash, user, sessionId } = viewer;
  if (body.action === "disable") {
    await db.prepare("DELETE FROM mobile_push_devices WHERE browser_key_hash=? AND user_id=?")
      .bind(browserHash, user.id).run();
    return reply({ enabled: false });
  }
  if (body.action === "test") {
    const device = await db.prepare("SELECT id FROM mobile_push_devices WHERE browser_key_hash=? AND user_id=?")
      .bind(browserHash, user.id).first<{ id: string }>();
    if (!device) return reply({ error: "Activa primero las notificaciones de este dispositivo." }, 409);
    await db.prepare(`INSERT INTO mobile_push_pending(device_id,kind)
      SELECT id,'test' FROM mobile_push_devices WHERE id=? ON CONFLICT(device_id,kind) DO NOTHING`).bind(device.id).run();
    return reply({ queued: true });
  }
  if (body.action !== "enable" || !("subscription" in body)) return reply({ error: "Solicitud no válida." }, 400);
  if (!(await mobilePushKeys(viewer.secret))) return reply({ error: "Las notificaciones móviles aún no están disponibles." }, 503);
  const subscription = readMobilePushSubscription(body.subscription);
  if (!subscription) return reply({ error: "El navegador entregó una suscripción no compatible." }, 400);
  const audit = user.role === "admin" && "audit" in body && body.audit === true;
  const result = await db.prepare(`INSERT INTO mobile_push_devices(id,browser_key_hash,user_id,endpoint,public_key,auth_secret,audit_enabled)
    SELECT ?,browser_key_hash,user_id,?,?,?,? FROM auth_sessions
    WHERE id=? AND browser_key_hash=? AND user_id=? AND datetime(expires_at)>datetime('now')
    ON CONFLICT(browser_key_hash) DO UPDATE SET endpoint=excluded.endpoint,public_key=excluded.public_key,
      auth_secret=excluded.auth_secret,audit_enabled=excluded.audit_enabled,updated_at=unixepoch()
    WHERE mobile_push_devices.user_id=excluded.user_id`)
    .bind(crypto.randomUUID(), subscription.endpoint, subscription.publicKey, subscription.authSecret, Number(audit), sessionId, browserHash, user.id)
    .run().catch(() => null);
  if (!result?.meta.changes) return reply({ error: "No se pudo activar este dispositivo. Vuelve a iniciar sesión y reintenta." }, 409);
  if (!audit) {
    await db.prepare("DELETE FROM mobile_push_pending WHERE kind='audit' AND device_id IN (SELECT id FROM mobile_push_devices WHERE browser_key_hash=? AND user_id=? AND audit_enabled=0)")
      .bind(browserHash, user.id).run();
  }
  return reply({ enabled: true, auditEnabled: audit });
}
