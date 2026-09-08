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
  | "audit.view"
  | "private.view";

export const ADMIN_ACCESS_LABELS: Record<AdminAccessLevel, string> = {
  owner: "Propietario",
  administrator: "Administrador",
  moderator: "Moderación",
  editor: "Noticias",
  support: "Soporte",
};

export const ADMIN_ACCESS_DESCRIPTIONS: Record<AdminAccessLevel, string> = {
  owner: "Acceso total, incluida la gestión de otros administradores.",
  administrator: "Gestiona el sitio completo, excepto los accesos administrativos.",
  moderator: "Modera anuncios, medios, reseñas y reportes; puede consultar el historial.",
  editor: "Crea, edita y publica noticias del sitio.",
  support: "Atiende reportes de usuarios y errores enviados por testers.",
};

const CAPABILITIES: Record<AdminAccessLevel, readonly AdminCapability[]> = {
  owner: [
    "admins.manage", "settings.manage", "accounts.manage", "profiles.moderate",
    "media.moderate", "reviews.moderate", "reports.manage", "bugs.manage",
    "news.manage", "audit.view", "private.view",
  ],
  administrator: [
    "settings.manage", "accounts.manage", "profiles.moderate", "media.moderate",
    "reviews.moderate", "reports.manage", "bugs.manage", "news.manage",
    "audit.view", "private.view",
  ],
  moderator: [
    "profiles.moderate", "media.moderate", "reviews.moderate", "reports.manage",
    "audit.view", "private.view",
  ],
  editor: ["news.manage"],
  support: ["reports.manage", "bugs.manage"],
};

export function isAdminAccessLevel(value: unknown): value is AdminAccessLevel {
  return typeof value === "string" && ADMIN_ACCESS_LEVELS.includes(value as AdminAccessLevel);
}

export function adminHasCapability(
  admin: { accessLevel: AdminAccessLevel; isProtectedOwner?: boolean } | null | undefined,
  capability: AdminCapability,
) {
  if (capability === "admins.manage") return Boolean(admin?.accessLevel === "owner" && admin.isProtectedOwner);
  return Boolean(admin && CAPABILITIES[admin.accessLevel].includes(capability));
}
