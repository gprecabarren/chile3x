import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminUser } from "@/lib/auth";

export function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
  return (
    <main className="admin-root">
      <header className="admin-header">
        <Link className="admin-brand" href="/admin">CHILE<span>3X</span><small>ADMIN</small></Link>
        <nav aria-label="Administración">
          <Link href="/admin">Resumen</Link>
          <Link href="/admin/perfiles">Perfiles</Link>
          <Link href="/admin/medios">Fotos</Link>
          <Link href="/admin/cuentas">Cuentas</Link>
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

export function AdminPageHeading({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="admin-heading">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {children}
    </section>
  );
}
