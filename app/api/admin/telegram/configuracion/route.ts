import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings, telegramConfiguration } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { DEFAULT_TELEGRAM_RULES, normalizeTelegramCommunityUrl, normalizeTelegramUsername, TELEGRAM_CONFIG_ID } from "@/lib/telegram";

function text(formData: FormData, key: string, maximum: number) {
  const value = formData.get(key);
  return typeof value === "string" && value.length <= maximum ? value.trim() : null;
}

function integer(formData: FormData, key: string, minimum: number, maximum: number) {
  const value = Number.parseInt(String(formData.get(key) ?? ""), 10);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : null;
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "telegram.manage")) return new Response("No tienes permiso para configurar Telegram.", { status: 403 });
  const formData = await request.formData();
  const botUsernameInput = text(formData, "bot_username", 64);
  const communityInput = text(formData, "public_community_url", 180);
  const rulesText = text(formData, "rules_text", 6_000);
  const prohibitedTerms = text(formData, "prohibited_terms", 2_000);
  const botUsername = botUsernameInput ? normalizeTelegramUsername(botUsernameInput) : "";
  const publicCommunityUrl = communityInput === null ? null : normalizeTelegramCommunityUrl(communityInput);
  const floodMaxMessages = integer(formData, "flood_max_messages", 3, 30);
  const floodWindowSeconds = integer(formData, "flood_window_seconds", 5, 300);
  const duplicateWindowSeconds = integer(formData, "duplicate_window_seconds", 20, 3_600);
  const maxLinksPerMessage = integer(formData, "max_links_per_message", 0, 10);
  const strikeBanThreshold = integer(formData, "strike_ban_threshold", 2, 20);
  const temporaryRestrictionMinutes = integer(formData, "temporary_restriction_minutes", 5, 43_200);
  if (botUsernameInput === null || communityInput === null || rulesText === null || prohibitedTerms === null
    || (botUsernameInput && !botUsername) || publicCommunityUrl === null || floodMaxMessages === null
    || floodWindowSeconds === null || duplicateWindowSeconds === null || maxLinksPerMessage === null
    || strikeBanThreshold === null || temporaryRestrictionMinutes === null) {
    return new Response("La configuración de Telegram no es válida.", { status: 400 });
  }
  const now = new Date().toISOString();
  const values = {
    id: TELEGRAM_CONFIG_ID,
    botUsername: botUsername ?? "",
    publicCommunityUrl,
    rulesText: rulesText || DEFAULT_TELEGRAM_RULES,
    prohibitedTerms,
    moderationEnabled: formData.getAll("moderation_enabled").includes("enabled"),
    autoBanEnabled: formData.getAll("auto_ban_enabled").includes("enabled"),
    floodMaxMessages,
    floodWindowSeconds,
    duplicateWindowSeconds,
    maxLinksPerMessage,
    strikeBanThreshold,
    temporaryRestrictionMinutes,
    updatedBy: admin.id,
    updatedAt: now,
  };
  const db = await getDb();
  await db.batch([
    db.insert(telegramConfiguration).values(values).onConflictDoUpdate({ target: telegramConfiguration.id, set: values }),
    db.insert(siteSettings).values({ key: "contact_telegram", value: publicCommunityUrl, updatedBy: admin.id, updatedAt: now }).onConflictDoUpdate({ target: siteSettings.key, set: { value: publicCommunityUrl, updatedBy: admin.id, updatedAt: now } }),
  ]);
  await recordAdminAudit(admin, {
    category: "telegram",
    action: "telegram.settings_update",
    summary: "Actualizó la comunidad, las normas o los límites automáticos de Telegram.",
    entityType: "telegram_settings",
    entityId: TELEGRAM_CONFIG_ID,
    entityLabel: "Configuración de Telegram",
    after: { ...values, prohibitedTerms: prohibitedTerms ? "[configurados]" : "" },
  });
  return NextResponse.redirect(new URL("/admin/telegram?notice=settings_saved", request.url), 303);
}
