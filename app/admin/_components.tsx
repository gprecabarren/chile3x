import Link from "@/app/NavigationLink";
import type { ReactNode } from "react";
import { and, count, eq, isNull, or } from "drizzle-orm";
import type { AdminUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { getDb } from "@/db";
import { bugReports, exclusiveContentMedia, profileMedia, profileReports, profiles, telegramModerationCases } from "@/db/schema";
import { ADMIN_ACCESS_LABELS, adminHasCapability } from "@/lib/admin-permissions";
import { canViewEmailHistory } from "@/lib/email-history-policy";
import { AdminWorkspace } from "./AdminWorkspace";
import { AdminSidebarLink } from "./AdminSidebarLink";

async function getPendingProfilesCount() {
  try {
    const [pending] = await (await getDb())
      .select({ total: count() })
      .from(profiles)
      .where(and(eq(profiles.status, "pending"), isNull(profiles.trashedAt)));

    return Number(pending?.total ?? 0);
  } catch (error) {
    // The notification is helpful, but a transient D1 issue must never make
    // every administrator page unavailable.
    console.error("Unable to load pending profile count", error);
    return 0;
  }
}

async function getPendingReportsCount() {
  try {
    const [pending] = await (await getDb()).select({ total: count() }).from(profileReports).where(eq(profileReports.status, "pending"));
    return Number(pending?.total ?? 0);
  } catch (error) {
    console.error("Unable to load pending report count", error);
    return 0;
  }
}

async function getNewBugReportsCount() {
  try {
    const [pending] = await (await getDb()).select({ total: count() }).from(bugReports).where(eq(bugReports.status, "new"));
    return Number(pending?.total ?? 0);
  } catch (error) {
    console.error("Unable to load tester bug report count", error);
    return 0;
  }
}

async function getPendingMediaCount() {
  try {
    const db = await getDb();
    const [[publicMedia], [exclusiveMedia]] = await Promise.all([
      db.select({ total: count() }).from(profileMedia).where(and(or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true)), eq(profileMedia.moderationStatus, "pending"))),
      db.select({ total: count() }).from(exclusiveContentMedia).where(eq(exclusiveContentMedia.moderationStatus, "pending")),
    ]);
    return Number(publicMedia?.total ?? 0) + Number(exclusiveMedia?.total ?? 0);
  } catch (error) {
    console.error("Unable to load pending media count", error);
    return 0;
  }
}

async function getOpenTelegramCasesCount() {
  try {
    const [pending] = await (await getDb()).select({ total: count() }).from(telegramModerationCases).where(eq(telegramModerationCases.status, "open"));
    return Number(pending?.total ?? 0);
  } catch (error) {
    console.error("Unable to load Telegram moderation count", error);
    return 0;
  }
}

function AdminNavigation({
  user,
  pendingCount,
  pendingMedia,
  pendingReports,
  pendingBugs,
  pendingTelegram,
}: {
  user: AdminUser;
  pendingCount: number;
  pendingMedia: number;
  pendingReports: number;
  pendingBugs: number;
  pendingTelegram: number;
}) {
  return (
    <nav aria-label="Administración">
      <AdminSidebarLink href="/admin">Resumen</AdminSidebarLink>
      {adminHasCapability(user, "profiles.moderate") && <AdminSidebarLink className={pendingCount > 0 ? "admin-nav-alert" : undefined} href="/admin/anuncios-publicaciones">Anuncios{pendingCount > 0 && <b>{pendingCount}</b>}</AdminSidebarLink>}
      {adminHasCapability(user, "media.moderate") && <AdminSidebarLink className={pendingMedia > 0 ? "admin-nav-alert" : undefined} href="/admin/medios">Medios{pendingMedia > 0 && <b>{pendingMedia}</b>}</AdminSidebarLink>}
      {adminHasCapability(user, "reviews.moderate") && <AdminSidebarLink href="/admin/resenas">Reseñas</AdminSidebarLink>}
      {adminHasCapability(user, "reports.manage") && <AdminSidebarLink className={pendingReports > 0 ? "admin-nav-alert" : undefined} href="/admin/reportes">Reportes{pendingReports > 0 && <b>{pendingReports}</b>}</AdminSidebarLink>}
      {adminHasCapability(user, "bugs.manage") && <AdminSidebarLink className={pendingBugs > 0 ? "admin-nav-alert" : undefined} href="/admin/bugs">Testers{pendingBugs > 0 && <b>{pendingBugs}</b>}</AdminSidebarLink>}
      {adminHasCapability(user, "accounts.manage") && <AdminSidebarLink href="/admin/cuentas">Cuentas</AdminSidebarLink>}
      {adminHasCapability(user, "news.manage") && <AdminSidebarLink href="/admin/noticias">Noticias</AdminSidebarLink>}
      {adminHasCapability(user, "settings.manage") && <AdminSidebarLink href="/admin/patrocinadores">Sitios asociados</AdminSidebarLink>}
      {adminHasCapability(user, "telegram.view") && <AdminSidebarLink className={pendingTelegram > 0 ? "admin-nav-alert" : undefined} href="/admin/telegram">Telegram{pendingTelegram > 0 && <b>{pendingTelegram}</b>}</AdminSidebarLink>}
      {adminHasCapability(user, "audit.view") && <AdminSidebarLink href="/admin/actividad">Actividad</AdminSidebarLink>}
      {canViewEmailHistory(user) && <AdminSidebarLink href="/admin/correos">Historial correos</AdminSidebarLink>}
      {adminHasCapability(user, "settings.manage") && <AdminSidebarLink href="/admin/configuracion">Configuración</AdminSidebarLink>}
      {adminHasCapability(user, "forum.manage") && <AdminSidebarLink href="/foro">Foro <small>beta privada</small></AdminSidebarLink>}
      {adminHasCapability(user, "admins.manage") && <AdminSidebarLink href="/admin/administradores">Administradores</AdminSidebarLink>}
      <AdminSidebarLink href="/admin/ayuda">Ayuda <small>beta</small></AdminSidebarLink>
    </nav>
  );
}

export async function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  const [pendingCount, pendingMedia, pendingReports, pendingBugs, pendingTelegram] = await Promise.all([
    adminHasCapability(user, "profiles.moderate") ? getPendingProfilesCount() : 0,
    adminHasCapability(user, "media.moderate") ? getPendingMediaCount() : 0,
    adminHasCapability(user, "reports.manage") ? getPendingReportsCount() : 0,
    adminHasCapability(user, "bugs.manage") ? getNewBugReportsCount() : 0,
    adminHasCapability(user, "telegram.view") ? getOpenTelegramCasesCount() : 0,
  ]);
  const brand=<div className="admin-sidebar-brand"><Link href="/" aria-label="Ver sitio público Chile3X"><OfficialChile3xLogo priority /></Link><Link className="admin-home-link" href="/admin" aria-label="Ir al resumen de administración">ADMINISTRADOR</Link></div>;
  const identity=<><div className="admin-sidebar-identity"><span className="admin-sidebar-avatar" aria-hidden="true">{user.githubLogin.slice(0,1).toUpperCase()}</span><div><strong title={`@${user.githubLogin}`}>@{user.githubLogin}</strong><small>{ADMIN_ACCESS_LABELS[user.accessLevel]} · Sesión administrativa</small></div></div><form action="/api/auth/logout" method="post"><button type="submit" title="Cerrar la sesión administrativa">Cerrar sesión administrador</button></form></>;
  return <AdminWorkspace brand={brand} identity={identity} navigation={<AdminNavigation user={user} pendingCount={pendingCount} pendingMedia={pendingMedia} pendingReports={pendingReports} pendingBugs={pendingBugs} pendingTelegram={pendingTelegram} />}>{children}</AdminWorkspace>;
}

export function AdminPageHeading({ eyebrow, title, description, children, backHref }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  backHref?: string;
}) {
  return (
    <section className="admin-heading">
      <div>
        {backHref && <Link className="page-back-link" href={backHref} prefetch={false}>← Volver</Link>}
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {children}
    </section>
  );
}
