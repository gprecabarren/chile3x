import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { telegramConfiguration, telegramOutboxJobs } from "@/db/schema";
import { recordOperationalEvent } from "@/lib/operations";

export const TELEGRAM_CONFIG_ID = "default";
export const TELEGRAM_LINK_TTL_MINUTES = 15;

export const DEFAULT_TELEGRAM_RULES = [
  "Comunidad exclusiva para personas mayores de 18 años.",
  "Trata con respeto a las damas de compañía, visitantes y equipo de moderación.",
  "No se permiten acoso, amenazas, discriminación, suplantación ni difusión de datos privados.",
  "No publiques spam, enlaces engañosos, estafas ni promociones repetitivas.",
  "Nunca compartas contraseñas, códigos de verificación, documentos, datos bancarios ni contenido privado de terceros.",
  "No se coordinan pagos, reservas ni negociaciones a través del bot o de los grupos oficiales.",
  "Está prohibido todo contenido relacionado con menores de edad o actividades ilegales.",
  "Las decisiones automáticas quedan registradas y pueden ser revisadas por el equipo de Chile3X.",
].map((rule, index) => `${index + 1}. ${rule}`).join("\n");

export type TelegramQueueMessage =
  | { type: "telegram.update"; updateId: string }
  | { type: "telegram.outbox"; jobId: string };

export type TelegramOutboxKind =
  | "publish_bulletin"
  | "edit_bulletin"
  | "delete_bulletin"
  | "send_member_invite"
  | "revoke_member"
  | "ban_member"
  | "unban_member"
  | "notify_admin";

export type TelegramConfigurationValue = {
  id: string;
  botUsername: string;
  publicCommunityUrl: string;
  rulesText: string;
  prohibitedTerms: string;
  moderationEnabled: boolean;
  autoBanEnabled: boolean;
  floodMaxMessages: number;
  floodWindowSeconds: number;
  duplicateWindowSeconds: number;
  maxLinksPerMessage: number;
  strikeBanThreshold: number;
  temporaryRestrictionMinutes: number;
};

export const telegramConfigurationFallback: TelegramConfigurationValue = {
  id: TELEGRAM_CONFIG_ID,
  botUsername: "",
  publicCommunityUrl: "",
  rulesText: DEFAULT_TELEGRAM_RULES,
  prohibitedTerms: "",
  moderationEnabled: true,
  autoBanEnabled: true,
  floodMaxMessages: 8,
  floodWindowSeconds: 20,
  duplicateWindowSeconds: 90,
  maxLinksPerMessage: 2,
  strikeBanThreshold: 3,
  temporaryRestrictionMinutes: 1_440,
};

export async function getTelegramConfiguration(): Promise<TelegramConfigurationValue> {
  const [value] = await (await getDb()).select({
    id: telegramConfiguration.id,
    botUsername: telegramConfiguration.botUsername,
    publicCommunityUrl: telegramConfiguration.publicCommunityUrl,
    rulesText: telegramConfiguration.rulesText,
    prohibitedTerms: telegramConfiguration.prohibitedTerms,
    moderationEnabled: telegramConfiguration.moderationEnabled,
    autoBanEnabled: telegramConfiguration.autoBanEnabled,
    floodMaxMessages: telegramConfiguration.floodMaxMessages,
    floodWindowSeconds: telegramConfiguration.floodWindowSeconds,
    duplicateWindowSeconds: telegramConfiguration.duplicateWindowSeconds,
    maxLinksPerMessage: telegramConfiguration.maxLinksPerMessage,
    strikeBanThreshold: telegramConfiguration.strikeBanThreshold,
    temporaryRestrictionMinutes: telegramConfiguration.temporaryRestrictionMinutes,
  }).from(telegramConfiguration).where(eq(telegramConfiguration.id, TELEGRAM_CONFIG_ID)).limit(1);
  return value ?? telegramConfigurationFallback;
}

export function normalizeTelegramUsername(value: string) {
  const username = value.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(username) ? username : null;
}

export function normalizeTelegramCommunityUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const username = normalizeTelegramUsername(trimmed);
  if (username) return `https://t.me/${username}`;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || (url.hostname !== "t.me" && url.hostname !== "www.t.me")) return null;
    if (!/^\/(?:[A-Za-z0-9_]{5,32}|\+[A-Za-z0-9_-]{10,})\/?$/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function telegramDeepLink(botUsername: string, secret: string) {
  const username = normalizeTelegramUsername(botUsername);
  if (!username || !/^[A-Za-z0-9_-]{20,60}$/.test(secret)) return null;
  return `https://t.me/${username}?start=link_${secret}`;
}

export function telegramIdentityLabel(firstName: string | null | undefined, username: string | null | undefined, id?: string | null) {
  if (username) return `@${username}`;
  if (firstName?.trim()) return firstName.trim();
  return id ? `Telegram ${id}` : "Cuenta de Telegram";
}

function escapeTelegramHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function formatBulletinForTelegram(title: string, body: string, publicUrl?: string | null) {
  const heading = escapeTelegramHtml(title.trim()).slice(0, 180);
  const content = escapeTelegramHtml(body.trim()).slice(0, 3_700);
  const footer = publicUrl ? `\n\n<a href="${escapeTelegramHtml(publicUrl)}">Ver novedades en Chile3X</a>` : "";
  return `<b>${heading}</b>\n\n${content}${footer}`.slice(0, 4_096);
}

export function parseBulletinFromTelegram(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim().slice(0, 4_096);
  const [firstLine = "Novedad de Chile3X", ...rest] = normalized.split("\n");
  const title = firstLine.replace(/^#+\s*/, "").trim().slice(0, 120) || "Novedad de Chile3X";
  const body = (rest.join("\n").trim() || normalized).slice(0, 3_800);
  return { title, body };
}

export function createTelegramOutboxValues(input: {
  kind: TelegramOutboxKind;
  payload: Record<string, unknown>;
  userId?: string | null;
  entityId?: string | null;
}) {
  const id = `telegram_job_${crypto.randomUUID()}`;
  return {
    id,
    kind: input.kind,
    userId: input.userId ?? null,
    entityId: input.entityId ?? null,
    payload: JSON.stringify(input.payload),
  };
}

export async function dispatchTelegramJob(jobId: string) {
  try {
    const { env } = await import("cloudflare:workers");
    await env.TELEGRAM_QUEUE.send({ type: "telegram.outbox", jobId } satisfies TelegramQueueMessage);
    return true;
  } catch (error) {
    console.error("Unable to dispatch Telegram outbox job", { jobId, error });
    await recordOperationalEvent({
      category: "telegram",
      eventName: "telegram.queue.dispatch",
      outcome: "failure",
      detail: "La acción quedó en la bandeja de salida y será reintentada por la tarea programada.",
    });
    return false;
  }
}

export async function queueTelegramJob(input: {
  kind: TelegramOutboxKind;
  payload: Record<string, unknown>;
  userId?: string | null;
  entityId?: string | null;
}) {
  const values = createTelegramOutboxValues(input);
  await (await getDb()).insert(telegramOutboxJobs).values(values);
  await dispatchTelegramJob(values.id);
  return values.id;
}
