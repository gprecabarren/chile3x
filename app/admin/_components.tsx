import Link from "next/link";
import type { ReactNode } from "react";
import { count, eq } from "drizzle-orm";
import type { AdminUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { getDb } from "@/db";
import { profileReports, profiles } from "@/db/schema";

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

export async function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  const [pendingCount, pendingReports] = await Promise.all([getPendingProfilesCount(), getPendingReportsCount()]);

  return (
    <main className="admin-root">
      <header className="admin-header">
        <Link className="admin-brand" href="/"><OfficialChile3xLogo priority /><small>ADMIN</small></Link>
        <nav aria-label="Administración">
          <Link href="/admin">Resumen</Link>
          <Link className={pendingCount > 0 ? "admin-nav-alert" : undefined} href="/admin/perfiles">Perfiles{pendingCount > 0 && <b>{pendingCount}</b>}</Link>
          <Link href="/admin/medios">Fotos</Link>
          <Link href="/admin/resenas">Reseñas</Link>
          <Link className={pendingReports > 0 ? "admin-nav-alert" : undefined} href="/admin/reportes">Reportes{pendingReports > 0 && <b>{pendingReports}</b>}</Link>
          <Link href="/admin/cuentas">Cuentas</Link>
          <Link href="/admin/noticias">Noticias</Link>
          <Link href="/admin/configuracion">Configuración</Link>
        </nav>
        <div className="admin-account">
          <span>{user.displayName ?? user.email}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Salir</button>
          </form>
        </div>
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
        {backHref && <Link className="page-back-link" href={backHref}>← Volver</Link>}
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {children}
    </section>
  );
}
