import { mobilePushKeys } from "../lib/mobile-push-keys";
import { MOBILE_PUSH_MESSAGES, readMobilePushSubscription, type MobilePushKind } from "../lib/mobile-push-policy";

type PushEnv = Pick<Env, "DB" | "X_SETTINGS_ENCRYPTION_KEY">;
type PushJob = { device_id: string; kind: MobilePushKind; revision: string; attempts: number };
type PushDevice = { endpoint: string; public_key: string; auth_secret: string };
const DELIVERY_TTL = 1800;
const DEVICE_MAX_AGE = 180 * 86400;

export async function deliverMobilePush(env: PushEnv) {
  const keys = await mobilePushKeys(env.X_SETTINGS_ENCRYPTION_KEY);
  if (!keys) return;
  const jobs = await env.DB.prepare(`UPDATE mobile_push_pending SET available_at=unixepoch()+240, attempts=attempts+1
    WHERE rowid IN (SELECT rowid FROM mobile_push_pending WHERE available_at<=unixepoch() ORDER BY available_at LIMIT 8)
    RETURNING device_id,kind,revision,attempts`).all<PushJob>();
  if (!jobs.results.length) return;
  const { default: webPush } = await import("web-push");
  await Promise.all(jobs.results.map(async ({ device_id, kind, revision, attempts }) => {
    const discard = () => env.DB.prepare("DELETE FROM mobile_push_pending WHERE device_id=? AND kind=? AND revision=?")
      .bind(device_id, kind, revision).run();
    // A queued delivery never grants access. Revalidate opt-in and role after
    // the claim, and avoid exposing message content or audit metadata in push.
    const device = await env.DB.prepare(`SELECT d.endpoint,d.public_key,d.auth_secret
      FROM mobile_push_devices d JOIN users u ON u.id=d.user_id
      JOIN mobile_push_pending p ON p.device_id=d.id
      WHERE d.id=? AND p.kind=? AND p.revision=? AND u.is_active=1
        AND d.updated_at>=unixepoch()-? AND p.requested_at>=unixepoch()-?
        AND CASE WHEN p.kind IN ('message','approved') OR (p.kind='test' AND u.role<>'admin') THEN u.role<>'admin'
          ELSE u.role='admin' AND (p.kind<>'audit' OR d.audit_enabled=1)
            AND EXISTS(SELECT 1 FROM admin_github_access a WHERE a.user_id=u.id AND a.is_active=1 AND a.access_level IN ('owner','administrator','moderator')) END`)
      .bind(device_id, kind, revision, DEVICE_MAX_AGE, DELIVERY_TTL).first<PushDevice>();
    if (!device || !MOBILE_PUSH_MESSAGES[kind] || attempts > 3) { await discard(); return; }
    const subscription = { endpoint: device.endpoint, keys: { p256dh: device.public_key, auth: device.auth_secret } };
    if (!readMobilePushSubscription(subscription)) { await discard(); return; }
    try {
      const details = webPush.generateRequestDetails(subscription, JSON.stringify({ ...MOBILE_PUSH_MESSAGES[kind], kind }), {
        vapidDetails: keys, contentEncoding: "aes128gcm", TTL: DELIVERY_TTL, topic: kind,
      });
      const headers = new Headers(Object.entries(details.headers).map(([key, value]) => [key, String(value)]));
      headers.delete("content-length");
      const response = await fetch(details.endpoint, { method: "POST", headers,
        body: details.body ? Uint8Array.from(details.body) : null, redirect: "manual", signal: AbortSignal.timeout(8000) });
      await response.body?.cancel();
      if (response.status === 404 || response.status === 410) {
        await env.DB.prepare("DELETE FROM mobile_push_devices WHERE id=? AND endpoint=? AND public_key=? AND auth_secret=?")
          .bind(device_id, device.endpoint, device.public_key, device.auth_secret).run();
      } else if (response.ok || (response.status >= 400 && response.status < 500 && ![401, 403, 429].includes(response.status))) {
        await discard();
      } else if (response.status === 401 || response.status === 403) {
        console.warn("Mobile push service denied request", { status: response.status });
      }
    } catch {
      console.warn("Mobile push service request failed");
    }
  }));
}

export async function purgeExpiredMobilePush(env: Pick<PushEnv, "DB">) {
  await env.DB.prepare("DELETE FROM mobile_push_devices WHERE id IN (SELECT id FROM mobile_push_devices WHERE updated_at<unixepoch()-? LIMIT 100)")
    .bind(DEVICE_MAX_AGE).run();
}
