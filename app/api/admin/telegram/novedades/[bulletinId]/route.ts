import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { telegramBulletins, telegramOutboxJobs } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { createTelegramOutboxValues, dispatchTelegramJob } from "@/lib/telegram";

export async function POST(request: NextRequest, { params }: { params: Promise<{ bulletinId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "telegram.publish")) return new Response("No tienes permiso para editar novedades.", { status: 403 });
  const [{ bulletinId }, formData] = await Promise.all([params, request.formData()]);
  const db = await getDb();
  const [current] = await db.select().from(telegramBulletins).where(eq(telegramBulletins.id, bulletinId)).limit(1);
  if (!current) return new Response("Novedad no encontrada.", { status: 404 });
  const intent = formData.get("intent");
  const now = new Date().toISOString();
  if (intent === "archive") {
    const job = createTelegramOutboxValues({ kind: "delete_bulletin", userId: admin.id, entityId: bulletinId, payload: { bulletinId } });
    await db.batch([
      db.update(telegramBulletins).set({ status: "archived", updatedAt: now }).where(eq(telegramBulletins.id, bulletinId)),
      db.insert(telegramOutboxJobs).values(job),
    ]);
    await dispatchTelegramJob(job.id);
    await recordAdminAudit(admin, { category: "telegram", action: "telegram.bulletin_delete", summary: `Archivó la novedad “${current.title}”.`, entityType: "telegram_bulletin", entityId: bulletinId, entityLabel: current.title });
    return NextResponse.redirect(new URL("/admin/telegram?notice=bulletin_archived", request.url), 303);
  }
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim().slice(0, 120) : "";
  const body = typeof formData.get("body") === "string" ? String(formData.get("body")).trim().slice(0, 3_800) : "";
  const status = formData.get("status") === "draft" ? "draft" : "published";
  if (!title || !body) return new Response("El título y el texto son obligatorios.", { status: 400 });
  const jobKind = status === "published" ? (current.status === "published" ? "edit_bulletin" : "publish_bulletin") : current.status === "published" ? "delete_bulletin" : null;
  const job = jobKind ? createTelegramOutboxValues({ kind: jobKind, userId: admin.id, entityId: bulletinId, payload: { bulletinId } }) : null;
  if (job) {
    await db.batch([
      db.update(telegramBulletins).set({ title, body, status, publishedAt: status === "published" ? current.publishedAt ?? now : null, updatedAt: now }).where(eq(telegramBulletins.id, bulletinId)),
      db.insert(telegramOutboxJobs).values(job),
    ]);
    await dispatchTelegramJob(job.id);
  } else {
    await db.update(telegramBulletins).set({ title, body, status, publishedAt: null, updatedAt: now }).where(eq(telegramBulletins.id, bulletinId));
  }
  await recordAdminAudit(admin, { category: "telegram", action: "telegram.bulletin_update", summary: `Actualizó la novedad “${title}”.`, entityType: "telegram_bulletin", entityId: bulletinId, entityLabel: title, before: { title: current.title, status: current.status }, after: { title, status } });
  return NextResponse.redirect(new URL("/admin/telegram?notice=bulletin_updated", request.url), 303);
}
