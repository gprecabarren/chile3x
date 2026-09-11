import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { telegramChats } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const roles = new Set(["unassigned", "public", "members", "alerts"] as const);

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "telegram.manage")) return new Response("No tienes permiso para configurar chats.", { status: 403 });
  const [{ chatId }, formData] = await Promise.all([params, request.formData()]);
  const role = formData.get("role");
  const updatesThreadInput = typeof formData.get("updates_thread_id") === "string" ? String(formData.get("updates_thread_id")).trim() : "";
  if (typeof role !== "string" || !roles.has(role as "unassigned") || (updatesThreadInput && !/^\d{1,16}$/.test(updatesThreadInput))) return new Response("Asignación no válida.", { status: 400 });
  const db = await getDb();
  const [chat] = await db.select().from(telegramChats).where(eq(telegramChats.id, chatId)).limit(1);
  if (!chat) return new Response("Chat no encontrado.", { status: 404 });
  const now = new Date().toISOString();
  const nextRole = role as "unassigned" | "public" | "members" | "alerts";
  if (nextRole === "unassigned") {
    await db.update(telegramChats).set({ role: nextRole, updatesThreadId: null, updatedAt: now }).where(eq(telegramChats.id, chatId));
  } else {
    await db.batch([
      db.update(telegramChats).set({ role: "unassigned", updatesThreadId: null, updatedAt: now }).where(and(eq(telegramChats.role, nextRole), ne(telegramChats.id, chatId))),
      db.update(telegramChats).set({ role: nextRole, updatesThreadId: nextRole === "public" ? updatesThreadInput || null : null, updatedAt: now }).where(eq(telegramChats.id, chatId)),
    ]);
  }
  await recordAdminAudit(admin, {
    category: "telegram",
    action: "telegram.chat_update",
    summary: `Asignó “${chat.title}” como ${nextRole}.`,
    entityType: "telegram_chat",
    entityId: chat.id,
    entityLabel: chat.title,
    before: { role: chat.role, updatesThreadId: chat.updatesThreadId },
    after: { role: nextRole, updatesThreadId: nextRole === "public" ? updatesThreadInput || null : null },
  });
  return NextResponse.redirect(new URL("/admin/telegram?notice=chat_saved", request.url), 303);
}
