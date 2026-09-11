import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { telegramAccountLinks, telegramMemberships, telegramOutboxJobs, users } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { createTelegramOutboxValues, dispatchTelegramJob } from "@/lib/telegram";

function redirectWithNotice(request: Request, returnTo: string, notice: string) {
  const url = new URL(returnTo, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "accounts.manage") || !adminHasCapability(admin, "telegram.moderate")) return new Response("No tienes permiso para moderar esta identidad.", { status: 403 });

  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const returnTo = safeAdminReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null);
  const intent = formData.get("intent");
  if (intent !== "ban" && intent !== "unban") return redirectWithNotice(request, returnTo, "telegram_error");
  if (intent === "ban" && formData.get("confirmation") !== "VETAR") return redirectWithNotice(request, returnTo, "telegram_error");

  const db = await getDb();
  const [target] = await db.select({ id: users.id, role: users.role, email: users.email, displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
  const [link] = await db.select().from(telegramAccountLinks).where(eq(telegramAccountLinks.userId, userId)).limit(1);
  if (!target || target.role === "admin" || !link || (intent === "ban" ? link.status !== "linked" : link.status !== "banned")) return redirectWithNotice(request, returnTo, "telegram_error");

  const now = new Date().toISOString();
  const reasonInput = formData.get("reason");
  const reason = intent === "ban" && typeof reasonInput === "string" ? reasonInput.trim().slice(0, 220) : "";
  if (intent === "ban" && reason.length < 5) return redirectWithNotice(request, returnTo, "telegram_error");
  const job = createTelegramOutboxValues({ kind: intent === "ban" ? "ban_member" : "unban_member", userId, entityId: link.id, payload: { userId, telegramUserId: link.telegramUserId, reason: intent === "ban" ? reason : "Veto retirado por la administración." } });
  await db.batch([
    db.update(telegramAccountLinks).set({ status: intent === "ban" ? "banned" : "linked", revokedAt: intent === "ban" ? now : null, revokeReason: intent === "ban" ? reason : null, updatedAt: now }).where(eq(telegramAccountLinks.id, link.id)),
    db.update(telegramMemberships).set({ status: intent === "ban" ? "banned" : "left", leftAt: now, updatedAt: now }).where(eq(telegramMemberships.userId, userId)),
    db.insert(telegramOutboxJobs).values(job),
  ]);
  await dispatchTelegramJob(job.id);
  const label = target.displayName ?? target.email;
  await recordAdminAudit(admin, { category: "telegram", action: intent === "ban" ? "telegram.member_ban" : "telegram.member_unban", summary: `${intent === "ban" ? "Vetó" : "Retiró el veto de"} la identidad de Telegram vinculada a ${label}.`, entityType: "telegram_member", entityId: link.telegramUserId, entityLabel: link.username ? `@${link.username}` : label, before: { status: link.status }, after: { status: intent === "ban" ? "banned" : "linked", requiresExplicitReentry: intent === "unban" } });
  return redirectWithNotice(request, returnTo, intent === "ban" ? "telegram_banned" : "telegram_unbanned");
}
