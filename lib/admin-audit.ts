import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs, adminGithubIdentities } from "@/db/schema";
import type { AdminUser } from "@/lib/auth";
import { recordOperationalEvent } from "@/lib/operations";

export const ADMIN_AUDIT_CATEGORIES = {
  access: "Acceso administrativo",
  accounts: "Cuentas",
  profiles: "Anuncios",
  media: "Fotos, videos y contenido",
  reviews: "Reseñas",
  reports: "Reportes",
  quality: "Pruebas y errores",
  news: "Noticias",
  sponsors: "Sitios asociados",
  telegram: "Telegram",
  settings: "Configuración",
  security: "Accesos privados",
  forum: "Foro privado beta",
} as const;

export const ADMIN_AUDIT_ACTIONS = {
  "sample.create":"Creó una muestra privada",
  "sample.share":"Guardó el enlace privado de una muestra",
  "sample.adopt_link":"Conservó un enlace privado anterior",
  "sample.extend":"Extendió el plazo de una muestra",
  "sample.trash":"Envió una muestra a papelera",
  "sample.restore":"Restauró una muestra privada",
  "sample.contact_mark":"Marcó un posible anunciante como contactado",
  "sample.contact_clear":"Retiró la marca de contacto de una muestra",
  "sample.process_photo":"Editó una foto privada de muestra",
  "sample.reorder_media":"Ordenó los medios de una muestra",
  "sample.save":"Editó una muestra privada",
  "sample.upload":"Subió un archivo privado de muestra",
  "sample.remove_media":"Retiró un archivo de muestra",
  "sample.cover":"Cambió la foto principal de una muestra",
  "sample.revoke":"Revocó el acceso a una muestra",
  "sample.migrate":"Convirtió una muestra en anuncio real",
  "sample.delete":"Eliminó una muestra privada",
  "legal.draft": "Guardó un borrador legal",
  "legal.publish": "Publicó una versión legal",
  "legal.discard": "Descartó un borrador legal",
  "forum.rules_update": "Actualizó las normas del foro",
  "forum.watch_update": "Cambió el seguimiento de un tema",
  "forum.notifications_read": "Leyó notificaciones propias del foro",
  "forum.report_create": "Denunció un mensaje del foro",
  "forum.report_resolve": "Atendió una denuncia del foro",
  "forum.attachment_upload": "Subió un adjunto del foro para revisión",
  "forum.attachment_review": "Revisó un adjunto del foro",
  "forum.attachment_remove": "Retiró un adjunto del foro",
  "forum.attachment_restore": "Restauró un adjunto del foro",
  "help.guide_create": "Creó una guía de ayuda",
  "help.guide_update": "Editó una guía de ayuda",
  "help.guide_delete": "Retiró una guía de ayuda",
  "help.guide_restore": "Restauró una guía de ayuda",
  "forum.section_create": "Creó una sección del foro",
  "forum.section_update": "Editó o archivó una sección del foro",
  "forum.topic_create": "Creó un tema del foro",
  "forum.topic_update": "Editó o moderó un tema del foro",
  "forum.post_create": "Respondió en el foro",
  "forum.post_update": "Editó o moderó una respuesta del foro",
  "media.public_bulk_approve": "Aprobó varios archivos de un anuncio",
  "media.exclusive_bulk_approve": "Aprobó varios archivos de contenido exclusivo",
  "admin.login": "Inició sesión",
  "admin.logout": "Cerró sesión",
  "admin.grant_create": "Autorizó un administrador",
  "admin.grant_update": "Cambió permisos administrativos",
  "admin.grant_revoke": "Revocó un acceso administrativo",
  "admin.grant_reactivate": "Reactivó un acceso administrativo",
  "admin.sessions_revoke": "Cerró sesiones administrativas",
  "operations.storage_scan": "Actualizó la revisión de almacenamiento",
  "account.create": "Creó una cuenta",
  "account.enable": "Reactivó una cuenta",
  "account.disable": "Deshabilitó una cuenta",
  "account.delete_permanently": "Eliminó permanentemente una cuenta",
  "account.details_update": "Modificó datos de una cuenta",
  "account.password_update": "Cambió la contraseña de una cuenta",
  "account.reset_link": "Envió un enlace de recuperación",
  "account.email_verification_exempt": "Autorizó una excepción de verificación de correo",
  "account.email_verification_required": "Retiró una excepción de verificación de correo",
  "profile.create": "Creó un anuncio para una cuenta",
  "profile.details_update": "Editó los datos de un anuncio",
  "story.create": "Publicó una historia para un anunciante",
  "story.delete": "Eliminó una historia de un anunciante",
  "story.qa_retime": "Varió los minutos ficticios de historias QA",
  "qa.profile_configure": "Preparó campos de un anuncio ficticio para QA",
  "qa.profile_restore": "Restauró los datos originales de un anuncio pendiente",
  "profile.status_update": "Cambió estados de un anuncio",
  "profile.trash": "Envió un anuncio a la papelera",
  "profile.trash_self": "El anunciante envió su anuncio a la papelera",
  "profile.trash_email_verification": "Envió un anuncio a papelera tras 31 días sin verificar correo",
  "profile.restore": "Restauró un anuncio de la papelera",
  "profile.delete_permanently": "Eliminó definitivamente un anuncio",
  "media.public_approve": "Aprobó un archivo público",
  "media.public_process": "Procesó una foto pública",
  "media.public_unapprove": "Devolvió un archivo público a revisión",
  "media.public_delete": "Eliminó un archivo público",
  "media.exclusive_approve": "Aprobó contenido exclusivo",
  "media.exclusive_unapprove": "Devolvió contenido exclusivo a revisión",
  "media.exclusive_delete": "Eliminó contenido exclusivo",
  "review.approve": "Publicó una reseña",
  "review.reject": "Rechazó una reseña",
  "review.delete": "Eliminó una reseña",
  "report.update": "Actualizó un reporte",
  "bug.update": "Respondió o actualizó un reporte de tester",
  "news.create": "Creó una noticia",
  "news.update": "Modificó una noticia",
  "news.delete": "Eliminó una noticia",
  "news.media_upload": "Subió una imagen de noticia",
  "sponsor.group_create": "Creó un grupo de sitios asociados",
  "sponsor.group_update": "Modificó un grupo de sitios asociados",
  "sponsor.group_delete": "Eliminó un grupo de sitios asociados",
  "sponsor.create": "Creó un sitio asociado",
  "sponsor.update": "Modificó un sitio asociado",
  "sponsor.delete": "Eliminó un sitio asociado",
  "sponsor.visibility_update": "Cambió la visibilidad de Sitios asociados",
  "telegram.link_admin": "Vinculó una identidad administrativa de Telegram",
  "telegram.settings_update": "Modificó la configuración de Telegram",
  "telegram.chat_update": "Asignó o modificó un chat de Telegram",
  "telegram.bulletin_create": "Creó una novedad",
  "telegram.bulletin_update": "Modificó una novedad",
  "telegram.bulletin_delete": "Archivó una novedad",
  "telegram.moderation_update": "Modificó una medida de moderación",
  "telegram.member_ban": "Vetó a una persona de Telegram",
  "telegram.member_unban": "Retiró un veto de Telegram",
  "settings.update": "Modificó la configuración",
  "private.document_view": "Abrió un documento privado",
  "private.document_upload": "Subió o reemplazó un documento privado",
  "private.document_delete": "Eliminó un documento privado",
  "private.report_evidence_view": "Abrió evidencia de un reporte",
  "private.exclusive_media_view": "Abrió contenido exclusivo",
  "private.unpublished_media_view": "Abrió un archivo no público",
} as const;

export const ADMIN_AUDIT_ENTITY_TYPES = {
  sample:"Muestra privada",
  legal_document: "Documento legal",
  forum_section: "Sección del foro",
  forum_topic: "Tema del foro",
  forum_post: "Respuesta del foro",
  admin: "Administrador",
  account: "Cuenta",
  account_deletion: "Eliminación de cuenta",
  profile: "Anuncio",
  story: "Historia",
  public_media: "Archivo público",
  exclusive_media: "Contenido exclusivo",
  exclusive_collection: "Biblioteca de contenido exclusivo",
  review: "Reseña",
  report: "Reporte",
  bug_report: "Reporte de tester",
  news: "Noticia",
  news_media: "Imagen de noticia",
  sponsor_group: "Grupo de sitios asociados",
  sponsor: "Sitio asociado",
  telegram_settings: "Configuración de Telegram",
  telegram_chat: "Chat de Telegram",
  telegram_bulletin: "Novedad",
  telegram_moderation: "Caso de moderación",
  telegram_member: "Miembro de Telegram",
  settings: "Configuración",
  verification_document: "Documento privado",
  report_evidence: "Evidencia privada",
} as const;

export type AdminAuditCategory = keyof typeof ADMIN_AUDIT_CATEGORIES;
export type AdminAuditAction = keyof typeof ADMIN_AUDIT_ACTIONS;
export type AdminAuditEntityType = keyof typeof ADMIN_AUDIT_ENTITY_TYPES;

type JsonObject = Record<string, unknown>;

export type AdminAuditInput = {
  category: AdminAuditCategory;
  action: AdminAuditAction;
  summary: string;
  entityType: AdminAuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: JsonObject | null;
  after?: JsonObject | null;
  metadata?: JsonObject | null;
  outcome?: "success" | "failure";
};

const MAX_SNAPSHOT_LENGTH = 16_000;
const REDACTED_KEYS = /password|secret|token|hash|r2key/i;

function auditJson(value: JsonObject | null | undefined) {
  if (!value) return null;
  const serialized = JSON.stringify(value, (key, item) => REDACTED_KEYS.test(key) ? "[protegido]" : item);
  return serialized.length <= MAX_SNAPSHOT_LENGTH
    ? serialized
    : JSON.stringify({ truncated: true, preview: serialized.slice(0, MAX_SNAPSHOT_LENGTH) });
}

export function parseAuditJson(value: string | null): JsonObject | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : null;
  } catch {
    return null;
  }
}

/**
 * Audit recording is deliberately isolated from the requested operation. A
 * temporary logging failure is reported to Workers logs but never repeats or
 * rolls back an already-completed administrative action.
 */
export async function recordAdminAudit(actor: AdminUser, input: AdminAuditInput) {
  try {
    const db = await getDb();
    const [identity] = actor.githubLogin ? [{githubLogin:actor.githubLogin}] : await db.select({ githubLogin: adminGithubIdentities.githubLogin })
      .from(adminGithubIdentities)
      .where(eq(adminGithubIdentities.userId, actor.id))
      .limit(1);
    await db.insert(adminAuditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      actorGithubLogin: identity?.githubLogin ?? actor.githubLogin,
      actorEmail: actor.email,
      actorName: actor.displayName,
      category: input.category,
      action: input.action,
      outcome: input.outcome ?? "success",
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary.slice(0, 500),
      beforeData: auditJson(input.before),
      afterData: auditJson(input.after),
      metadata: auditJson(input.metadata),
    });
    return true;
  } catch (error) {
    console.error("Unable to record administrative audit event", {
      actorId: actor.id,
      action: input.action,
      entityId: input.entityId,
      error,
    });
    await recordOperationalEvent({ category: "audit", eventName: "admin.audit", outcome: "failure", detail: "No se pudo guardar un evento del historial administrativo." });
    return false;
  }
}
