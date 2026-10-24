import { ActionButton } from "@/app/ActionButton";
import Link from "@/app/NavigationLink";
import type { ReactNode } from "react";
import type { AccountUser } from "@/lib/auth";
import { AccountWorkspace } from "./AccountWorkspace";
import { AccountNavigationLink } from "./AccountNavigationLink";
import { PresenceHeartbeat } from "@/app/PresenceHeartbeat";
import { countUnreadMessages } from "@/lib/internal-messages";
import { countPendingReceivedReviews } from "@/lib/profile-interactions";
import { emailVerificationDeadline, emailVerificationState } from "@/lib/email-verification-policy";
import { EmailVerificationNotice } from "@/app/EmailVerificationNotice";
import { getSiteSettings } from "@/lib/site-settings";
import { MessageNotifications, PendingReviewsNotice, UnreadMessagesBadge, UnreadMessagesNotice } from "@/app/MessageNotifications";
import { PortalWhatsappScope } from "@/app/directorio/_components";

function AccountNavigation({ user, helpEnabled }: { user: AccountUser; helpEnabled: boolean }) {
  return <nav aria-label="Navegación de cuenta">
    <AccountNavigationLink className="account-navigation-home" href="/mi-cuenta">Mi cuenta</AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta#mis-anuncios">Mis anuncios</AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/historias">Historias</AccountNavigationLink>
    <AccountNavigationLink className="account-messages-link" href="/mi-cuenta/mensajes">Mensajes<UnreadMessagesBadge /></AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/contenido">Mi contenido</AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/datos-personales">Mis datos</AccountNavigationLink>
    <AccountNavigationLink grouped className="account-messages-link" href="/mi-cuenta/favoritos">Favoritos y comentarios<UnreadMessagesBadge reviews /></AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/reportes">Mis reportes</AccountNavigationLink>
    <AccountNavigationLink href="/mi-cuenta/telegram">Telegram</AccountNavigationLink>
    {user.role === "tester" && <AccountNavigationLink href="/mi-cuenta/pruebas">Mis pruebas</AccountNavigationLink>}
    <AccountNavigationLink href="/mi-cuenta/bloqueados">Anuncios ocultos</AccountNavigationLink>
    {helpEnabled && <AccountNavigationLink href="/mi-cuenta/ayuda">Ayuda <small>beta</small></AccountNavigationLink>}
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
  const [unreadMessages, pendingReviews, settings] = await Promise.all([countUnreadMessages(user.id), countPendingReceivedReviews(user.id), getSiteSettings()]);
  const helpEnabled = settings.account_help_enabled === "enabled";
  const brand = <div className="account-sidebar-brand"><Link href="/" className="sidebar-return-site"><span aria-hidden="true">←</span><span>Volver al sitio web</span></Link></div>;
  const toolbarBrand = <Link className="account-brand-home" href="/mi-cuenta">MI CUENTA</Link>;
  const identity = <><div className="account-sidebar-identity"><Link className="account-home-link" href="/mi-cuenta" title={user.email} aria-label={`Ir a mi cuenta: ${user.email}`}><strong>{user.displayName || "Mi cuenta"}</strong><small>{user.email}</small></Link></div><form action="/api/auth/session/logout" method="post"><ActionButton type="submit" title="Cerrar la sesión de esta cuenta">Cerrar sesión</ActionButton></form></>;
  return (
    <PortalWhatsappScope showFloating={false}><MessageNotifications initialUnread={unreadMessages} initialPendingReviews={pendingReviews}><AccountWorkspace brand={brand} toolbarBrand={toolbarBrand} navigation={<AccountNavigation user={user} helpEnabled={helpEnabled} />} identity={identity}>
      <PresenceHeartbeat />
      {emailVerificationState(user) === "grace" && <EmailVerificationNotice deadline={emailVerificationDeadline(user)} />}
      {showActivityNotices && <UnreadMessagesNotice />}
      {showActivityNotices && <PendingReviewsNotice />}
      {children}
    </AccountWorkspace></MessageNotifications></PortalWhatsappScope>
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
