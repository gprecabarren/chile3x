import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit, type AdminAuditInput } from "@/lib/admin-audit";
import { getDb } from "@/db";
import { forumPosts, forumSections, forumTopics } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { FORUM_LIMITS, FORUM_MAX_SECTIONS, FORUM_PAGE_SIZE, ForumInputError, forumOrder, forumText } from "@/lib/forum-policy";

const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
function failure(error: string, status: number) { return NextResponse.json({ error }, { status, headers: privateHeaders }); }

async function readForm(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw new ForumInputError("Formato de formulario no admitido.");
  const reader = request.body?.getReader();
  const parts: Uint8Array[] = []; let size = 0;
  if (reader) try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 64_000) { await reader.cancel(); throw new ForumInputError("El formulario es demasiado grande. Reduce el texto.", 413); }
      parts.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(new TextDecoder().decode(bytes))) {
    if (form.has(key)) throw new ForumInputError("El formulario contiene campos duplicados.");
    form.set(key, value);
  }
  return form;
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return failure("Solicitud no válida. Recarga la página e inténtalo nuevamente.", 403); }
  const admin = await getCurrentAdmin();
  if (!admin) return failure("Inicia sesión como administrador.", 401);
  if (!adminHasCapability(admin, "forum.manage")) return failure("Tu acceso no permite administrar el foro privado.", 403);
  try {
    const form = await readForm(request);
    const action = forumText(form, "action", 30);
    const now = new Date().toISOString();
    const { env } = await import("cloudflare:workers");
    const db = await getDb();
    let audit: AdminAuditInput;
    let path = "/foro";
    if (action === "section_create" || action === "section_update") {
      const fields = {
        groupName: forumText(form, "grupo", FORUM_LIMITS.group), title: forumText(form, "nombre", FORUM_LIMITS.sectionTitle),
        description: forumText(form, "descripcion", FORUM_LIMITS.description, false), rules: forumText(form, "reglas", FORUM_LIMITS.rules, false),
        sortOrder: forumOrder(form), isArchived: form.get("archivada") === "on", updatedAt: now,
      };
      let id: string;
      if (action === "section_create") {
        id = `fsec_${crypto.randomUUID()}`;
        const result = await env.DB.prepare("INSERT INTO forum_sections(id,group_name,title,description,rules,sort_order,is_archived,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM forum_sections) < ?")
          .bind(id, fields.groupName, fields.title, fields.description, fields.rules, fields.sortOrder, Number(fields.isArchived), now, FORUM_MAX_SECTIONS).run();
        if (!result.meta.changes) throw new ForumInputError("Se alcanzó el límite de secciones de la beta. Edita una sección existente.", 409);
      } else {
        id = forumText(form, "id", 80);
        const version = forumText(form, "version", 32);
        const updated = await db.update(forumSections).set(fields).where(and(eq(forumSections.id, id), eq(forumSections.updatedAt, version))).returning({ id: forumSections.id });
        if (!updated.length) throw new ForumInputError("La sección cambió en otra pestaña o ya no existe. Recarga antes de guardar.", 409);
      }
      audit = { category: "forum", action: `forum.${action}`, entityType: "forum_section", entityId: id, entityLabel: fields.title, summary: `${action === "section_create" ? "Creó" : "Editó"} la sección «${fields.title}».`, after: { group: fields.groupName, order: fields.sortOrder, archived: fields.isArchived } };
      path = "/foro/secciones";
    } else if (action === "topic_create") {
      const sectionId = forumText(form, "seccion", 80);
      const title = forumText(form, "titulo", FORUM_LIMITS.title);
      const body = forumText(form, "texto", FORUM_LIMITS.body);
      const id = `ftopic_${crypto.randomUUID()}`; const postId = `fpost_${crypto.randomUUID()}`;
      const author = (admin.displayName || admin.githubLogin || "Administración").slice(0, 120);
      const results = await env.DB.batch([
        env.DB.prepare("INSERT INTO forum_topics(id,section_id,title,author_id,author_name,created_at,updated_at) SELECT ?,id,?,?,?,?,? FROM forum_sections WHERE id = ? AND is_archived = 0").bind(id, title, admin.id, author, now, now, sectionId),
        env.DB.prepare("INSERT INTO forum_posts(id,topic_id,author_id,author_name,body,created_at,updated_at) SELECT ?,id,?,?,?,?,? FROM forum_topics WHERE id = ?").bind(postId, admin.id, author, body, now, now, id),
      ]);
      if (!results[0].meta.changes) throw new ForumInputError("Elige una sección activa. Esa sección no existe o está archivada.", 409);
      audit = { category: "forum", action: "forum.topic_create", entityType: "forum_topic", entityId: id, entityLabel: title, summary: `Creó el tema «${title}».`, after: { sectionId } };
      path = `/foro/tema/${id}`;
    } else if (action === "topic_update") {
      const id = forumText(form, "id", 80);
      const [previous] = await db.select().from(forumTopics).where(eq(forumTopics.id, id)).limit(1);
      if (!previous) throw new ForumInputError("El tema ya no existe.", 404);
      const version = forumText(form, "version", 32);
      const sectionId = forumText(form, "seccion", 80); const title = forumText(form, "titulo", FORUM_LIMITS.title);
      const pinned = form.get("fijado") === "on"; const locked = form.get("cerrado") === "on"; const trash = form.get("papelera") === "on";
      const result = await env.DB.prepare("UPDATE forum_topics SET section_id=?,title=?,is_pinned=?,is_locked=?,trashed_at=?,updated_at=? WHERE id=? AND updated_at=? AND EXISTS(SELECT 1 FROM forum_sections WHERE id=?)")
        .bind(sectionId, title, Number(pinned), Number(locked), trash ? (previous.trashedAt || now) : null, now, id, version, sectionId).run();
      if (!result.meta.changes) throw new ForumInputError("El tema cambió en otra pestaña o la sección no existe. Recarga antes de guardar.", 409);
      audit = { category: "forum", action: "forum.topic_update", entityType: "forum_topic", entityId: id, entityLabel: title, summary: `Editó o moderó el tema «${title}».`, before: { title: previous.title, sectionId: previous.sectionId, pinned: previous.isPinned, locked: previous.isLocked, trashedAt: previous.trashedAt }, after: { title, sectionId, pinned, locked, trash } };
      path = `/foro/tema/${id}`;
    } else if (action === "post_create") {
      const topicId = forumText(form, "tema", 80); const body = forumText(form, "texto", FORUM_LIMITS.body);
      const id = `fpost_${crypto.randomUUID()}`; const author = (admin.displayName || admin.githubLogin || "Administración").slice(0, 120);
      const results = await env.DB.batch([
        env.DB.prepare("INSERT INTO forum_posts(id,topic_id,author_id,author_name,body,created_at,updated_at) SELECT ?,t.id,?,?,?,?,? FROM forum_topics t JOIN forum_sections s ON s.id=t.section_id WHERE t.id=? AND t.trashed_at IS NULL AND t.is_locked=0 AND s.is_archived=0")
          .bind(id, admin.id, author, body, now, now, topicId),
        env.DB.prepare("UPDATE forum_topics SET updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM forum_posts WHERE id=?)").bind(now, topicId, id),
        env.DB.prepare("SELECT count(*) AS total FROM forum_posts WHERE topic_id=?").bind(topicId),
      ]);
      if (!results[0].meta.changes) throw new ForumInputError("No es posible responder: el tema está cerrado, en papelera o su sección está archivada.", 409);
      const total = Number((results[2].results[0] as { total?: number })?.total || 1);
      path = `/foro/tema/${topicId}?pagina=${Math.ceil(total / FORUM_PAGE_SIZE)}#${id}`;
      audit = { category: "forum", action: "forum.post_create", entityType: "forum_post", entityId: id, entityLabel: "Respuesta", summary: "Añadió una respuesta en el foro privado.", metadata: { topicId, characters: body.length } };
    } else if (action === "post_update") {
      const id = forumText(form, "id", 80); const body = forumText(form, "texto", FORUM_LIMITS.body);
      const version = forumText(form, "version", 32); const trash = form.get("papelera") === "on";
      const [previous] = await db.select().from(forumPosts).where(eq(forumPosts.id, id)).limit(1);
      if (!previous) throw new ForumInputError("La respuesta ya no existe.", 404);
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE forum_posts SET body=?,trashed_at=?,updated_at=? WHERE id=? AND updated_at=?").bind(body, trash ? (previous.trashedAt || now) : null, now, id, version),
        env.DB.prepare("UPDATE forum_topics SET updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM forum_posts WHERE id=? AND updated_at=?)").bind(now, previous.topicId, id, now),
      ]);
      if (!results[0].meta.changes) throw new ForumInputError("Esta respuesta cambió en otra pestaña. Recarga antes de guardar.", 409);
      path = `/foro/tema/${previous.topicId}`;
      audit = { category: "forum", action: "forum.post_update", entityType: "forum_post", entityId: id, entityLabel: "Respuesta", summary: "Editó o moderó una respuesta del foro privado.", before: { trashedAt: previous.trashedAt }, after: { trash }, metadata: { topicId: previous.topicId, characters: body.length } };
    } else throw new ForumInputError("Acción no admitida.");
    await recordAdminAudit(admin, audit);
    // Bodies are deliberately omitted from audit snapshots; no duplicate copies of posts.
    return request.headers.get("accept")?.includes("application/json")
      ? NextResponse.json({ redirectTo: path }, { headers: privateHeaders })
      : NextResponse.redirect(new URL(path, request.url), { status: 303, headers: privateHeaders });
  } catch (error) {
    if (error instanceof ForumInputError) return failure(error.message, error.status);
    const reference = crypto.randomUUID().slice(0, 8);
    console.error("Forum operation failed", { reference, error });
    return failure(`No se pudo confirmar la operación. Revisa el foro antes de repetirla y contacta a soporte si persiste. Referencia: ${reference}.`, 500);
  }
}
