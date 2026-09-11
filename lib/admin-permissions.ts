export const ADMIN_ACCESS_LEVELS = ["owner", "administrator", "moderator", "editor", "support"] as const;

export type AdminAccessLevel = typeof ADMIN_ACCESS_LEVELS[number];

export type AdminCapability =
  | "admins.manage"
  | "settings.manage"
  | "accounts.manage"
  | "profiles.moderate"
  | "media.moderate"
  | "reviews.moderate"
  | "reports.manage"
  | "bugs.manage"
  | "news.manage"
  | "telegram.view"
  | "telegram.publish"
  | "telegram.moderate"
  | "telegram.manage"
  | "audit.view"
  | "private.view";

export const ADMIN_CAPABILITY_LABELS: Record<AdminCapability, string> = {
  "admins.manage": "Agregar, cambiar y revocar administradores",
  "settings.manage": "Cambiar la configuración general, SEO y contactos",
  "accounts.manage": "Administrar cuentas de anunciantes y testers",
  "profiles.moderate": "Revisar y cambiar el estado de anuncios",
  "media.moderate": "Aprobar o rechazar fotos, videos y contenido exclusivo",
  "reviews.moderate": "Moderar reseñas públicas",
  "reports.manage": "Atender reportes sobre anuncios",
  "bugs.manage": "Atender reportes enviados por testers",
  "news.manage": "Crear, editar y publicar noticias",
  "telegram.view": "Consultar el estado de la comunidad de Telegram",
  "telegram.publish": "Publicar y editar novedades sincronizadas con Telegram",
  "telegram.moderate": "Revisar alertas y moderar participantes de Telegram",
  "telegram.manage": "Configurar el bot, chats, normas y automatizaciones de Telegram",
  "audit.view": "Consultar el historial de actividad administrativa",
  "private.view": "Consultar documentos y datos privados necesarios para su función",
};

export const ADMIN_ACCESS_LABELS: Record<AdminAccessLevel, string> = {
  owner: "Propietario",
  administrator: "Administrador",
  moderator: "Moderación",
  editor: "Noticias y novedades",
  support: "Soporte",
};

export const ADMIN_ACCESS_DESCRIPTIONS: Record<AdminAccessLevel, string> = {
  owner: "Acceso total, incluida la gestión de otros administradores.",
  administrator: "Gestiona el sitio completo, excepto los accesos administrativos.",
  moderator: "Modera anuncios, medios, reseñas y reportes; puede consultar el historial.",
  editor: "Crea, edita y publica noticias y novedades sincronizadas del sitio.",
  support: "Atiende reportes de usuarios y errores enviados por testers.",
};

export const ADMIN_ACCESS_CAPABILITIES: Record<AdminAccessLevel, readonly AdminCapability[]> = {
  owner: [
    "admins.manage", "settings.manage", "accounts.manage", "profiles.moderate",
    "media.moderate", "reviews.moderate", "reports.manage", "bugs.manage",
    "news.manage", "telegram.view", "telegram.publish", "telegram.moderate", "telegram.manage", "audit.view", "private.view",
  ],
  administrator: [
    "settings.manage", "accounts.manage", "profiles.moderate", "media.moderate",
    "reviews.moderate", "reports.manage", "bugs.manage", "news.manage",
    "telegram.view", "telegram.publish", "telegram.moderate", "telegram.manage",
    "audit.view", "private.view",
  ],
  moderator: [
    "profiles.moderate", "media.moderate", "reviews.moderate", "reports.manage",
    "telegram.view", "telegram.moderate", "audit.view", "private.view",
  ],
  editor: ["news.manage", "telegram.view", "telegram.publish"],
  support: ["reports.manage", "bugs.manage", "telegram.view"],
};

export function isAdminAccessLevel(value: unknown): value is AdminAccessLevel {
  return typeof value === "string" && ADMIN_ACCESS_LEVELS.includes(value as AdminAccessLevel);
}

export function adminHasCapability(
  admin: { accessLevel: AdminAccessLevel; isProtectedOwner?: boolean } | null | undefined,
  capability: AdminCapability,
) {
  if (capability === "admins.manage") return Boolean(admin?.accessLevel === "owner" && admin.isProtectedOwner);
  return Boolean(admin && ADMIN_ACCESS_CAPABILITIES[admin.accessLevel].includes(capability));
}
