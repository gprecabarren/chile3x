import Link from "@/app/NavigationLink";
import type { ReactNode } from "react";
import type { AccountUser } from "@/lib/auth";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { AccountMobileNavigation } from "./AccountMobileNavigation";
import { AccountNavigationLink } from "./AccountNavigationLink";
import { PresenceHeartbeat } from "@/app/PresenceHeartbeat";
import { countUnreadMessages } from "@/lib/internal-messages";
import { countPendingReceivedReviews } from "@/lib/profile-interactions";
import { emailVerificationDeadline, emailVerificationState } from "@/lib/email-verification-policy";
import { EmailVerificationNotice } from "@/app/EmailVerificationNotice";
import { MessageNotifications, PendingReviewsNotice, UnreadMessagesBadge, UnreadMessagesNotice } from "@/app/MessageNotifications";

function AccountNavigation({ user }: { user: AccountUser }) {
  return <nav aria-label="Navegación de cuenta">
    <AccountNavigationLink href="/mi-cuenta#mis-anuncios">Mis anuncios</AccountNavigationLink>
    <AccountNavigationLink className="account-messages-link" href="/mi-cuenta/mensajes">Mensajes<UnreadMessagesBadge /></AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/contenido">Mi contenido</AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/datos-personales">Mis datos</AccountNavigationLink>
    <AccountNavigationLink grouped className="account-messages-link" href="/mi-cuenta/favoritos">Favoritos y comentarios<UnreadMessagesBadge reviews /></AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/reportes">Mis reportes</AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/telegram">Telegram</AccountNavigationLink>
    {user.role === "tester" && <AccountNavigationLink href="/mi-cuenta/pruebas">Mis pruebas</AccountNavigationLink>}
    <AccountNavigationLink href="/mi-cuenta/bloqueados">Anuncios ocultos</AccountNavigationLink>
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

export async function AccountShell({ user, children, showActivityNotices = true }: { user: AccountUser; children: ReactNode; showActivityNotices?: boolean }) {
  const [unreadMessages, pendingReviews] = await Promise.all([countUnreadMessages(user.id), countPendingReceivedReviews(user.id)]);
  return (
    <MessageNotifications initialUnread={unreadMessages} initialPendingReviews={pendingReviews}><main className="account-root">
      <header className="account-header">
        <Link href="/" className="account-brand"><OfficialChile3xLogo priority /><small>MI CUENTA</small></Link>
        <div className="account-desktop-navigation"><AccountNavigation user={user} /></div>
        <div className="account-user">
          <Link className="account-home-link" href="/mi-cuenta" title={user.email} aria-label={`Ir a mi cuenta: ${user.email}`}>{user.role === "admin" ? user.displayName ?? "Administración" : user.email}</Link>
          <form action="/api/auth/session/logout" method="post"><button type="submit" title="Cerrar la sesión de esta cuenta">Cerrar sesión</button></form>
        </div>
      <AccountMobileNavigation><AccountNavigation user={user} /></AccountMobileNavigation>
      </header>
      <PresenceHeartbeat />
      {emailVerificationState(user) === "grace" && <EmailVerificationNotice deadline={emailVerificationDeadline(user)} />}
      {showActivityNotices && <UnreadMessagesNotice />}
      {showActivityNotices && <PendingReviewsNotice />}
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
