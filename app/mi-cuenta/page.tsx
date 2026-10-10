import { and, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { getCurrentUser, getUserSessionCookieName } from "@/lib/auth";
import { getAccountSessions } from "@/lib/session-management";
import { SessionManager } from "@/app/SessionManager";
import { AccountHeading, AccountShell } from "./_components";
import { AgencyMemberships } from "./AgencyMemberships";
import { profilePublicPath } from "@/lib/profile";
import { formatRegionName } from "@/app/locations";
import { hasUnlimitedEscortListings } from "@/lib/profile-limits";
import { AnalyticsEvent } from "@/app/AnalyticsEvent";
import { getAccountDashboard } from "@/lib/account-dashboard";
import { AccountIdentityCard } from "./AccountIdentityCard";
import { AccountNotificationCards } from "@/app/MessageNotifications";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { approved: "Publicado", draft: "Borrador", expired: "Vencido", paused: "Pausado", pending: "En revisión", rejected: "Requiere cambios" };
const messages: Record<string, string> = {
  welcome: "Tu cuenta está lista. Puedes comenzar un anuncio cuando quieras.",
  email_verified: "Tu correo fue verificado. El acceso a tu cuenta ya no tiene plazo provisional.",
  saved: "El borrador fue guardado.",
  submitted: "Tu anuncio fue enviado a revisión manual.",
  paused: "El anuncio quedó pausado.",
  resumed: "La reactivación fue enviada a revisión.",
  hidden: "El anuncio quedó oculto del sitio público. Sus datos y su estado de moderación se conservaron.",
  shown: "El anuncio volvió a estar visible según su estado de moderación.",
  trashed: "El anuncio fue eliminado de tu panel y enviado a la papelera administrativa. Solo administración puede restaurarlo.",
  trash_confirmation: "Para eliminar un anuncio, escribe ELIMINAR en la confirmación.",
  reactivated: "Tu cuenta fue restablecida correctamente.",
  closed: "La creación de anuncios está cerrada temporalmente.",
  invite_sent: "La invitación fue enviada. La escort debe aceptarla antes de que la asociación sea pública.",
  invite_accepted: "La asociación fue aceptada y ya puede mostrarse públicamente.",
  invite_declined: "La invitación fue rechazada.",
  membership_removed: "La asociación fue retirada.",
  invite_error: "No se pudo procesar la invitación o asociación.",
  error: "No fue posible completar esa acción. Revisa el estado del anuncio.",
  username_saved: "Tu nombre de usuario fue actualizado. El @ de tus anuncios no cambió.",
  username_taken: "Ese usuario ya pertenece a una cuenta o a un anuncio. Elige otro.",
  username_invalid: "Usa entre 3 y 48 caracteres: letras, números o guiones. No puede ser una palabra reservada.",
  username_error: "No pudimos actualizar tu usuario. Inténtalo de nuevo.",
};

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ notice?: string; session_notice?: string; created?: string; estado?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta");
  const db = await getDb();
  const [rows, sessions, params] = await Promise.all([
    db.select({ id: profiles.id, slug: profiles.slug, handle: profiles.handle, displayName: profiles.displayName, type: profiles.type, status: profiles.status, city: profiles.city, region: profiles.region, updatedAt: profiles.updatedAt, ownerHiddenAt: profiles.ownerHiddenAt }).from(profiles)
      .where(and(eq(profiles.ownerId, user.id), isNull(profiles.trashedAt))).orderBy(desc(profiles.updatedAt)),
    getAccountSessions(user.id, getUserSessionCookieName()),
    searchParams,
  ]);
  const ids = rows.map((profile) => profile.id);
  const [activeStoryCounts, dashboard] = await Promise.all([
    ids.length ? db.select({ profileId: profileStatuses.profileId, total: count() }).from(profileStatuses).where(and(inArray(profileStatuses.profileId, ids), gt(profileStatuses.expiresAt, new Date().toISOString()))).groupBy(profileStatuses.profileId) : [],
    getAccountDashboard(rows.length > 0),
  ]);
  const storyCounts = new Map(activeStoryCounts.map((row) => [row.profileId, Number(row.total)]));
  const mediaCounts = new Map(dashboard.pendingMedia.map(row => [row.profileId, row.total]));
  const visible = rows.filter(row => row.status === "approved" && !row.ownerHiddenAt).length;
  const filters = [
    { value: "all", label: "Todos", total: rows.length },
    { value: "approved", label: "Publicados", total: visible },
    { value: "pending", label: "En revisión", total: rows.filter(row => row.status === "pending").length },
    { value: "draft", label: "Borradores", total: rows.filter(row => row.status === "draft").length },
    { value: "rejected", label: "Requieren cambios", total: rows.filter(row => row.status === "rejected").length },
    { value: "hidden", label: "Ocultos por ti", total: rows.filter(row => row.ownerHiddenAt).length },
    { value: "paused", label: "Pausados", total: rows.filter(row => row.status === "paused").length },
    { value: "expired", label: "Vencidos", total: rows.filter(row => row.status === "expired").length },
  ];
  const selected = filters.some(filter => filter.value === params.estado) ? params.estado! : "all";
  const shown = rows.filter(row => selected === "all" || (selected === "hidden" ? Boolean(row.ownerHiddenAt) : selected === "approved" ? row.status === "approved" && !row.ownerHiddenAt : row.status === selected));
  const usernameError = params.notice?.startsWith("username_") && params.notice !== "username_saved";

  return <AccountShell user={user} showActivityNotices={false}><div className="account-content account-dashboard-content">
    {params.created === "1" && <AnalyticsEvent event="sign_up" parameters={{ method: "email" }} dedupeKey="email" />}
    <AccountHeading eyebrow="ÁREA PRIVADA" title="Mi cuenta" description="Tus datos, actividad y anuncios, con los accesos que necesitas a mano." />
    {params.notice && <p className={usernameError ? "form-alert" : "account-success"} role={usernameError ? "alert" : "status"}>{messages[params.notice] ?? messages.error}</p>}
    <AccountIdentityCard user={user} />
    <section className="account-overview" aria-labelledby="account-activity-title">
      <header><h2 id="account-activity-title">Tu actividad</h2><p>Un resumen privado de lo que puedes revisar hoy.</p></header>
      <div className="account-summary-grid"><AccountNotificationCards />
        <Link className="account-summary-card" href="/mi-cuenta/favoritos"><span>Favoritos guardados</span><strong>{dashboard.savedFavorites}</strong><small>Ver tu lista privada →</small></Link>
        <Link className="account-summary-card" href="/mi-cuenta/comentarios"><span>Comentarios enviados</span><strong>{dashboard.sentReviews}</strong><small>Pendientes y publicados →</small></Link>
      </div>
    </section>
    {rows.length > 0 && <section className="account-overview" aria-labelledby="account-performance-title">
      <header><h2 id="account-performance-title">Rendimiento de tus anuncios</h2><p>Suma de tus anuncios actuales. Alcance y contactos: últimos 30 días.</p></header>
      <div className="account-summary-grid">
        <article className="account-summary-card"><span>Visualizaciones</span><strong>{dashboard.views}</strong><small>Un navegador por anuncio y día</small></article>
        <article className="account-summary-card"><span>Interacciones de contacto</span><strong>{dashboard.contacts}</strong><small>Un navegador por canal, anuncio y día</small></article>
        <article className="account-summary-card"><span>Favoritos recibidos</span><strong>{dashboard.receivedFavorites}</strong><small>Total actual en tus anuncios</small></article>
        <article className="account-summary-card"><span>Me gusta recibidos</span><strong>{dashboard.likes}</strong><small>Total actual en tus anuncios</small></article>
      </div><p className="account-metrics-help">Las interacciones no significan mensajes enviados ni clientes confirmados. Abre “Estadísticas” en cada anuncio para consultar su detalle.</p>
      {dashboard.pendingMedia.length > 0 && <p className="account-media-review-note">Material en revisión: {dashboard.pendingMedia.reduce((sum, row) => sum + row.total, 0)}. Tus anuncios publicados siguen disponibles mientras se revisan las fotos o videos nuevos.</p>}
    </section>}
    <section id="mis-anuncios" className="account-listings-section" aria-labelledby="account-listings-title">
    <header className="account-section-heading"><div><h2 id="account-listings-title">Mis anuncios</h2><p>Crea, edita y administra tus publicaciones.</p></div><Link className="button button-primary" href="/mi-cuenta/nuevo-perfil">Crear anuncio</Link></header>
    <p className="account-profile-rule-note">{hasUnlimitedEscortListings(user) ? <>Tu cuenta tiene autorización para crear <strong>anuncios Escort sin límite de cantidad</strong> y varios de Agencia o Arriendo. Cada anuncio mantiene su revisión y validaciones.</> : <>Puedes publicar <strong>un anuncio Escort activo</strong> y varios de Agencia o Arriendo. Un Escort eliminado deja libre el cupo para crear otro.</>} Si eliminas un anuncio, pasa a la papelera del equipo: ya no podrás verlo ni restaurarlo tú.</p>
    {rows.length > 0 && <nav className="account-listing-filters" aria-label="Estado de mis anuncios">{filters.filter(filter => filter.value === "all" || filter.total > 0 || filter.value === selected).map(filter => <Link key={filter.value} href={`/mi-cuenta${filter.value === "all" ? "" : `?estado=${filter.value}`}#mis-anuncios`} aria-current={filter.value === selected ? "page" : undefined}>{filter.label} <b>{filter.total}</b></Link>)}</nav>}
    {rows.length === 0 ? <section className="account-empty"><h2>Aún no tienes anuncios</h2><p>Puedes crear un anuncio de tipo escort, agencia o arriendo. Guarda un borrador o envíalo a revisión; después puedes añadir sus fotos sin esperar la aprobación.</p></section> : shown.length === 0 ? <section className="account-empty"><h3>No hay anuncios en este estado</h3><Link href="/mi-cuenta#mis-anuncios">Ver todos mis anuncios</Link></section> : <div className="owner-profile-list">{shown.map(profile => <article className="owner-profile-card" key={profile.id}>
      <div><div className="owner-profile-statuses"><span className={`account-status account-status-${profile.status}`}>{statusLabel[profile.status]}</span>{profile.ownerHiddenAt && <span className="account-status account-status-rejected">Oculto por ti</span>}{mediaCounts.has(profile.id) && <Link className="account-status account-status-pending" href={`/mi-cuenta/${profile.id}/editar#fotos-y-videos`}>{mediaCounts.get(profile.id)} {mediaCounts.get(profile.id) === 1 ? "medio" : "medios"} en revisión</Link>}</div><h2>{profile.displayName}</h2><p>{profile.handle && <>@{profile.handle} · </>}{({ escort: "Escort", agency: "Agencia", rental: "Arriendo" })[profile.type]} · {profile.city}, {formatRegionName(profile.region)}</p></div>
      <div className="owner-profile-actions">
        {profile.status === "approved" && !profile.ownerHiddenAt && <Link className="button button-public-preview" href={profilePublicPath(profile)} target="_blank">Ver anuncio público</Link>}
        <Link className="button button-outline" href={`/mi-cuenta/${profile.id}/estadisticas`}>Estadísticas</Link>
        <Link className="button button-outline" href={`/mi-cuenta/${profile.id}/editar`}>Editar anuncio</Link>
        <Link className="button button-outline" href={`/mi-cuenta/${profile.id}/editar#fotos-y-videos`}>Fotos y videos</Link>
        {profile.status === "approved" && <Link className="button button-outline" href={`/mi-cuenta/${profile.id}/historias`}>Historias ({storyCounts.get(profile.id) ?? 0})</Link>}
        {(profile.status === "draft" || profile.status === "rejected") && <form action={`/api/perfiles/${profile.id}/enviar-revision`} method="post"><button className="button button-primary" type="submit">Enviar a revisión</button></form>}
        <form action={`/api/perfiles/${profile.id}/visibilidad`} method="post"><input type="hidden" name="return_to" value="/mi-cuenta" /><input type="hidden" name="action" value={profile.ownerHiddenAt ? "show" : "hide"} /><button className="button button-outline" type="submit">{profile.ownerHiddenAt ? "Volver a mostrar" : "Ocultar anuncio"}</button></form>
      </div>
      <details className="profile-trash-control is-destructive"><summary>🗑 Eliminar este anuncio</summary><form action={`/api/perfiles/${profile.id}/papelera`} method="post"><p>Se quitará de tu panel y del sitio público. Solo un administrador podrá restaurarlo; sus datos no se borrarán de inmediato.</p><label>Escribe ELIMINAR<input name="confirmation" required autoComplete="off" /></label><button className="button button-danger" type="submit">Confirmar eliminación</button></form></details>
    </article>)}</div>}
    <p className="account-feature-note">La pausa por período de publicación está preparada para los futuros planes pagados, pero sus controles permanecerán deshabilitados hasta activar la facturación. Ocultar un anuncio sí está disponible y no consume pausas.</p>
    </section>
    <section className="account-telegram-entry" aria-labelledby="account-telegram-entry-title">
      <div><p className="eyebrow">COMUNIDAD CHILE3X</p><h2 id="account-telegram-entry-title">Telegram</h2><p>Entra a la comunidad pública, vincula tu identidad y solicita acceso al espacio privado de Miembros.</p></div>
      <Link className="button button-telegram" href="/mi-cuenta/telegram">Abrir Telegram</Link>
    </section>
    <AgencyMemberships ownerId={user.id} />
    <SessionManager
      sessions={sessions}
      action="/api/mi-cuenta/sesiones"
      currentLogoutAction="/api/auth/session/logout"
      eyebrow="SEGURIDAD DE ACCESO"
      title="Sesiones y dispositivos"
      description="Comprueba dónde está abierta tu cuenta y cierra cualquier dispositivo que no reconozcas."
      notice={params.session_notice === "closed" ? <p className="account-success" role="status">La sesión seleccionada fue cerrada.</p> : undefined}
    />
  </div></AccountShell>;
}
