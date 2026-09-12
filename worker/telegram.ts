import { evaluateTelegramMessage, telegramLinkCount, type TelegramModerationDecision } from "../lib/telegram-moderation";
import { formatBulletinForTelegram, parseBulletinFromTelegram, type TelegramQueueMessage } from "../lib/telegram";
import { adminHasCapability, isAdminAccessLevel, type AdminCapability } from "../lib/admin-permissions";

const TELEGRAM_WEBHOOK_PATH = "/api/telegram/webhook";
const MAX_WEBHOOK_BYTES = 512 * 1024;

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  is_forum?: boolean;
};

type TelegramMessage = {
  message_id: number;
  message_thread_id?: number;
  date: number;
  text?: string;
  caption?: string;
  from?: TelegramUser;
  chat: TelegramChat;
  reply_to_message?: TelegramMessage;
};

type TelegramChatMemberUpdated = {
  chat: TelegramChat;
  from: TelegramUser;
  old_chat_member: { user: TelegramUser; status: string };
  new_chat_member: { user: TelegramUser; status: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  chat_join_request?: { chat: TelegramChat; from: TelegramUser; date: number };
  chat_member?: TelegramChatMemberUpdated;
  my_chat_member?: TelegramChatMemberUpdated;
};

type TelegramConfigurationRow = {
  bot_username: string;
  public_community_url: string;
  rules_text: string;
  prohibited_terms: string;
  moderation_enabled: number;
  auto_ban_enabled: number;
  flood_max_messages: number;
  flood_window_seconds: number;
  duplicate_window_seconds: number;
  max_links_per_message: number;
  strike_ban_threshold: number;
  temporary_restriction_minutes: number;
};

type TelegramChatRow = {
  id: string;
  telegram_chat_id: string;
  role: "unassigned" | "public" | "members";
  title: string;
  updates_thread_id: string | null;
  bot_is_administrator: number;
};

type TelegramApiEnvelope = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

function jsonResponse(value: Record<string, unknown>, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  return isRecord(value) && Number.isSafeInteger(value.update_id);
}

function updateType(update: TelegramUpdate) {
  if (update.edited_message) return "edited_message";
  if (update.message) return "message";
  if (update.chat_join_request) return "chat_join_request";
  if (update.chat_member) return "chat_member";
  if (update.my_chat_member) return "my_chat_member";
  return "other";
}

async function sha256Bytes(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

async function sha256Hex(value: string) {
  const digest = await sha256Bytes(value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function secureSecretMatches(provided: string, expected: string) {
  const [providedHash, expectedHash] = await Promise.all([sha256Bytes(provided), sha256Bytes(expected)]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

function telegramId(value: number) {
  return Number.isSafeInteger(value) ? String(value) : "";
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 400) : "Error desconocido";
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value).slice(0, 4_000);
  } catch {
    return null;
  }
}

async function telegramApi(env: Env, method: string, payload: Record<string, unknown>) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("El token del bot no está configurado.");
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const parsed: unknown = await response.json().catch(() => null);
  const envelope: TelegramApiEnvelope = isRecord(parsed) ? {
    ok: parsed.ok === true,
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    result: parsed.result,
  } : { ok: false, description: "Respuesta inválida de Telegram" };
  if (!response.ok || !envelope.ok) throw new Error((envelope.description || `Telegram respondió ${response.status}`).slice(0, 300));
  return envelope.result;
}

async function sendTelegramMessage(env: Env, chatId: string, text: string, options: Record<string, unknown> = {}) {
  return telegramApi(env, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4_096),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...options,
  });
}

function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function getConfiguration(env: Env): Promise<TelegramConfigurationRow> {
  const value = await env.DB.prepare(`
    SELECT bot_username, public_community_url, rules_text, prohibited_terms,
      moderation_enabled, auto_ban_enabled, flood_max_messages,
      flood_window_seconds, duplicate_window_seconds, max_links_per_message,
      strike_ban_threshold, temporary_restriction_minutes
    FROM telegram_configuration WHERE id = 'default'
  `).first<TelegramConfigurationRow>();
  return value ?? {
    bot_username: "",
    public_community_url: "",
    rules_text: "Consulta las normas oficiales de Chile3X antes de participar.",
    prohibited_terms: "",
    moderation_enabled: 1,
    auto_ban_enabled: 1,
    flood_max_messages: 8,
    flood_window_seconds: 20,
    duplicate_window_seconds: 90,
    max_links_per_message: 2,
    strike_ban_threshold: 3,
    temporary_restriction_minutes: 1_440,
  };
}

async function discoverChat(env: Env, chat: TelegramChat, botIsAdministrator?: boolean) {
  if (chat.type === "private") return;
  const id = telegramId(chat.id);
  if (!id) return;
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO telegram_chats (
      id, telegram_chat_id, role, title, username, chat_type, is_forum,
      bot_is_administrator, is_active, last_seen_at, updated_at
    ) VALUES (?, ?, 'unassigned', ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(telegram_chat_id) DO UPDATE SET
      title = excluded.title,
      username = excluded.username,
      chat_type = excluded.chat_type,
      is_forum = excluded.is_forum,
      bot_is_administrator = CASE WHEN ? IS NULL THEN telegram_chats.bot_is_administrator ELSE excluded.bot_is_administrator END,
      is_active = 1,
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at
  `).bind(
    `telegram_chat_${crypto.randomUUID()}`,
    id,
    (chat.title || chat.username || `Chat ${id}`).slice(0, 180),
    chat.username?.slice(0, 64) ?? null,
    chat.type.slice(0, 32),
    chat.is_forum ? 1 : 0,
    botIsAdministrator ? 1 : 0,
    now,
    now,
    botIsAdministrator === undefined ? null : 1,
  ).run();
}

async function chatConfiguration(env: Env, chatId: string) {
  return env.DB.prepare(`
    SELECT id, telegram_chat_id, role, title, updates_thread_id, bot_is_administrator
    FROM telegram_chats WHERE telegram_chat_id = ? AND is_active = 1
  `).bind(chatId).first<TelegramChatRow>();
}

async function linkedAdmin(env: Env, telegramUserId: string) {
  return env.DB.prepare(`
    SELECT tai.user_id AS user_id, aga.access_level AS access_level
    FROM telegram_admin_identities tai
    INNER JOIN users u ON u.id = tai.user_id
    INNER JOIN admin_github_access aga ON aga.user_id = tai.user_id
    WHERE tai.telegram_user_id = ? AND tai.is_active = 1
      AND u.is_active = 1 AND u.role = 'admin' AND aga.is_active = 1
    LIMIT 1
  `).bind(telegramUserId).first<{ user_id: string; access_level: string }>();
}

async function authorizedTelegramAdmin(
  env: Env,
  chatId: string,
  telegramUserId: string,
  capability: Extract<AdminCapability, `telegram.${string}`> = "telegram.view",
) {
  const identity = await linkedAdmin(env, telegramUserId);
  if (!identity || !isAdminAccessLevel(identity.access_level)) return null;
  if (!adminHasCapability({ accessLevel: identity.access_level }, capability)) return null;
  const member = await telegramApi(env, "getChatMember", { chat_id: chatId, user_id: telegramUserId });
  if (!isRecord(member) || (member.status !== "administrator" && member.status !== "creator")) return null;
  return identity;
}

async function recordTelegramAudit(env: Env, input: {
  actorType: "admin" | "telegram_admin" | "account" | "bot" | "system";
  action: string;
  summary: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorTelegramUserId?: string | null;
  outcome?: "success" | "failure";
  metadata?: Record<string, unknown> | null;
}) {
  await env.DB.prepare(`
    INSERT INTO telegram_audit_events (
      id, actor_type, actor_user_id, actor_telegram_user_id, action, outcome,
      entity_type, entity_id, summary, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `telegram_audit_${crypto.randomUUID()}`,
    input.actorType,
    input.actorUserId ?? null,
    input.actorTelegramUserId ?? null,
    input.action.slice(0, 100),
    input.outcome ?? "success",
    input.entityType.slice(0, 80),
    input.entityId ?? null,
    input.summary.slice(0, 500),
    safeJson(input.metadata),
  ).run();
}

async function processLinkStart(env: Env, message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  const match = text.match(/^\/start(?:@[A-Za-z0-9_]+)?\s+link_([A-Za-z0-9_-]{20,60})$/);
  if (!match || message.chat.type !== "private" || !message.from || message.from.is_bot) return false;
  const tokenHash = await sha256Hex(match[1]);
  const attempt = await env.DB.prepare(`
    SELECT tla.id, tla.user_id, tla.subject_type, tla.status, tla.expires_at, u.role, u.is_active, u.email_verified_at
    FROM telegram_link_attempts tla
    INNER JOIN users u ON u.id = tla.user_id
    WHERE tla.token_hash = ? LIMIT 1
  `).bind(tokenHash).first<{
    id: string;
    user_id: string;
    subject_type: "account" | "admin";
    status: string;
    expires_at: string;
    role: string;
    is_active: number;
    email_verified_at: string | null;
  }>();
  const telegramUserId = telegramId(message.from.id);
  const invalid = !attempt
    || !attempt.is_active
    || new Date(attempt.expires_at).getTime() <= Date.now()
    || !["pending", "candidate"].includes(attempt.status)
    || (attempt.subject_type === "admin" ? attempt.role !== "admin" : attempt.role === "admin" || !attempt.email_verified_at);
  if (invalid) {
    await sendTelegramMessage(env, telegramUserId, "Este enlace ya no es válido. Vuelve a Chile3X y genera uno nuevo.");
    return true;
  }
  const collision = await env.DB.prepare(`
    SELECT user_id FROM telegram_account_links WHERE telegram_user_id = ? AND user_id <> ?
    UNION ALL
    SELECT user_id FROM telegram_admin_identities WHERE telegram_user_id = ? AND user_id <> ?
    LIMIT 1
  `).bind(telegramUserId, attempt.user_id, telegramUserId, attempt.user_id).first<{ user_id: string }>();
  if (collision) {
    await sendTelegramMessage(env, telegramUserId, "Esta identidad de Telegram ya está vinculada a otra cuenta de Chile3X.");
    return true;
  }
  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE telegram_link_attempts SET status = 'candidate', candidate_telegram_user_id = ?,
      candidate_username = ?, candidate_first_name = ?, candidate_at = ?
    WHERE id = ? AND status IN ('pending', 'candidate')
  `).bind(
    telegramUserId,
    message.from.username?.slice(0, 64) ?? null,
    message.from.first_name?.slice(0, 100) ?? null,
    now,
    attempt.id,
  ).run();
  await sendTelegramMessage(env, telegramUserId, "Identidad recibida. Regresa a la pestaña de Chile3X y confirma la vinculación. No cierres este chat: aquí recibirás el acceso correspondiente.");
  await recordTelegramAudit(env, {
    actorType: attempt.subject_type === "admin" ? "telegram_admin" : "account",
    actorUserId: attempt.user_id,
    actorTelegramUserId: telegramUserId,
    action: "link.candidate",
    entityType: "link_attempt",
    entityId: attempt.id,
    summary: "Telegram recibió una identidad candidata pendiente de confirmación web.",
  });
  return true;
}

async function processBotHelp(env: Env, message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  if (message.chat.type !== "private" || !message.from || message.from.is_bot
    || !/^\/(?:start|help)(?:@[A-Za-z0-9_]+)?(?:\s.*)?$/i.test(text)) return false;
  const config = await getConfiguration(env);
  const buttons: Array<Array<{ text: string; url: string }>> = [
    [{ text: "Vincular mi cuenta", url: "https://chile3x.cl/mi-cuenta/telegram" }],
  ];
  if (config.public_community_url) buttons.push([{ text: "Abrir comunidad pública", url: config.public_community_url }]);
  await sendTelegramMessage(env, telegramId(message.from.id), [
    "<b>Chile3X | Acceso y soporte</b>",
    "",
    "Soy el bot oficial de la Comunidad Chile3X para mayores de 18 años.",
    "",
    "Para entrar al espacio privado de Miembros, abre tu panel de Chile3X, entra en <b>Telegram y Miembros</b> y comienza la vinculación desde allí. La confirmación siempre termina en la misma sesión web.",
    "",
    "La comunidad pública no exige una cuenta vinculada. Nunca compartas contraseñas, códigos, documentos ni datos bancarios por Telegram.",
  ].join("\n"), { reply_markup: { inline_keyboard: buttons } });
  return true;
}

async function processJoinRequest(env: Env, request: NonNullable<TelegramUpdate["chat_join_request"]>) {
  const chatId = telegramId(request.chat.id);
  const telegramUserId = telegramId(request.from.id);
  await discoverChat(env, request.chat);
  const chat = await chatConfiguration(env, chatId);
  if (!chat || chat.role !== "members") {
    await telegramApi(env, "declineChatJoinRequest", { chat_id: chatId, user_id: telegramUserId });
    return;
  }
  const link = await env.DB.prepare(`
    SELECT tal.id, tal.user_id
    FROM telegram_account_links tal
    INNER JOIN users u ON u.id = tal.user_id
    WHERE tal.telegram_user_id = ? AND tal.status = 'linked'
      AND u.is_active = 1 AND u.email_verified_at IS NOT NULL AND u.role <> 'admin'
    LIMIT 1
  `).bind(telegramUserId).first<{ id: string; user_id: string }>();
  if (!link) {
    await telegramApi(env, "declineChatJoinRequest", { chat_id: chatId, user_id: telegramUserId });
    await sendTelegramMessage(env, telegramUserId, "No pudimos validar una cuenta activa de Chile3X. Revisa tu vínculo desde Mi cuenta.").catch(() => undefined);
    await recordTelegramAudit(env, { actorType: "bot", action: "membership.decline", entityType: "telegram_user", entityId: telegramUserId, summary: "Se rechazó una solicitud sin una cuenta Chile3X activa.", outcome: "failure" });
    return;
  }
  await telegramApi(env, "approveChatJoinRequest", { chat_id: chatId, user_id: telegramUserId });
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO telegram_memberships (id, user_id, link_id, telegram_user_id, telegram_chat_id, status, joined_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(user_id, telegram_chat_id) DO UPDATE SET status = 'active', joined_at = excluded.joined_at,
      left_at = NULL, link_id = excluded.link_id, telegram_user_id = excluded.telegram_user_id, updated_at = excluded.updated_at
  `).bind(`telegram_membership_${crypto.randomUUID()}`, link.user_id, link.id, telegramUserId, chatId, now, now).run();
  await recordTelegramAudit(env, { actorType: "bot", actorUserId: link.user_id, actorTelegramUserId: telegramUserId, action: "membership.approve", entityType: "chat", entityId: chatId, summary: "Se aprobó el ingreso de una cuenta validada al espacio de Miembros." });
}

function telegramStatusIsMember(status: string) {
  return status === "member" || status === "administrator" || status === "creator" || status === "restricted";
}

async function processMembershipUpdate(env: Env, update: TelegramChatMemberUpdated, isBot: boolean) {
  const chatId = telegramId(update.chat.id);
  await discoverChat(env, update.chat, isBot ? telegramStatusIsMember(update.new_chat_member.status) : undefined);
  if (isBot) {
    if (!telegramStatusIsMember(update.new_chat_member.status)) {
      await env.DB.prepare("UPDATE telegram_chats SET role = 'unassigned', updates_thread_id = NULL, is_active = 0, updated_at = ? WHERE telegram_chat_id = ?")
        .bind(new Date().toISOString(), chatId).run();
    }
    return;
  }
  const telegramUserId = telegramId(update.new_chat_member.user.id);
  const chat = await chatConfiguration(env, chatId);
  if (!chat || chat.role !== "members") return;
  const status = telegramStatusIsMember(update.new_chat_member.status)
    ? "active"
    : update.new_chat_member.status === "kicked" ? "banned" : "left";
  await env.DB.prepare(`
    UPDATE telegram_memberships SET status = ?, left_at = CASE WHEN ? = 'active' THEN NULL ELSE ? END, updated_at = ?
    WHERE telegram_chat_id = ? AND telegram_user_id = ?
  `).bind(status, status, new Date().toISOString(), new Date().toISOString(), chatId, telegramUserId).run();
}

async function syncTelegramBulletin(env: Env, message: TelegramMessage, edited: boolean) {
  if (!message.from || message.from.is_bot) return false;
  const chatId = telegramId(message.chat.id);
  const senderId = telegramId(message.from.id);
  const chat = await chatConfiguration(env, chatId);
  if (!chat || chat.role !== "public") return false;
  const text = (message.text || message.caption || "").trim();
  const explicitCommand = /^\/novedad(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(text);
  const configuredThread = chat.updates_thread_id && telegramId(message.message_thread_id ?? 0) === chat.updates_thread_id;
  if (!explicitCommand && !configuredThread) return false;
  const admin = await authorizedTelegramAdmin(env, chatId, senderId, "telegram.publish");
  if (!admin) return false;
  const cleanText = explicitCommand ? text.replace(/^\/novedad(?:@[A-Za-z0-9_]+)?\s*/i, "") : text;
  if (!cleanText) return true;
  const { title, body } = parseBulletinFromTelegram(cleanText);
  const messageId = telegramId(message.message_id);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(`
    SELECT id FROM telegram_bulletins WHERE source_telegram_chat_id = ? AND source_telegram_message_id = ? LIMIT 1
  `).bind(chatId, messageId).first<{ id: string }>();
  const bulletinId = existing?.id ?? `telegram_bulletin_${crypto.randomUUID()}`;
  if (existing) {
    await env.DB.prepare(`
      UPDATE telegram_bulletins SET title = ?, body = ?, status = 'published', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?
    `).bind(title, body, now, now, bulletinId).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO telegram_bulletins (id, title, body, source, status, author_user_id, source_telegram_chat_id, source_telegram_message_id, published_at, updated_at)
      VALUES (?, ?, ?, 'telegram', 'published', ?, ?, ?, ?, ?)
    `).bind(bulletinId, title, body, admin.user_id, chatId, messageId, now, now).run();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO telegram_publications (id, bulletin_id, telegram_chat_id, telegram_thread_id, telegram_message_id, status, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'published', ?, ?)
    `).bind(`telegram_publication_${crypto.randomUUID()}`, bulletinId, chatId, message.message_thread_id ? telegramId(message.message_thread_id) : null, messageId, now, now).run();
  }
  await recordTelegramAudit(env, {
    actorType: "telegram_admin",
    actorUserId: admin.user_id,
    actorTelegramUserId: senderId,
    action: edited ? "bulletin.update_from_telegram" : "bulletin.publish_from_telegram",
    entityType: "bulletin",
    entityId: bulletinId,
    summary: edited ? "Actualizó una novedad desde Telegram." : "Publicó una novedad desde Telegram.",
  });
  return true;
}

function redactedEvidence(text: string) {
  return text
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[correo protegido]")
    .replace(/\b\d{7,}\b/g, "[número protegido]")
    .replace(/https?:\/\/\S+/gi, "[enlace]")
    .slice(0, 180);
}

async function openModerationCase(env: Env, message: TelegramMessage, decision: TelegramModerationDecision, automated: boolean, restrictionMinutes: number, actor?: { userId?: string; telegramUserId?: string }) {
  const telegramUserId = telegramId(message.from?.id ?? 0);
  const linked = await env.DB.prepare("SELECT user_id FROM telegram_account_links WHERE telegram_user_id = ? LIMIT 1").bind(telegramUserId).first<{ user_id: string }>();
  const id = `telegram_case_${crypto.randomUUID()}`;
  const restrictionEndsAt = decision.action === "restrict" ? new Date(Date.now() + restrictionMinutes * 60 * 1000).toISOString() : null;
  await env.DB.prepare(`
    INSERT INTO telegram_moderation_cases (
      id, user_id, telegram_user_id, telegram_username, telegram_chat_id, telegram_message_id,
      rule_code, reason, evidence_snippet, severity, action, status, automated,
      actor_user_id, actor_telegram_user_id, restriction_ends_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
  `).bind(
    id,
    linked?.user_id ?? null,
    telegramUserId,
    message.from?.username?.slice(0, 64) ?? null,
    telegramId(message.chat.id),
    telegramId(message.message_id),
    decision.ruleCode,
    decision.reason.slice(0, 300),
    redactedEvidence((message.text || message.caption || "").trim()),
    decision.severity,
    decision.action,
    automated ? 1 : 0,
    actor?.userId ?? null,
    actor?.telegramUserId ?? null,
    restrictionEndsAt,
  ).run();
  return { id, linkedUserId: linked?.user_id ?? null, restrictionEndsAt };
}

async function notifyModerationAdmins(env: Env, text: string) {
  const { results } = await env.DB.prepare(`
    SELECT tai.telegram_user_id, aga.access_level
    FROM telegram_admin_identities tai
    INNER JOIN users u ON u.id = tai.user_id
    INNER JOIN admin_github_access aga ON aga.user_id = tai.user_id
    WHERE tai.is_active = 1 AND u.is_active = 1 AND u.role = 'admin' AND aga.is_active = 1
  `).all<{ telegram_user_id: string; access_level: string }>();
  const recipients = results.filter((admin) =>
    isAdminAccessLevel(admin.access_level)
    && adminHasCapability({ accessLevel: admin.access_level }, "telegram.moderate")
  );
  await Promise.all(recipients.map((admin) =>
    sendTelegramMessage(env, admin.telegram_user_id, text).catch(() => undefined)
  ));
}

async function applyModerationDecision(env: Env, message: TelegramMessage, decision: TelegramModerationDecision, automated: boolean, actor?: { userId?: string; telegramUserId?: string }, restrictionMinutes = 1_440) {
  const chatId = telegramId(message.chat.id);
  const userId = telegramId(message.from?.id ?? 0);
  const safeRestrictionMinutes = Math.min(43_200, Math.max(5, restrictionMinutes));
  const caseRecord = await openModerationCase(env, message, decision, automated, safeRestrictionMinutes, actor);
  if (decision.action !== "warn" && message.message_id) await telegramApi(env, "deleteMessage", { chat_id: chatId, message_id: message.message_id }).catch(() => undefined);
  if (decision.action === "restrict") {
    const untilDate = Math.floor((Date.now() + safeRestrictionMinutes * 60 * 1000) / 1000);
    await telegramApi(env, "restrictChatMember", {
      chat_id: chatId,
      user_id: userId,
      until_date: untilDate,
      permissions: { can_send_messages: false },
    });
  }
  if (decision.action === "ban") {
    await telegramApi(env, "banChatMember", { chat_id: chatId, user_id: userId, revoke_messages: true });
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE telegram_account_links SET status = 'banned', revoked_at = ?, revoke_reason = ?, updated_at = ? WHERE telegram_user_id = ?").bind(now, decision.reason, now, userId),
      env.DB.prepare("UPDATE telegram_memberships SET status = 'banned', left_at = ?, updated_at = ? WHERE telegram_user_id = ?").bind(now, now, userId),
    ]);
  }
  const label = message.from?.username ? `@${message.from.username}` : `usuario ${userId}`;
  await sendTelegramMessage(env, chatId, `${label}: ${decision.action === "warn" ? "advertencia registrada" : "el mensaje fue moderado"}. Motivo: ${decision.reason}`).catch(() => undefined);
  await notifyModerationAdmins(env, `<b>Alerta de moderación</b>\n${label}\n${decision.reason}\nAcción: ${decision.action}\nCaso: ${caseRecord.id}`);
  await recordTelegramAudit(env, {
    actorType: automated ? "bot" : "telegram_admin",
    actorUserId: actor?.userId ?? null,
    actorTelegramUserId: actor?.telegramUserId ?? null,
    action: `moderation.${decision.action}`,
    entityType: "moderation_case",
    entityId: caseRecord.id,
    summary: `Aplicó la acción ${decision.action} por ${decision.ruleCode}.`,
  });
}

function moderationDuration(argumentParts: string[], fallbackMinutes: number) {
  const first = argumentParts[0]?.toLocaleLowerCase("es-CL") ?? "";
  const match = first.match(/^(\d{1,4})(m|h|d)$/);
  if (!match) return { minutes: fallbackMinutes, reasonParts: argumentParts };
  const amount = Number.parseInt(match[1], 10);
  const multiplier = match[2] === "d" ? 1_440 : match[2] === "h" ? 60 : 1;
  return { minutes: Math.min(43_200, Math.max(5, amount * multiplier)), reasonParts: argumentParts.slice(1) };
}

async function processAdminCommand(env: Env, message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  if (!text.startsWith("/") || !message.from) return false;
  const [rawCommand, ...argumentParts] = text.split(/\s+/);
  const command = rawCommand.toLocaleLowerCase("es-CL").replace(/@[A-Za-z0-9_]+$/, "");
  if (!["/warn", "/mute", "/unmute", "/ban", "/unban", "/rules", "/status"].includes(command)) return false;
  const chatId = telegramId(message.chat.id);
  const actorTelegramUserId = telegramId(message.from.id);
  if (command === "/rules") {
    const config = await getConfiguration(env);
    await sendTelegramMessage(env, chatId, `<b>Normas de Chile3X</b>\n\n${escapeTelegramHtml(config.rules_text)}`);
    return true;
  }
  const admin = await authorizedTelegramAdmin(env, chatId, actorTelegramUserId, "telegram.moderate");
  if (!admin) {
    await sendTelegramMessage(env, chatId, "Este comando requiere una identidad administrativa de Chile3X vinculada, la función correspondiente y permisos de administración en este chat.", { reply_parameters: { message_id: message.message_id } }).catch(() => undefined);
    return true;
  }
  const targetMessage = message.reply_to_message;
  const target = targetMessage?.from;
  if (!target || target.is_bot) {
    await sendTelegramMessage(env, chatId, "Responde al mensaje de la persona sobre la que quieres actuar.", { reply_parameters: { message_id: message.message_id } });
    return true;
  }
  const targetId = telegramId(target.id);
  if (command === "/status") {
    const link = await env.DB.prepare("SELECT status FROM telegram_account_links WHERE telegram_user_id = ? LIMIT 1").bind(targetId).first<{ status: string }>();
    const openCases = await env.DB.prepare("SELECT count(*) AS total FROM telegram_moderation_cases WHERE telegram_user_id = ? AND status = 'open'").bind(targetId).first<{ total: number }>();
    await sendTelegramMessage(env, chatId, `<b>Estado de moderación</b>\nVínculo: ${link?.status ?? "sin cuenta vinculada"}\nCasos abiertos: ${Number(openCases?.total ?? 0)}`);
    return true;
  }
  if (command === "/unmute") {
    await telegramApi(env, "restrictChatMember", {
      chat_id: chatId,
      user_id: targetId,
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: true,
        can_pin_messages: false,
        can_manage_topics: false,
      },
    });
    await sendTelegramMessage(env, chatId, "La restricción fue retirada.");
    await recordTelegramAudit(env, { actorType: "telegram_admin", actorUserId: admin.user_id, actorTelegramUserId, action: "moderation.unmute", entityType: "telegram_user", entityId: targetId, summary: "Retiró una restricción desde Telegram." });
    return true;
  }
  if (command === "/unban") {
    await telegramApi(env, "unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE telegram_account_links SET status = 'linked', revoked_at = NULL, revoke_reason = NULL, updated_at = ? WHERE telegram_user_id = ? AND status = 'banned'").bind(now, targetId),
      env.DB.prepare("UPDATE telegram_memberships SET status = 'left', updated_at = ? WHERE telegram_user_id = ? AND telegram_chat_id = ? AND status = 'banned'").bind(now, targetId, chatId),
    ]);
    await sendTelegramMessage(env, chatId, "El veto de Telegram fue retirado. La persona deberá volver a solicitar acceso cuando corresponda.");
    await recordTelegramAudit(env, { actorType: "telegram_admin", actorUserId: admin.user_id, actorTelegramUserId, action: "moderation.unban", entityType: "telegram_user", entityId: targetId, summary: "Retiró un veto desde Telegram." });
    return true;
  }
  const config = await getConfiguration(env);
  const duration = command === "/mute" ? moderationDuration(argumentParts, config.temporary_restriction_minutes) : { minutes: config.temporary_restriction_minutes, reasonParts: argumentParts };
  const action: "ban" | "restrict" | "warn" = command === "/ban" ? "ban" : command === "/mute" ? "restrict" : "warn";
  const decision = {
    ruleCode: "prohibited_term" as const,
    reason: duration.reasonParts.join(" ").trim().slice(0, 220) || "Acción manual del equipo de moderación.",
    severity: action === "ban" ? "high" as const : "medium" as const,
    action,
  };
  await applyModerationDecision(env, targetMessage, decision, false, { userId: admin.user_id, telegramUserId: actorTelegramUserId }, duration.minutes);
  return true;
}

async function moderateMessage(env: Env, message: TelegramMessage) {
  if (!message.from || message.from.is_bot || message.chat.type === "private") return;
  const telegramUserId = telegramId(message.from.id);
  if (await linkedAdmin(env, telegramUserId)) return;
  const text = (message.text || message.caption || "").trim();
  if (!text) return;
  const config = await getConfiguration(env);
  if (!config.moderation_enabled) return;
  const chatId = telegramId(message.chat.id);
  const messageId = telegramId(message.message_id);
  const now = new Date();
  const bodyHash = await sha256Hex(text.normalize("NFKC").toLocaleLowerCase("es-CL").replace(/\s+/g, " ").trim());
  const floodSince = new Date(now.getTime() - Math.max(5, config.flood_window_seconds) * 1_000).toISOString();
  const duplicateSince = new Date(now.getTime() - Math.max(20, config.duplicate_window_seconds) * 1_000).toISOString();
  const strikeSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const [recent, duplicates, strikes] = await Promise.all([
    env.DB.prepare("SELECT count(*) AS total FROM telegram_message_events WHERE telegram_chat_id = ? AND telegram_user_id = ? AND datetime(created_at) >= datetime(?)").bind(chatId, telegramUserId, floodSince).first<{ total: number }>(),
    env.DB.prepare("SELECT count(*) AS total FROM telegram_message_events WHERE telegram_chat_id = ? AND telegram_user_id = ? AND body_hash = ? AND datetime(created_at) >= datetime(?)").bind(chatId, telegramUserId, bodyHash, duplicateSince).first<{ total: number }>(),
    env.DB.prepare("SELECT count(*) AS total FROM telegram_moderation_cases WHERE telegram_user_id = ? AND datetime(created_at) >= datetime(?) AND action IN ('delete', 'restrict', 'ban')").bind(telegramUserId, strikeSince).first<{ total: number }>(),
  ]);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO telegram_message_events (id, telegram_chat_id, telegram_message_id, telegram_user_id, body_hash, link_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(`telegram_message_${crypto.randomUUID()}`, chatId, messageId, telegramUserId, bodyHash, telegramLinkCount(text)).run();
  const decision = evaluateTelegramMessage(text, {
    prohibitedTerms: config.prohibited_terms,
    maxLinksPerMessage: config.max_links_per_message,
    floodMaxMessages: config.flood_max_messages,
    strikeBanThreshold: config.strike_ban_threshold,
    temporaryRestrictionMinutes: config.temporary_restriction_minutes,
    autoBanEnabled: Boolean(config.auto_ban_enabled),
  }, {
    recentMessageCount: Number(recent?.total ?? 0) + 1,
    recentDuplicateCount: Number(duplicates?.total ?? 0) + 1,
    recentStrikeCount: Number(strikes?.total ?? 0),
  });
  if (decision) await applyModerationDecision(env, message, decision, true, undefined, config.temporary_restriction_minutes);
}

async function processTelegramUpdate(env: Env, updateId: string) {
  const row = await env.DB.prepare("SELECT payload, status, attempts FROM telegram_webhook_updates WHERE update_id = ? LIMIT 1")
    .bind(updateId).first<{ payload: string; status: string; attempts: number }>();
  if (!row || row.status !== "pending") return;
  const claim = await env.DB.prepare("UPDATE telegram_webhook_updates SET status = 'processing', attempts = attempts + 1, last_error = NULL WHERE update_id = ? AND status = 'pending'")
    .bind(updateId).run();
  if (Number(claim.meta.changes ?? 0) === 0) return;
  const update = JSON.parse(row.payload) as unknown;
  if (!isTelegramUpdate(update)) throw new Error("Actualización de Telegram no válida.");
  if (update.my_chat_member) await processMembershipUpdate(env, update.my_chat_member, true);
  if (update.chat_member) await processMembershipUpdate(env, update.chat_member, false);
  if (update.chat_join_request) await processJoinRequest(env, update.chat_join_request);
  const message = update.edited_message ?? update.message;
  if (message) {
    await discoverChat(env, message.chat);
    if (!update.edited_message && await processLinkStart(env, message)) {
      // The private start command has no further moderation or sync behavior.
    } else if (!update.edited_message && await processBotHelp(env, message)) {
      // Private onboarding and help never enter moderation.
    } else if (!update.edited_message && await processAdminCommand(env, message)) {
      // Administrative commands are already audited by their action.
    } else if (await syncTelegramBulletin(env, message, Boolean(update.edited_message))) {
      // Novedades are only accepted from linked Telegram administrators.
    } else if (!update.edited_message) {
      await moderateMessage(env, message);
    }
  }
  await env.DB.prepare("UPDATE telegram_webhook_updates SET status = 'processed', payload = '{}', processed_at = ?, last_error = NULL WHERE update_id = ?")
    .bind(new Date().toISOString(), updateId).run();
}

function resultRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

async function outboxPublishBulletin(env: Env, payload: Record<string, unknown>) {
  const bulletinId = typeof payload.bulletinId === "string" ? payload.bulletinId : "";
  const bulletin = await env.DB.prepare("SELECT id, title, body, status FROM telegram_bulletins WHERE id = ? LIMIT 1").bind(bulletinId).first<{ id: string; title: string; body: string; status: string }>();
  if (!bulletin || bulletin.status !== "published") throw new Error("La novedad ya no está publicada.");
  const { results: chats } = await env.DB.prepare("SELECT telegram_chat_id, updates_thread_id FROM telegram_chats WHERE role = 'public' AND is_active = 1").all<{ telegram_chat_id: string; updates_thread_id: string | null }>();
  if (!chats.length) throw new Error("Aún no existe un chat público asignado.");
  for (const chat of chats) {
    const existing = await env.DB.prepare("SELECT id, telegram_message_id FROM telegram_publications WHERE bulletin_id = ? AND telegram_chat_id = ? LIMIT 1").bind(bulletin.id, chat.telegram_chat_id).first<{ id: string; telegram_message_id: string | null }>();
    if (existing?.telegram_message_id) continue;
    const sent = resultRecord(await sendTelegramMessage(env, chat.telegram_chat_id, formatBulletinForTelegram(bulletin.title, bulletin.body, `https://chile3x.cl/novedades#${bulletin.id}`), chat.updates_thread_id ? { message_thread_id: Number(chat.updates_thread_id) } : {}));
    const messageId = typeof sent?.message_id === "number" ? telegramId(sent.message_id) : "";
    if (!messageId) throw new Error("Telegram no devolvió el identificador del mensaje.");
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO telegram_publications (id, bulletin_id, telegram_chat_id, telegram_thread_id, telegram_message_id, status, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'published', ?, ?)
      ON CONFLICT(bulletin_id, telegram_chat_id) DO UPDATE SET telegram_thread_id = excluded.telegram_thread_id,
        telegram_message_id = excluded.telegram_message_id, status = 'published', last_error = NULL,
        published_at = excluded.published_at, updated_at = excluded.updated_at
    `).bind(`telegram_publication_${crypto.randomUUID()}`, bulletin.id, chat.telegram_chat_id, chat.updates_thread_id, messageId, now, now).run();
  }
}

async function outboxEditBulletin(env: Env, payload: Record<string, unknown>) {
  const bulletinId = typeof payload.bulletinId === "string" ? payload.bulletinId : "";
  const bulletin = await env.DB.prepare("SELECT title, body, status FROM telegram_bulletins WHERE id = ? LIMIT 1").bind(bulletinId).first<{ title: string; body: string; status: string }>();
  if (!bulletin || bulletin.status !== "published") return;
  const { results } = await env.DB.prepare("SELECT id, telegram_chat_id, telegram_message_id FROM telegram_publications WHERE bulletin_id = ? AND status = 'published' AND telegram_message_id IS NOT NULL").bind(bulletinId).all<{ id: string; telegram_chat_id: string; telegram_message_id: string }>();
  for (const publication of results) {
    await telegramApi(env, "editMessageText", {
      chat_id: publication.telegram_chat_id,
      message_id: Number(publication.telegram_message_id),
      text: formatBulletinForTelegram(bulletin.title, bulletin.body, `https://chile3x.cl/novedades#${bulletinId}`),
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    await env.DB.prepare("UPDATE telegram_publications SET updated_at = ?, last_error = NULL WHERE id = ?").bind(new Date().toISOString(), publication.id).run();
  }
}

async function outboxDeleteBulletin(env: Env, payload: Record<string, unknown>) {
  const bulletinId = typeof payload.bulletinId === "string" ? payload.bulletinId : "";
  const { results } = await env.DB.prepare("SELECT id, telegram_chat_id, telegram_message_id FROM telegram_publications WHERE bulletin_id = ? AND status <> 'deleted' AND telegram_message_id IS NOT NULL").bind(bulletinId).all<{ id: string; telegram_chat_id: string; telegram_message_id: string }>();
  for (const publication of results) {
    await telegramApi(env, "deleteMessage", { chat_id: publication.telegram_chat_id, message_id: Number(publication.telegram_message_id) }).catch(() => undefined);
    await env.DB.prepare("UPDATE telegram_publications SET status = 'deleted', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), publication.id).run();
  }
}

async function outboxSendMemberInvite(env: Env, payload: Record<string, unknown>) {
  const telegramUserId = typeof payload.telegramUserId === "string" ? payload.telegramUserId : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  if (!telegramUserId || !userId) throw new Error("La solicitud de invitación está incompleta.");
  const link = await env.DB.prepare(`
    SELECT tal.id FROM telegram_account_links tal INNER JOIN users u ON u.id = tal.user_id
    WHERE tal.user_id = ? AND tal.telegram_user_id = ? AND tal.status = 'linked'
      AND u.is_active = 1 AND u.email_verified_at IS NOT NULL LIMIT 1
  `).bind(userId, telegramUserId).first<{ id: string }>();
  if (!link) throw new Error("La cuenta ya no cumple los requisitos de acceso.");
  const chat = await env.DB.prepare("SELECT telegram_chat_id FROM telegram_chats WHERE role = 'members' AND is_active = 1 LIMIT 1").first<{ telegram_chat_id: string }>();
  if (!chat) throw new Error("El espacio de Miembros todavía no está configurado.");
  const invite = resultRecord(await telegramApi(env, "createChatInviteLink", {
    chat_id: chat.telegram_chat_id,
    name: `Chile3X ${userId.slice(-8)}`,
    expire_date: Math.floor(Date.now() / 1000) + 10 * 60,
    creates_join_request: true,
  }));
  const inviteLink = typeof invite?.invite_link === "string" ? invite.invite_link : "";
  if (!inviteLink) throw new Error("Telegram no devolvió una invitación válida.");
  await sendTelegramMessage(env, telegramUserId, `<b>Acceso a Chile3X | Miembros</b>\n\nTu cuenta está validada. Esta invitación vence en 10 minutos y la solicitud solo será aprobada para tu identidad vinculada.\n\n<a href="${inviteLink}">Solicitar ingreso a Miembros</a>`);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO telegram_memberships (id, user_id, link_id, telegram_user_id, telegram_chat_id, status, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
    ON CONFLICT(user_id, telegram_chat_id) DO UPDATE SET status = 'pending', left_at = NULL,
      link_id = excluded.link_id, telegram_user_id = excluded.telegram_user_id, updated_at = excluded.updated_at
  `).bind(`telegram_membership_${crypto.randomUUID()}`, userId, link.id, telegramUserId, chat.telegram_chat_id, now).run();
}

async function removeTelegramMember(env: Env, payload: Record<string, unknown>, permanent: boolean) {
  const telegramUserId = typeof payload.telegramUserId === "string" ? payload.telegramUserId : "";
  if (!telegramUserId) return;
  const chatQuery = permanent
    ? "SELECT telegram_chat_id FROM telegram_chats WHERE role IN ('public', 'members') AND is_active = 1"
    : "SELECT telegram_chat_id FROM telegram_chats WHERE role = 'members' AND is_active = 1";
  const { results } = await env.DB.prepare(chatQuery).all<{ telegram_chat_id: string }>();
  for (const chat of results) {
    await telegramApi(env, "banChatMember", { chat_id: chat.telegram_chat_id, user_id: telegramUserId, revoke_messages: false });
    if (!permanent) await telegramApi(env, "unbanChatMember", { chat_id: chat.telegram_chat_id, user_id: telegramUserId, only_if_banned: true });
  }
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE telegram_memberships SET status = ?, left_at = ?, updated_at = ? WHERE telegram_user_id = ?")
    .bind(permanent ? "banned" : "revoked", now, now, telegramUserId).run();
}

async function processOutboxJob(env: Env, jobId: string) {
  const job = await env.DB.prepare("SELECT id, kind, payload, status, attempts FROM telegram_outbox_jobs WHERE id = ? LIMIT 1").bind(jobId).first<{ id: string; kind: string; payload: string; status: string; attempts: number }>();
  if (!job || job.status !== "pending") return;
  const claim = await env.DB.prepare("UPDATE telegram_outbox_jobs SET status = 'processing', attempts = attempts + 1, last_error = NULL, updated_at = ? WHERE id = ? AND status = 'pending'")
    .bind(new Date().toISOString(), job.id).run();
  if (Number(claim.meta.changes ?? 0) === 0) return;
  const payload = JSON.parse(job.payload) as unknown;
  if (!isRecord(payload)) throw new Error("La acción de Telegram tiene datos inválidos.");
  if (job.kind === "publish_bulletin") await outboxPublishBulletin(env, payload);
  else if (job.kind === "edit_bulletin") await outboxEditBulletin(env, payload);
  else if (job.kind === "delete_bulletin") await outboxDeleteBulletin(env, payload);
  else if (job.kind === "send_member_invite") await outboxSendMemberInvite(env, payload);
  else if (job.kind === "revoke_member") await removeTelegramMember(env, payload, false);
  else if (job.kind === "ban_member") await removeTelegramMember(env, payload, true);
  else if (job.kind === "unban_member") {
    const telegramUserId = typeof payload.telegramUserId === "string" ? payload.telegramUserId : "";
    const { results } = await env.DB.prepare("SELECT telegram_chat_id FROM telegram_chats WHERE role IN ('public', 'members') AND is_active = 1").all<{ telegram_chat_id: string }>();
    for (const chat of results) await telegramApi(env, "unbanChatMember", { chat_id: chat.telegram_chat_id, user_id: telegramUserId, only_if_banned: true });
  } else if (job.kind === "notify_admin") {
    const text = typeof payload.text === "string" ? payload.text : "Nueva alerta de Telegram.";
    await notifyModerationAdmins(env, text);
  } else {
    throw new Error("Tipo de acción de Telegram desconocido.");
  }
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE telegram_outbox_jobs SET status = 'succeeded', completed_at = ?, updated_at = ?, last_error = NULL WHERE id = ?").bind(now, now, job.id).run();
}

export async function handleTelegramWebhook(request: Request, env: Env) {
  if (request.method !== "POST") return jsonResponse({ ok: false }, 405);
  if (!env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_BOT_TOKEN) return jsonResponse({ ok: false, error: "not_configured" }, 503);
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!providedSecret || !await secureSecretMatches(providedSecret, env.TELEGRAM_WEBHOOK_SECRET)) return jsonResponse({ ok: false }, 401);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_WEBHOOK_BYTES) return jsonResponse({ ok: false }, 413);
  const rawPayload = await request.text();
  if (new TextEncoder().encode(rawPayload).byteLength > MAX_WEBHOOK_BYTES) return jsonResponse({ ok: false }, 413);
  const payload: unknown = (() => {
    try {
      return JSON.parse(rawPayload);
    } catch {
      return null;
    }
  })();
  if (!isTelegramUpdate(payload)) return jsonResponse({ ok: false }, 400);
  const serialized = JSON.stringify(payload);
  const updateId = telegramId(payload.update_id);
  const existing = await env.DB.prepare("SELECT status FROM telegram_webhook_updates WHERE update_id = ? LIMIT 1").bind(updateId).first<{ status: string }>();
  if (existing?.status === "processed") return jsonResponse({ ok: true });
  await env.DB.prepare(`
    INSERT OR IGNORE INTO telegram_webhook_updates (update_id, update_type, payload, status)
    VALUES (?, ?, ?, 'pending')
  `).bind(updateId, updateType(payload), serialized).run();
  try {
    await env.TELEGRAM_QUEUE.send({ type: "telegram.update", updateId } satisfies TelegramQueueMessage);
  } catch (error) {
    console.error(JSON.stringify({ message: "telegram webhook queue failed", updateId, error: safeError(error) }));
    return jsonResponse({ ok: false }, 503);
  }
  return jsonResponse({ ok: true });
}

export async function handleTelegramQueue(batch: MessageBatch<TelegramQueueMessage>, env: Env) {
  for (const message of batch.messages) {
    try {
      if (!isRecord(message.body) || typeof message.body.type !== "string") throw new Error("Mensaje de cola inválido.");
      if (message.body.type === "telegram.update" && typeof message.body.updateId === "string") {
        await processTelegramUpdate(env, message.body.updateId);
      } else if (message.body.type === "telegram.outbox" && typeof message.body.jobId === "string") {
        await processOutboxJob(env, message.body.jobId);
      } else {
        throw new Error("Mensaje de cola desconocido.");
      }
      message.ack();
    } catch (error) {
      const detail = safeError(error);
      console.error(JSON.stringify({ message: "telegram queue item failed", queueMessageId: message.id, attempts: message.attempts, error: detail }));
      if (isRecord(message.body) && message.body.type === "telegram.update" && typeof message.body.updateId === "string") {
        await env.DB.prepare("UPDATE telegram_webhook_updates SET status = ?, last_error = ? WHERE update_id = ?")
          .bind(message.attempts >= 5 ? "failed" : "pending", detail, message.body.updateId).run().catch(() => undefined);
      }
      if (isRecord(message.body) && message.body.type === "telegram.outbox" && typeof message.body.jobId === "string") {
        const retryAt = new Date(Date.now() + Math.min(3_600, 30 * 2 ** Math.max(0, message.attempts - 1)) * 1_000).toISOString();
        await env.DB.prepare("UPDATE telegram_outbox_jobs SET status = ?, available_at = ?, last_error = ?, updated_at = ? WHERE id = ?")
          .bind(message.attempts >= 5 ? "failed" : "pending", retryAt, detail, new Date().toISOString(), message.body.jobId).run().catch(() => undefined);
      }
      if (message.attempts >= 5) message.ack();
      else message.retry({ delaySeconds: Math.min(3_600, 30 * 2 ** Math.max(0, message.attempts - 1)) });
    }
  }
}

export async function handleTelegramScheduled(env: Env) {
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE telegram_link_attempts SET status = 'expired' WHERE status IN ('pending', 'candidate') AND datetime(expires_at) <= datetime(?)").bind(now),
    env.DB.prepare("UPDATE telegram_webhook_updates SET status = 'pending' WHERE status = 'processing' AND datetime(received_at) < datetime(?, '-10 minutes')").bind(now),
    env.DB.prepare("UPDATE telegram_outbox_jobs SET status = 'pending' WHERE status = 'processing' AND datetime(updated_at) < datetime(?, '-10 minutes')").bind(now),
    env.DB.prepare("DELETE FROM telegram_message_events WHERE datetime(created_at) < datetime(?, '-7 days')").bind(now),
    env.DB.prepare("DELETE FROM telegram_webhook_updates WHERE status = 'processed' AND datetime(received_at) < datetime(?, '-7 days')").bind(now),
    env.DB.prepare("DELETE FROM telegram_link_attempts WHERE status IN ('confirmed', 'cancelled', 'expired') AND datetime(created_at) < datetime(?, '-30 days')").bind(now),
  ]);
  const [{ results: updates }, { results: jobs }] = await Promise.all([
    env.DB.prepare("SELECT update_id FROM telegram_webhook_updates WHERE status = 'pending' ORDER BY received_at LIMIT 50").all<{ update_id: string }>(),
    env.DB.prepare("SELECT id FROM telegram_outbox_jobs WHERE status = 'pending' AND datetime(available_at) <= datetime(?) ORDER BY created_at LIMIT 50").bind(now).all<{ id: string }>(),
  ]);
  const messages: Array<{ body: TelegramQueueMessage }> = [
    ...updates.map((item) => ({ body: { type: "telegram.update" as const, updateId: item.update_id } })),
    ...jobs.map((item) => ({ body: { type: "telegram.outbox" as const, jobId: item.id } })),
  ];
  if (messages.length) await env.TELEGRAM_QUEUE.sendBatch(messages);
}

export function isTelegramWebhookPath(pathname: string) {
  return pathname === TELEGRAM_WEBHOOK_PATH;
}
