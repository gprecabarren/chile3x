import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { telegramConfiguration } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { TELEGRAM_CONFIG_ID } from "@/lib/telegram";

type TelegramEnvelope = { ok?: boolean; result?: { username?: string }; description?: string };

function envelope(value: unknown): TelegramEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const item = value as Record<string, unknown>;
  const result = item.result && typeof item.result === "object" && !Array.isArray(item.result) ? item.result as Record<string, unknown> : null;
  return {
    ok: typeof item.ok === "boolean" ? item.ok : undefined,
    description: typeof item.description === "string" ? item.description : undefined,
    result: result ? { username: typeof result.username === "string" ? result.username : undefined } : undefined,
  };
}

async function call(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const value = envelope(await response.json().catch(() => null));
  if (!response.ok || !value.ok) throw new Error(value.description || "Telegram rechazó la configuración.");
  return value.result;
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "telegram.manage")) return new Response("No tienes permiso para instalar el webhook.", { status: 403 });
  const { env } = await import("cloudflare:workers");
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.redirect(new URL("/admin/telegram?notice=secrets_missing", request.url), 303);
  try {
    const me = await call(env.TELEGRAM_BOT_TOKEN, "getMe", {});
    const username = me?.username?.trim() ?? "";
    if (!username) throw new Error("El bot no devolvió su usuario.");
    await call(env.TELEGRAM_BOT_TOKEN, "setWebhook", {
      url: "https://chile3x.cl/api/telegram/webhook",
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "edited_message", "chat_join_request", "chat_member", "my_chat_member"],
      drop_pending_updates: false,
    });
    await call(env.TELEGRAM_BOT_TOKEN, "setMyCommands", {
      commands: [
        { command: "rules", description: "Ver las normas de la comunidad" },
        { command: "status", description: "Consultar estado al responder a una persona" },
        { command: "warn", description: "Advertir al responder a un mensaje" },
        { command: "mute", description: "Restringir al responder a un mensaje" },
        { command: "ban", description: "Vetar al responder a un mensaje" },
        { command: "unban", description: "Retirar un veto al responder" },
      ],
    });
    const now = new Date().toISOString();
    await (await getDb()).update(telegramConfiguration).set({ botUsername: username, updatedBy: admin.id, updatedAt: now }).where(eq(telegramConfiguration.id, TELEGRAM_CONFIG_ID));
    await recordAdminAudit(admin, { category: "telegram", action: "telegram.settings_update", summary: "Instaló o renovó el webhook y los comandos del bot.", entityType: "telegram_settings", entityId: TELEGRAM_CONFIG_ID, entityLabel: `@${username}` });
    return NextResponse.redirect(new URL("/admin/telegram?notice=webhook_ready", request.url), 303);
  } catch (error) {
    console.error("Telegram webhook setup failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.redirect(new URL("/admin/telegram?notice=webhook_error", request.url), 303);
  }
}
