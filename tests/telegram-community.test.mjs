import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateTelegramMessage } from "../lib/telegram-moderation.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const moderationConfig = {
  prohibitedTerms: "término bloqueado",
  maxLinksPerMessage: 2,
  floodMaxMessages: 8,
  strikeBanThreshold: 3,
  temporaryRestrictionMinutes: 180,
  autoBanEnabled: true,
};

test("Telegram moderation uses conservative escalating decisions", () => {
  const cleanContext = { recentMessageCount: 1, recentDuplicateCount: 1, recentStrikeCount: 0 };
  assert.equal(evaluateTelegramMessage("Hola a la comunidad", moderationConfig, cleanContext), null);
  assert.equal(evaluateTelegramMessage("Pásame tu código de verificación", moderationConfig, cleanContext)?.action, "restrict");
  assert.equal(evaluateTelegramMessage("Contenido infantil sexual", moderationConfig, cleanContext)?.action, "ban");
  assert.equal(evaluateTelegramMessage("https://a.cl https://b.cl https://c.cl", moderationConfig, cleanContext)?.action, "delete");
  assert.equal(evaluateTelegramMessage("término bloqueado", moderationConfig, { ...cleanContext, recentStrikeCount: 2 })?.action, "ban");
});

test("the webhook is secret-verified, size-limited, deduplicated and queued", async () => {
  const worker = await source("worker/telegram.ts");
  assert.match(worker, /x-telegram-bot-api-secret-token/);
  assert.match(worker, /secureSecretMatches/);
  assert.match(worker, /MAX_WEBHOOK_BYTES/);
  assert.match(worker, /TextEncoder\(\)\.encode\(rawPayload\)\.byteLength/);
  assert.match(worker, /INSERT OR IGNORE INTO telegram_webhook_updates/);
  assert.match(worker, /WHERE update_id = \? AND status = 'pending'/);
  assert.match(worker, /payload = '\{\}'/);
  assert.match(worker, /TELEGRAM_QUEUE\.send\(\{ type: "telegram\.update"/);
  assert.match(worker, /message\.retry/);
});

test("Telegram-originated admin actions enforce the site's granular capabilities", async () => {
  const worker = await source("worker/telegram.ts");
  assert.match(worker, /adminHasCapability/);
  assert.match(worker, /authorizedTelegramAdmin\(env, chatId, senderId, "telegram\.publish"\)/);
  assert.match(worker, /command === "\/rules" \? "telegram\.view" : "telegram\.moderate"/);
});

test("queue claims and unban transitions are atomic and preserve explicit revocations", async () => {
  const worker = await source("worker/telegram.ts");
  assert.match(worker, /WHERE id = \? AND status = 'pending'/);
  assert.match(worker, /claim\.meta\.changes/);
  assert.match(worker, /WHERE telegram_user_id = \? AND status = 'banned'/);
  assert.match(worker, /telegram_chat_id = \? AND status = 'banned'/);
});

test("public and administrative Telegram identities remain separate", async () => {
  const [schema, linking, worker, administratorsPage] = await Promise.all([source("db/schema.ts"), source("lib/telegram-linking.ts"), source("worker/telegram.ts"), source("app/admin/administradores/page.tsx")]);
  assert.match(schema, /telegramAccountLinks = sqliteTable\("telegram_account_links"/);
  assert.match(schema, /telegramAdminIdentities = sqliteTable\("telegram_admin_identities"/);
  assert.match(linking, /telegramAdminIdentities\.telegramUserId/);
  assert.match(linking, /telegramAccountLinks\.telegramUserId/);
  assert.match(worker, /admin_github_access/);
  assert.match(worker, /member\.status !== "administrator"/);
  assert.match(administratorsPage, /leftJoin\(telegramAdminIdentities/);
  assert.match(administratorsPage, /debe vincularlo desde su propia sesión/);
});

test("Members access requires an active verified account but no approved advertisement", async () => {
  const worker = await source("worker/telegram.ts");
  const joinFlow = worker.slice(worker.indexOf("async function processJoinRequest"), worker.indexOf("async function processMembershipUpdate"));
  assert.match(joinFlow, /tal\.status = 'linked'/);
  assert.match(joinFlow, /u\.is_active = 1/);
  assert.match(joinFlow, /u\.email_verified_at IS NOT NULL/);
  assert.match(joinFlow, /u\.role <> 'admin'/);
  assert.doesNotMatch(joinFlow, /profiles|approved/);
  assert.match(joinFlow, /approveChatJoinRequest/);
  assert.match(joinFlow, /declineChatJoinRequest/);
});

test("disabling and deleting an account revoke Telegram access without automatic re-entry", async () => {
  const [selfState, adminState, deletion, reactivation, worker] = await Promise.all([
    source("app/api/mi-cuenta/estado/route.ts"),
    source("app/api/admin/users/[userId]/estado/route.ts"),
    source("lib/account-deletion.ts"),
    source("app/api/auth/reactivate/route.ts"),
    source("worker/telegram.ts"),
  ]);
  for (const value of [selfState, adminState, deletion]) {
    assert.match(value, /revoke_member/);
    assert.match(value, /telegramOutboxJobs/);
  }
  assert.doesNotMatch(reactivation, /telegramAccountLinks|telegramMemberships|send_member_invite/);
  assert.match(worker, /permanent \? "banned" : "revoked"/);
});

test("Novedades synchronizes in both directions and stays separate from editorial news", async () => {
  const [schema, worker, adminPage, publicPage, sitemap] = await Promise.all([
    source("db/schema.ts"), source("worker/telegram.ts"), source("app/admin/telegram/page.tsx"), source("app/novedades/page.tsx"), source("app/sitemap.ts"),
  ]);
  assert.match(schema, /telegramBulletins = sqliteTable\("telegram_bulletins"/);
  assert.match(worker, /syncTelegramBulletin/);
  assert.match(worker, /outboxPublishBulletin/);
  assert.match(worker, /outboxEditBulletin/);
  assert.match(adminPage, /Novedades/);
  assert.match(publicPage, /telegramBulletins/);
  assert.match(sitemap, /\/novedades/);
  assert.doesNotMatch(schema.match(/telegramBulletins[\s\S]*?\n\s*\}\);/)?.[0] ?? "", /news/);
});

test("admins can ban linked identities from account details with explicit confirmation", async () => {
  const [page, route, worker] = await Promise.all([
    source("app/admin/cuentas/[userId]/page.tsx"), source("app/api/admin/users/[userId]/telegram/route.ts"), source("worker/telegram.ts"),
  ]);
  assert.match(page, /Escribe VETAR/);
  assert.match(page, /Retirar veto de Telegram/);
  assert.match(route, /accounts\.manage/);
  assert.match(route, /telegram\.moderate/);
  assert.match(route, /requiresExplicitReentry/);
  assert.match(worker, /role IN \('public', 'members'\)/);
});

test("the public Telegram link is shared by admin configuration, header and footer", async () => {
  const [settingsRoute, telegramRoute, directory, contacts] = await Promise.all([
    source("app/api/admin/settings/route.ts"), source("app/api/admin/telegram/configuracion/route.ts"), source("app/directorio/_components.tsx"), source("lib/site-contacts.ts"),
  ]);
  assert.match(settingsRoute, /telegramConfiguration/);
  assert.match(telegramRoute, /contact_telegram/);
  assert.match(directory, /PortalContactLinks placement="header"/);
  assert.match(directory, /PortalContactLinks placement="footer"/);
  assert.match(contacts, /contact_telegram/);
  assert.match(contacts, /label: "Telegram"/);
});

test("the Telegram Community uses two spaces and sends operational alerts privately", async () => {
  const [schema, worker, adminPage, chatRoute] = await Promise.all([
    source("db/schema.ts"), source("worker/telegram.ts"), source("app/admin/telegram/page.tsx"), source("app/api/admin/telegram/chats/[chatId]/route.ts"),
  ]);
  assert.match(schema, /enum: \["unassigned", "public", "members"\]/);
  assert.doesNotMatch(schema, /enum: \["unassigned", "public", "members", "alerts"\]/);
  assert.doesNotMatch(chatRoute, /"alerts"/);
  assert.doesNotMatch(adminPage, /Alertas administrativas|Sin chat de alertas/);
  assert.match(worker, /async function notifyModerationAdmins/);
  assert.match(worker, /telegram_admin_identities/);
  assert.match(worker, /"telegram\.moderate"/);
  assert.doesNotMatch(worker, /role = 'alerts'/);
  assert.match(worker, /SET role = 'unassigned', updates_thread_id = NULL, is_active = 0/);
  assert.match(adminPage, /telegramChats\.isActive, true/);
});

test("the bot username is displayed without exposing it to browser login autofill", async () => {
  const [adminPage, settingsRoute] = await Promise.all([
    source("app/admin/telegram/page.tsx"), source("app/api/admin/telegram/configuracion/route.ts"),
  ]);
  assert.match(adminPage, /className="telegram-readonly-field"/);
  assert.match(adminPage, /name="telegram_bot_username" type="hidden"/);
  assert.match(settingsRoute, /text\(formData, "telegram_bot_username", 64\)/);
});
