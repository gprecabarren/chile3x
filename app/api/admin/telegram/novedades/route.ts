import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { telegramBulletins, telegramOutboxJobs } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { createTelegramOutboxValues, dispatchTelegramJob } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "telegram.publish")) return new Response("No tienes permiso para publicar novedades.", { status: 403 });
  const formData = await request.formData();
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim().slice(0, 120) : "";
  const body = typeof formData.get("body") === "string" ? String(formData.get("body")).trim().slice(0, 3_800) : "";
  const status = formData.get("status") === "draft" ? "draft" : "published";
  if (!title || !body) return new Response("El título y el texto son obligatorios.", { status: 400 });
  const id = `telegram_bulletin_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const db = await getDb();
  if (status === "published") {
    const job = createTelegramOutboxValues({ kind: "publish_bulletin", userId: admin.id, entityId: id, payload: { bulletinId: id } });
    await db.batch([
      db.insert(telegramBulletins).values({ id, title, body, source: "web", status, authorUserId: admin.id, publishedAt: now, updatedAt: now }),
      db.insert(telegramOutboxJobs).values(job),
    ]);
    await dispatchTelegramJob(job.id);
  } else {
    await db.insert(telegramBulletins).values({ id, title, body, source: "web", status, authorUserId: admin.id, updatedAt: now });
  }
  await recordAdminAudit(admin, { category: "telegram", action: "telegram.bulletin_create", summary: `${status === "published" ? "Publicó" : "Guardó como borrador"} la novedad “${title}”.`, entityType: "telegram_bulletin", entityId: id, entityLabel: title, after: { title, status, source: "web" } });
  return NextResponse.redirect(new URL(`/admin/telegram?notice=${status === "published" ? "bulletin_published" : "bulletin_drafted"}`, request.url), 303);
}
