import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";

export function AccountShell({ user, children }: { user: AccountUser; children: ReactNode }) {
  return (
    <main className="account-root">
      <header className="account-header">
        <Link href="/" className="account-brand"><OfficialChile3xLogo priority /><small>MI CUENTA</small></Link>
        <nav aria-label="Navegación de cuenta">
          <Link href="/mi-cuenta">Mis anuncios</Link>
          <Link href="/mi-cuenta/contenido">Mi contenido</Link>
          <Link href="/mi-cuenta/datos-personales">Mis datos</Link>
          <Link href="/mi-cuenta/favoritos">Favoritos</Link>
          <Link href="/mi-cuenta/comentarios">Comentarios</Link>
          <Link href="/mi-cuenta/reportes">Mis reportes</Link>
          {user.role === "tester" && <Link href="/mi-cuenta/pruebas">Mis pruebas</Link>}
          <Link href="/mi-cuenta/bloqueados">Anuncios ocultos</Link>
          <Link href="/mi-cuenta/nuevo-perfil">Crear anuncio</Link>
          <details className="account-legal-links">
            <summary>Información</summary>
            <div>
              <Link href="/terminos">Términos</Link>
              <Link href="/privacidad">Privacidad</Link>
              <Link href="/reglas-de-publicacion">Reglas de publicación</Link>
            </div>
          </details>
        </nav>
        <div className="account-user">
          <span>{user.displayName ?? "Cuenta Chile3X"}{user.username ? ` · @${user.username}` : ""}</span>
          <form action="/api/auth/session/logout" method="post"><button type="submit">Salir</button></form>
        </div>
      </header>
      {children}
    </main>
  );
}

export function AccountHeading({ eyebrow, title, description, children, backHref }: { eyebrow: string; title: string; description: string; children?: ReactNode; backHref?: string }) {
  return (
    <section className="account-heading">
      <div>{backHref && <Link className="page-back-link" href={backHref}>← Volver</Link>}<p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
      {children}
    </section>
  );
}
