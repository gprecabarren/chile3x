import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountUser } from "@/lib/auth";

export function AccountShell({ user, children }: { user: AccountUser; children: ReactNode }) {
  return (
    <main className="account-root">
      <header className="account-header">
        <Link href="/" className="account-brand">CHILE<span>3X</span><small>MI CUENTA</small></Link>
        <nav aria-label="Navegación de cuenta">
          <Link href="/mi-cuenta">Mis perfiles</Link>
          <Link href="/mi-cuenta/nuevo-perfil">Crear perfil</Link>
        </nav>
        <div className="account-user">
          <span>{user.displayName ?? user.email}</span>
          <form action="/api/auth/session/logout" method="post"><button type="submit">Salir</button></form>
        </div>
      </header>
      {children}
    </main>
  );
}

export function AccountHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="account-heading">
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
      {children}
    </section>
  );
}
