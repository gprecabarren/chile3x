export const MOBILE_PUSH_MESSAGES = {
  message: { body: "Tienes un mensaje nuevo.", url: "/mi-cuenta/mensajes" },
  approved: { body: "Se aprobó uno de tus anuncios.", url: "/mi-cuenta#mis-anuncios" },
  registration: { body: "Hay un nuevo registro.", url: "/admin/actividad?notify_state=unread&notify_kind=account_registered#notificaciones" },
  moderation: { body: "Hay novedades para revisar.", url: "/admin/actividad?notify_state=unread#notificaciones" },
  audit: { body: "Hay movimientos en el historial administrativo.", url: "/admin/actividad#eventos-administrativos" },
  test: { body: "Tu dispositivo recibe las notificaciones de Chile3X.", url: "/" },
} as const;

export type MobilePushKind = keyof typeof MOBILE_PUSH_MESSAGES;

const pushProviders = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "notify.windows.com",
  "web.push.apple.com",
]);

export function readMobilePushSubscription(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const values = input as Record<string, unknown>;
  if (typeof values.endpoint !== "string" || values.endpoint.length > 2048
    || !values.keys || typeof values.keys !== "object") return null;
  const keys = values.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== "string" || !/^B[A-Za-z0-9_-]{86}$/.test(keys.p256dh)
    || typeof keys.auth !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(keys.auth)) return null;
  let url: URL;
  try { url = new URL(values.endpoint); } catch { return null; }
  const supported = pushProviders.has(url.hostname) || url.hostname.endsWith(".notify.windows.com")
    || url.hostname.endsWith(".push.apple.com");
  if (!supported || url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return null;
  return { endpoint: url.href, publicKey: keys.p256dh, authSecret: keys.auth };
}
