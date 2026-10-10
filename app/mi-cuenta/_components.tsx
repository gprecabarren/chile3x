import Link from "@/app/NavigationLink";
import type { ReactNode } from "react";
import type { AccountUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { AccountMobileNavigation } from "./AccountMobileNavigation";
import { PresenceHeartbeat } from "@/app/PresenceHeartbeat";
import { countUnreadMessages } from "@/lib/internal-messages";
import { countPendingReceivedReviews } from "@/lib/profile-interactions";
import { emailVerificationDeadline, emailVerificationState } from "@/lib/email-verification-policy";
import { EmailVerificationNotice } from "@/app/EmailVerificationNotice";
import { MessageNotifications, PendingReviewsNotice, UnreadMessagesBadge, UnreadMessagesNotice } from "@/app/MessageNotifications";

function AccountNavigation({ user }: { user: AccountUser }) {
  return <nav aria-label="Navegación de cuenta">
    <Link href="/mi-cuenta">Mis anuncios</Link>
    <Link className="account-messages-link" href="/mi-cuenta/mensajes">Mensajes<UnreadMessagesBadge /></Link>
    <Link href="/mi-cuenta/contenido">Mi contenido</Link>
    <Link href="/mi-cuenta/datos-personales">Mis datos</Link>
    <Link href="/mi-cuenta/favoritos">Favoritos</Link>
    <Link className="account-messages-link" href="/mi-cuenta/comentarios">Comentarios<UnreadMessagesBadge reviews /></Link>
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
  const [unreadMessages, pendingReviews] = await Promise.all([countUnreadMessages(user.id), countPendingReceivedReviews(user.id)]);
  return (
    <MessageNotifications initialUnread={unreadMessages} initialPendingReviews={pendingReviews}><main className="account-root">
      <header className="account-header">
        <Link href="/" className="account-brand"><OfficialChile3xLogo priority /><small>MI CUENTA</small></Link>
        <div className="account-desktop-navigation"><AccountNavigation user={user} /></div>
        <div className="account-user">
          <span>{user.username ? `@${user.username}` : user.displayName ?? "Cuenta Chile3X"}</span>
          <form action="/api/auth/session/logout" method="post"><button type="submit" title="Cerrar la sesión de esta cuenta">Cerrar sesión</button></form>
        </div>
      <AccountMobileNavigation><AccountNavigation user={user} /></AccountMobileNavigation>
      </header>
      <PresenceHeartbeat />
      {emailVerificationState(user) === "grace" && <EmailVerificationNotice deadline={emailVerificationDeadline(user)} />}
      <UnreadMessagesNotice />
      <PendingReviewsNotice />
      {children}
    </main></MessageNotifications>
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
