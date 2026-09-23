import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { AccountMobileNavigation } from "./AccountMobileNavigation";
import { PresenceHeartbeat } from "@/app/PresenceHeartbeat";
import { countUnreadMessages } from "@/lib/internal-messages";

function AccountNavigation({ user, unreadMessages }: { user: AccountUser; unreadMessages: number }) {
  return <nav aria-label="Navegación de cuenta">
    <Link href="/mi-cuenta">Mis anuncios</Link>
    <Link className="account-messages-link" href="/mi-cuenta/mensajes">Mensajes{unreadMessages > 0 && <b aria-label={`${unreadMessages} mensajes sin leer`}>{unreadMessages > 99 ? "99+" : unreadMessages}</b>}</Link>
    <Link href="/mi-cuenta/contenido">Mi contenido</Link>
    <Link href="/mi-cuenta/datos-personales">Mis datos</Link>
    <Link href="/mi-cuenta/favoritos">Favoritos</Link>
    <Link href="/mi-cuenta/comentarios">Comentarios</Link>
    <Link href="/mi-cuenta/reportes">Mis reportes</Link>
    <Link href="/mi-cuenta/telegram">Telegram y Miembros</Link>
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
  </nav>;
}

export async function AccountShell({ user, children }: { user: AccountUser; children: ReactNode }) {
  const unreadMessages = await countUnreadMessages(user.id);
  return (
    <main className="account-root">
      <header className="account-header">
        <Link href="/" className="account-brand"><OfficialChile3xLogo priority /><small>MI CUENTA</small></Link>
        <div className="account-desktop-navigation"><AccountNavigation user={user} unreadMessages={unreadMessages} /></div>
        <div className="account-user">
          <span>{user.displayName ?? "Cuenta Chile3X"}{user.username ? ` · @${user.username}` : ""}</span>
          <form action="/api/auth/session/logout" method="post"><button type="submit" title="Cerrar la sesión de esta cuenta">Cerrar sesión</button></form>
        </div>
      <AccountMobileNavigation><AccountNavigation user={user} unreadMessages={unreadMessages} /></AccountMobileNavigation>
      </header>
      <PresenceHeartbeat />
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
