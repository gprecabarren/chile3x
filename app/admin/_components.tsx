import Link from "next/link";
import type { ReactNode } from "react";
import { and, count, eq, or } from "drizzle-orm";
import type { AdminUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { getDb } from "@/db";
import { bugReports, exclusiveContentMedia, profileMedia, profileReports, profiles } from "@/db/schema";
import { ADMIN_ACCESS_LABELS, adminHasCapability } from "@/lib/admin-permissions";
import { AdminMobileNavigation } from "./AdminMobileNavigation";

async function getPendingProfilesCount() {
  try {
    const [pending] = await (await getDb())
      .select({ total: count() })
      .from(profiles)
      .where(eq(profiles.status, "pending"));

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

function AdminNavigation({
  user,
  pendingCount,
  pendingMedia,
  pendingReports,
  pendingBugs,
}: {
  user: AdminUser;
  pendingCount: number;
  pendingMedia: number;
  pendingReports: number;
  pendingBugs: number;
}) {
  return (
    <nav aria-label="Administración">
      <Link href="/admin" prefetch={false}>Resumen</Link>
      {adminHasCapability(user, "profiles.moderate") && <Link prefetch={false} className={pendingCount > 0 ? "admin-nav-alert" : undefined} href="/admin/perfiles">Anuncios{pendingCount > 0 && <b>{pendingCount}</b>}</Link>}
      {adminHasCapability(user, "media.moderate") && <Link prefetch={false} className={pendingMedia > 0 ? "admin-nav-alert" : undefined} href="/admin/medios">Medios{pendingMedia > 0 && <b>{pendingMedia}</b>}</Link>}
      {adminHasCapability(user, "reviews.moderate") && <Link href="/admin/resenas" prefetch={false}>Reseñas</Link>}
      {adminHasCapability(user, "reports.manage") && <Link prefetch={false} className={pendingReports > 0 ? "admin-nav-alert" : undefined} href="/admin/reportes">Reportes{pendingReports > 0 && <b>{pendingReports}</b>}</Link>}
      {adminHasCapability(user, "bugs.manage") && <Link prefetch={false} className={pendingBugs > 0 ? "admin-nav-alert" : undefined} href="/admin/bugs">Testers{pendingBugs > 0 && <b>{pendingBugs}</b>}</Link>}
      {adminHasCapability(user, "accounts.manage") && <Link href="/admin/cuentas" prefetch={false}>Cuentas</Link>}
      {adminHasCapability(user, "news.manage") && <Link href="/admin/noticias" prefetch={false}>Noticias</Link>}
      {adminHasCapability(user, "audit.view") && <Link href="/admin/actividad" prefetch={false}>Actividad</Link>}
      {adminHasCapability(user, "settings.manage") && <Link href="/admin/configuracion" prefetch={false}>Configuración</Link>}
      {adminHasCapability(user, "admins.manage") && <Link href="/admin/administradores" prefetch={false}>Administradores</Link>}
    </nav>
  );
}

export async function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  const [pendingCount, pendingMedia, pendingReports, pendingBugs] = await Promise.all([
    adminHasCapability(user, "profiles.moderate") ? getPendingProfilesCount() : 0,
    adminHasCapability(user, "media.moderate") ? getPendingMediaCount() : 0,
    adminHasCapability(user, "reports.manage") ? getPendingReportsCount() : 0,
    adminHasCapability(user, "bugs.manage") ? getNewBugReportsCount() : 0,
  ]);
  return (
    <main className="admin-root">
      <header className="admin-header">
        <Link className="admin-brand" href="/"><OfficialChile3xLogo priority /><small>ADMIN</small></Link>
        <AdminNavigation user={user} pendingCount={pendingCount} pendingMedia={pendingMedia} pendingReports={pendingReports} pendingBugs={pendingBugs} />
        <div className="admin-account">
          <span><strong>@{user.githubLogin} · {ADMIN_ACCESS_LABELS[user.accessLevel]}</strong></span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" title="Cerrar la sesión administrativa">Cerrar sesión administrador</button>
          </form>
        </div>
        <AdminMobileNavigation>
          <AdminNavigation user={user} pendingCount={pendingCount} pendingMedia={pendingMedia} pendingReports={pendingReports} pendingBugs={pendingBugs} />
        </AdminMobileNavigation>
      </header>
      {children}
    </main>
  );
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
