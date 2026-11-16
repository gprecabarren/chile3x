const noticeDestinations = new Set([
  "/",
  "/mi-cuenta/mensajes",
  "/mi-cuenta#mis-anuncios",
  "/admin/actividad?notify_state=unread&notify_kind=account_registered#notificaciones",
  "/admin/actividad?notify_state=unread#notificaciones",
  "/admin/actividad#eventos-administrativos",
]);

self.addEventListener("push", event => {
  let notice;
  try { notice = event.data?.json(); } catch { return; }
  if (typeof notice?.body !== "string" || !noticeDestinations.has(notice.url)) return;
  event.waitUntil(self.registration.showNotification("Chile3X", {
    body: notice.body,
    icon: "/chile3x-favicon-192-20261020.png",
    tag: notice.kind,
    data: { url: notice.url },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!noticeDestinations.has(url)) return;
  const target = new URL(url, self.location.origin);
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => client.url === target.href);
    if (existing) await existing.focus();
    else await clients.openWindow(target.href);
  })());
});
