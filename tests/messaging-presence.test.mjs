import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("internal messaging is scoped, persistent and protected against cross-account access", async () => {
  const [schema, service, route, page, profile] = await Promise.all([
    source("db/schema.ts"),
    source("lib/internal-messages.ts"),
    source("app/api/mensajes/[conversationId]/route.ts"),
    source("app/mi-cuenta/mensajes/page.tsx"),
    source("app/perfil/[slug]/page.tsx"),
  ]);
  assert.match(schema, /messageConversations = sqliteTable\("message_conversations"/);
  assert.match(schema, /messageMessages = sqliteTable\("message_messages"/);
  assert.match(schema, /messageConversationPreferences = sqliteTable\("message_conversation_preferences"/);
  assert.match(schema, /senderRole: text\("sender_role"/);
  assert.match(schema, /profileId: text\("profile_id"\)\.references\([^\n]+onDelete: "set null"/);
  assert.match(schema, /senderUserId: text\("sender_user_id"\)\.references\([^\n]+onDelete: "set null"/);
  assert.match(service, /visitorUserId, userId/);
  assert.match(service, /ownerUserId, userId/);
  assert.match(service, /rate_limited/);
  assert.match(service, /blockedByAnyone/);
  assert.match(service, /countUnreadMessages/);
  assert.match(service, /Usuario de Chile3X/);
  assert.match(service, /senderRole/);
  assert.match(route, /assertSameOrigin/);
  assert.match(page, /Mensajería privada/i);
  assert.match(profile, /InternalChatButton/);
});

test("presence exposes only a recent boolean and expires automatically", async () => {
  const [schema, heartbeat, directory] = await Promise.all([
    source("db/schema.ts"), source("app/PresenceHeartbeat.tsx"), source("lib/directory.ts"),
  ]);
  assert.match(schema, /accountPresence = sqliteTable\("account_presence"/);
  assert.match(heartbeat, /ACTIVE_WINDOW = 90_000/);
  assert.match(heartbeat, /document\.visibilityState !== "visible"/);
  assert.match(directory, /onlineCutoff = new Date\(Date\.now\(\) - 3 \* 60_000\)/);
  assert.match(directory, /isOnline: onlineOwnerIds\.has/);
});

test("WhatsApp contact tracing is privacy-minimized and available to administrators", async () => {
  const [contact, activity, privacy] = await Promise.all([
    source("app/api/perfiles/[profileId]/contacto/route.ts"),
    source("app/admin/actividad/page.tsx"),
    source("app/privacidad/page.tsx"),
  ]);
  assert.match(contact, /analyticsConsent \? user\?\.id/);
  assert.match(contact, /chile3x_analytics_consent/);
  assert.match(contact, /sessionContextFromRequest/);
  assert.doesNotMatch(contact, /ipAddress:/);
  assert.match(activity, /Clics únicos en WhatsApp/);
  assert.match(privacy, /nunca se guarda la IP en ese registro/);
});

test("location preference asks for browser permission and stores only the covered city", async () => {
  const [selector, directory, shell, home] = await Promise.all([
    source("app/directorio/LocationPreference.tsx"), source("lib/directory.ts"), source("app/directorio/_components.tsx"), source("app/page.tsx"),
  ]);
  assert.match(selector, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(selector, /chile3x_preferred_city/);
  assert.doesNotMatch(selector, /document\.cookie.*latitude|document\.cookie.*longitude/);
  assert.match(directory, /Number\(right\.city === city\) - Number\(left\.city === city\)/);
  assert.doesNotMatch(shell.match(/export async function PublicHeader[\s\S]*?export async function DirectoryLocationPreference/)?.[0] ?? "", /<LocationPreference/);
  assert.match(shell, /export async function DirectoryLocationPreference/);
  assert.match(home, /home-location-summary/);
});

test("administrators receive filterable registration and profile notifications", async () => {
  const [schema, notifications, activity, register, profiles] = await Promise.all([
    source("db/schema.ts"), source("lib/admin-notifications.ts"), source("app/admin/actividad/page.tsx"), source("app/api/auth/register/route.ts"), source("lib/profile-submission.ts"),
  ]);
  assert.match(schema, /adminNotifications = sqliteTable\("admin_notifications"/);
  assert.match(notifications, /createAdminNotification/);
  assert.match(activity, /Notificaciones del sitio/);
  assert.match(activity, /notify_kind/);
  assert.match(activity, /notify_state/);
  assert.match(register, /account_registered/);
  assert.match(profiles, /profile_created/);
  assert.match(profiles, /profile_updated/);
});

test("disabled owners cannot be approved and Telegram usernames refresh from updates", async () => {
  const [statusRoute, detail, worker] = await Promise.all([
    source("app/api/admin/profiles/[profileId]/status/route.ts"),
    source("app/admin/cuentas/[userId]/page.tsx"),
    source("worker/telegram.ts"),
  ]);
  assert.match(statusRoute, /status === "approved" && !existingProfile\.ownerIsActive/);
  assert.match(detail, /account\.isActive && <Link/);
  assert.match(worker, /async function syncLinkedTelegramIdentity/);
  assert.match(worker, /UPDATE telegram_account_links SET username/);
  assert.match(worker, /UPDATE telegram_admin_identities SET username/);
});

test("Manrope is self-hosted without local filesystem URLs and non-critical JS is deferred", async () => {
  const [layout, styles, deferred] = await Promise.all([
    source("app/layout.tsx"), source("app/globals.css"), source("app/DeferredClientFeatures.tsx"),
  ]);
  assert.doesNotMatch(layout, /next\/font/);
  assert.match(styles, /\/fonts\/manrope-latin-variable\.woff2/);
  assert.doesNotMatch(styles, /C:\\Users|file:\/\//);
  assert.match(deferred, /requestIdleCallback/);
  assert.match(deferred, /dynamic\(\(\) => import\("\.\/PrivacyConsent"\)/);
  const consent = await source("app/PrivacyConsent.tsx");
  assert.match(consent, /deferGoogleTagManager/);
  assert.match(consent, /12_000/);
});
