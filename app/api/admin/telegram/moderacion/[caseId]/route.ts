import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { telegramAccountLinks, telegramModerationCases, telegramOutboxJobs } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { createTelegramOutboxValues, dispatchTelegramJob } from "@/lib/telegram";

export async function POST(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "telegram.moderate")) return new Response("No tienes permiso para moderar Telegram.", { status: 403 });
  const [{ caseId }, formData] = await Promise.all([params, request.formData()]);
  const intent = formData.get("intent");
  if (intent !== "resolve" && intent !== "dismiss" && intent !== "ban" && intent !== "unban") return new Response("Acción no válida.", { status: 400 });
  const db = await getDb();
  const [item] = await db.select().from(telegramModerationCases).where(eq(telegramModerationCases.id, caseId)).limit(1);
  if (!item) return new Response("Caso no encontrado.", { status: 404 });
  const now = new Date().toISOString();
  if (intent === "ban" || intent === "unban") {
    const job = createTelegramOutboxValues({ kind: intent === "ban" ? "ban_member" : "unban_member", userId: item.userId, entityId: caseId, payload: { telegramUserId: item.telegramUserId, reason: item.reason } });
    await db.batch([
      db.update(telegramModerationCases).set({ status: "resolved", resolvedAt: now, actorUserId: admin.id, action: intent === "ban" ? "ban" : "unban" }).where(eq(telegramModerationCases.id, caseId)),
      db.update(telegramAccountLinks).set({ status: intent === "ban" ? "banned" : "linked", revokedAt: intent === "ban" ? now : null, revokeReason: intent === "ban" ? item.reason : null, updatedAt: now }).where(eq(telegramAccountLinks.telegramUserId, item.telegramUserId)),
      db.insert(telegramOutboxJobs).values(job),
    ]);
    await dispatchTelegramJob(job.id);
    await recordAdminAudit(admin, { category: "telegram", action: intent === "ban" ? "telegram.member_ban" : "telegram.member_unban", summary: `${intent === "ban" ? "Vetó" : "Retiró el veto de"} una identidad de Telegram.`, entityType: "telegram_member", entityId: item.telegramUserId, entityLabel: item.telegramUsername ? `@${item.telegramUsername}` : "Identidad de Telegram" });
  } else {
    await db.update(telegramModerationCases).set({ status: intent === "dismiss" ? "dismissed" : "resolved", resolvedAt: now, actorUserId: admin.id }).where(eq(telegramModerationCases.id, caseId));
    await recordAdminAudit(admin, { category: "telegram", action: "telegram.moderation_update", summary: `${intent === "dismiss" ? "Descartó" : "Cerró"} un caso de moderación.`, entityType: "telegram_moderation", entityId: caseId, entityLabel: item.reason });
  }
  return NextResponse.redirect(new URL("/admin/telegram?notice=moderation_updated", request.url), 303);
}
