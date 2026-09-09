import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs, adminGithubIdentities } from "@/db/schema";
import type { AdminUser } from "@/lib/auth";

export const ADMIN_AUDIT_CATEGORIES = {
  access: "Acceso administrativo",
  accounts: "Cuentas",
  profiles: "Anuncios",
  media: "Fotos, videos y contenido",
  reviews: "Reseñas",
  reports: "Reportes",
  quality: "Pruebas y errores",
  news: "Noticias",
  settings: "Configuración",
  security: "Accesos privados",
} as const;

export const ADMIN_AUDIT_ACTIONS = {
  "admin.login": "Inició sesión",
  "admin.logout": "Cerró sesión",
  "admin.grant_create": "Autorizó un administrador",
  "admin.grant_update": "Cambió permisos administrativos",
  "admin.grant_revoke": "Revocó un acceso administrativo",
  "admin.grant_reactivate": "Reactivó un acceso administrativo",
  "admin.sessions_revoke": "Cerró sesiones administrativas",
  "account.create": "Creó una cuenta",
  "account.enable": "Reactivó una cuenta",
  "account.disable": "Deshabilitó una cuenta",
  "account.delete_permanently": "Eliminó permanentemente una cuenta",
  "account.details_update": "Modificó datos de una cuenta",
  "account.password_update": "Cambió la contraseña de una cuenta",
  "account.reset_link": "Envió un enlace de recuperación",
  "profile.create": "Creó un anuncio para una cuenta",
  "profile.status_update": "Cambió estados de un anuncio",
  "media.public_approve": "Aprobó un archivo público",
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
  "settings.update": "Modificó la configuración",
  "private.document_view": "Abrió un documento privado",
  "private.document_upload": "Subió o reemplazó un documento privado",
  "private.document_delete": "Eliminó un documento privado",
  "private.report_evidence_view": "Abrió evidencia de un reporte",
  "private.exclusive_media_view": "Abrió contenido exclusivo",
  "private.unpublished_media_view": "Abrió un archivo no público",
} as const;

export const ADMIN_AUDIT_ENTITY_TYPES = {
  admin: "Administrador",
  account: "Cuenta",
  account_deletion: "Eliminación de cuenta",
  profile: "Anuncio",
  public_media: "Archivo público",
  exclusive_media: "Contenido exclusivo",
  review: "Reseña",
  report: "Reporte",
  bug_report: "Reporte de tester",
  news: "Noticia",
  news_media: "Imagen de noticia",
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
    const [identity] = await db.select({ githubLogin: adminGithubIdentities.githubLogin })
      .from(adminGithubIdentities)
      .where(eq(adminGithubIdentities.userId, actor.id))
      .limit(1);
    await db.insert(adminAuditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      actorGithubLogin: identity?.githubLogin ?? null,
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
    return false;
  }
}
