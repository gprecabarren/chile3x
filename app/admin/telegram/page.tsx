import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  telegramAdminIdentities,
  telegramAuditEvents,
  telegramBulletins,
  telegramChats,
  telegramMemberships,
  telegramModerationCases,
  telegramOutboxJobs,
} from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getTelegramConfiguration, telegramIdentityLabel } from "@/lib/telegram";
import { latestTelegramLinkAttempt } from "@/lib/telegram-linking";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  settings_saved: "Configuración de Telegram guardada.",
  chat_saved: "Asignación del chat guardada.",
  webhook_ready: "Webhook y comandos instalados correctamente.",
  webhook_error: "Telegram rechazó la instalación. Revisa el token, los permisos y el estado del bot.",
  secrets_missing: "Faltan los secretos TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET en Cloudflare.",
  not_configured: "Primero configura el usuario del bot.",
  admin_linked: "Tu identidad administrativa de Telegram quedó vinculada.",
  confirmation_error: "No se pudo confirmar la identidad de Telegram.",
  bulletin_published: "Novedad publicada en el sitio y enviada a la cola de Telegram.",
  bulletin_drafted: "Novedad guardada como borrador.",
  bulletin_updated: "Novedad actualizada.",
  bulletin_archived: "Novedad archivada; el bot intentará retirar su mensaje sincronizado.",
  moderation_updated: "Medida de moderación actualizada.",
};

function date(value: string | null) {
  if (!value) return "Sin fecha";
  const instant = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(instant));
}

function chatRoleLabel(role: string) {
  if (role === "public") return "Comunidad pública";
  if (role === "members") return "Miembros privado";
  if (role === "alerts") return "Alertas administrativas";
  return "Sin asignar";
}

export default async function AdminTelegramPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/telegram");
  if (!adminHasCapability(admin, "telegram.view")) redirect("/admin/acceso-denegado?reason=permission");
  const db = await getDb();
  const canManage = adminHasCapability(admin, "telegram.manage");
  const canPublish = adminHasCapability(admin, "telegram.publish");
  const canModerate = adminHasCapability(admin, "telegram.moderate");
  const [query, configuration, identityRows, attempt, chats, bulletins, cases, audits, [members], [pendingJobs]] = await Promise.all([
    searchParams,
    getTelegramConfiguration(),
    db.select().from(telegramAdminIdentities).where(eq(telegramAdminIdentities.userId, admin.id)).limit(1),
    latestTelegramLinkAttempt(admin.id, "admin"),
    db.select().from(telegramChats).orderBy(desc(telegramChats.lastSeenAt)).limit(20),
    db.select().from(telegramBulletins).orderBy(desc(telegramBulletins.updatedAt)).limit(20),
    db.select().from(telegramModerationCases).orderBy(desc(telegramModerationCases.createdAt)).limit(30),
    db.select().from(telegramAuditEvents).orderBy(desc(telegramAuditEvents.createdAt)).limit(20),
    db.select({ total: count() }).from(telegramMemberships).where(eq(telegramMemberships.status, "active")),
    db.select({ total: count() }).from(telegramOutboxJobs).where(eq(telegramOutboxJobs.status, "pending")),
  ]);
  const identity = identityRows[0] ?? null;
  const candidateReady = attempt?.status === "candidate";
  let secretStatus = { bot: false, webhook: false };
  try {
    const { env } = await import("cloudflare:workers");
    secretStatus = { bot: Boolean(env.TELEGRAM_BOT_TOKEN), webhook: Boolean(env.TELEGRAM_WEBHOOK_SECRET) };
  } catch {
    // The static render used by local checks has no Worker environment.
  }
  const publicChat = chats.find((chat) => chat.role === "public");
  const membersChat = chats.find((chat) => chat.role === "members");
  const alertChat = chats.find((chat) => chat.role === "alerts");
  const openCases = cases.filter((item) => item.status === "open").length;

  return <AdminShell user={admin}><div className="admin-content telegram-admin-page">
    <AdminPageHeading eyebrow="TELEGRAM" title="Comunidad, Novedades y moderación" description="Administra el bot, la comunidad pública, el espacio privado de Miembros y la sincronización del sitio desde un solo lugar.">
      {configuration.publicCommunityUrl && <a className="button button-outline" href={configuration.publicCommunityUrl} target="_blank" rel="noreferrer">Abrir comunidad</a>}
    </AdminPageHeading>
    {query.notice && notices[query.notice] && <p className={query.notice.includes("error") || query.notice.includes("missing") ? "admin-error" : "admin-success"} role="status">{notices[query.notice]}</p>}

    <section className="telegram-admin-metrics" aria-label="Estado de Telegram">
      <article><span>Bot y webhook</span><strong>{secretStatus.bot && secretStatus.webhook && configuration.botUsername ? "Listos" : "Pendientes"}</strong><small>{configuration.botUsername ? `@${configuration.botUsername}` : "Sin bot identificado"}</small></article>
      <article><span>Comunidad pública</span><strong>{publicChat ? "Asignada" : "Pendiente"}</strong><small>{publicChat?.title ?? "El bot debe descubrir el chat"}</small></article>
      <article><span>Miembros activos</span><strong>{Number(members?.total ?? 0)}</strong><small>{membersChat?.title ?? "Espacio privado sin asignar"}</small></article>
      <article className={openCases ? "has-warning" : undefined}><span>Casos abiertos</span><strong>{openCases}</strong><small>{alertChat ? "Alertas conectadas" : "Sin chat de alertas"}</small></article>
      <article><span>Acciones pendientes</span><strong>{Number(pendingJobs?.total ?? 0)}</strong><small>La cola y el cron reintentan errores transitorios.</small></article>
    </section>

    <section className="telegram-admin-section">
      <header><div><p className="eyebrow">IDENTIDAD ADMINISTRATIVA</p><h2>Tu acceso desde Telegram</h2><p>El vínculo administrativo está separado de las cuentas públicas y solo funciona junto a un acceso GitHub activo.</p></div><span className={`telegram-status is-${identity?.isActive ? "linked" : "unlinked"}`}>{identity?.isActive ? "Vinculada" : "Sin vincular"}</span></header>
      {identity?.isActive ? <p className="telegram-admin-identity">{telegramIdentityLabel(identity.firstName, identity.username, identity.telegramUserId)}</p> : <form action="/api/admin/telegram/vincular" method="post"><button className="button button-primary" type="submit">Vincular mi Telegram administrativo</button></form>}
      {candidateReady && <div className="telegram-confirm-card"><strong>{telegramIdentityLabel(attempt.candidateFirstName, attempt.candidateUsername, attempt.candidateTelegramUserId)}</strong><p>Confirma únicamente si reconoces esta identidad.</p><form action="/api/admin/telegram/confirmar" method="post"><button className="button button-primary" type="submit">Confirmar identidad administrativa</button></form></div>}
    </section>

    {canManage && <section className="telegram-admin-section">
      <header><div><p className="eyebrow">INSTALACIÓN</p><h2>Conexión segura del bot</h2><p>El token y el secreto viven únicamente en Cloudflare. Este control registra el webhook oficial y los comandos de moderación.</p></div></header>
      <div className="telegram-setup-checks"><span className={secretStatus.bot ? "is-ready" : "is-pending"}>Token del bot: {secretStatus.bot ? "configurado" : "pendiente"}</span><span className={secretStatus.webhook ? "is-ready" : "is-pending"}>Secreto del webhook: {secretStatus.webhook ? "configurado" : "pendiente"}</span></div>
      <form action="/api/admin/telegram/setup" method="post"><button className="button button-primary" type="submit" disabled={!secretStatus.bot || !secretStatus.webhook}>Instalar o renovar webhook</button></form>
      <p className="telegram-implementation-note">Para moderar todos los mensajes, BotFather debe dejar desactivado el modo privacidad. El bot debe ser administrador de cada chat con permisos para borrar mensajes, restringir, vetar, invitar y aprobar solicitudes.</p>
    </section>}

    {canManage && <section className="telegram-admin-section">
      <header><div><p className="eyebrow">ESTRUCTURA</p><h2>Chats descubiertos</h2><p>Añade el bot a cada grupo. Aparecerá aquí automáticamente y podrás asignar exactamente una función a cada chat.</p></div></header>
      {chats.length ? <div className="telegram-chat-grid">{chats.map((chat) => <article key={chat.id}>
        <header><div><span>{chatRoleLabel(chat.role)}</span><h3>{chat.title}</h3></div><b className={chat.botIsAdministrator ? "is-ready" : "is-pending"}>{chat.botIsAdministrator ? "Bot administrador" : "Revisar permisos"}</b></header>
        <dl><div><dt>ID interno de Telegram</dt><dd>{chat.telegramChatId}</dd></div><div><dt>Foro</dt><dd>{chat.isForum ? "Sí" : "No"}</dd></div><div><dt>Última señal</dt><dd>{date(chat.lastSeenAt)}</dd></div></dl>
        <form action={`/api/admin/telegram/chats/${encodeURIComponent(chat.id)}`} method="post"><label>Función<select name="role" defaultValue={chat.role}><option value="unassigned">Sin asignar</option><option value="public">Comunidad pública</option><option value="members">Miembros privado</option><option value="alerts">Alertas administrativas</option></select></label><label>ID del tema “Novedades”<input name="updates_thread_id" inputMode="numeric" defaultValue={chat.updatesThreadId ?? ""} placeholder="Solo para el chat público" /></label><button className="button button-outline" type="submit">Guardar asignación</button></form>
      </article>)}</div> : <p className="telegram-empty">Todavía no hay chats descubiertos. Añade el bot como administrador y envía un mensaje en cada grupo.</p>}
    </section>}

    {canManage && <section className="telegram-admin-section">
      <header><div><p className="eyebrow">CONFIGURACIÓN</p><h2>Comunidad y reglas automáticas</h2><p>El enlace público se reutiliza en el header y footer. El chat privado nunca se expone en HTML público.</p></div></header>
      <form className="telegram-settings-form" action="/api/admin/telegram/configuracion" method="post">
        <label>Usuario del bot<input name="bot_username" defaultValue={configuration.botUsername} placeholder="Chile3XBot" /></label>
        <label>Enlace de la comunidad pública<input name="public_community_url" defaultValue={configuration.publicCommunityUrl} placeholder="https://t.me/Chile3XComunidad" /></label>
        <label className="telegram-field-full">Normas<textarea name="rules_text" rows={10} defaultValue={configuration.rulesText} /></label>
        <label className="telegram-field-full">Términos bloqueados, uno por línea<textarea name="prohibited_terms" rows={4} defaultValue={configuration.prohibitedTerms} placeholder="Déjalo vacío hasta contar con criterios revisados." /></label>
        <label>Máximo de mensajes por ventana<input name="flood_max_messages" type="number" min={3} max={30} defaultValue={configuration.floodMaxMessages} /></label>
        <label>Ventana de flood en segundos<input name="flood_window_seconds" type="number" min={5} max={300} defaultValue={configuration.floodWindowSeconds} /></label>
        <label>Ventana de duplicados en segundos<input name="duplicate_window_seconds" type="number" min={20} max={3600} defaultValue={configuration.duplicateWindowSeconds} /></label>
        <label>Máximo de enlaces por mensaje<input name="max_links_per_message" type="number" min={0} max={10} defaultValue={configuration.maxLinksPerMessage} /></label>
        <label>Infracciones antes del veto<input name="strike_ban_threshold" type="number" min={2} max={20} defaultValue={configuration.strikeBanThreshold} /></label>
        <label>Restricción temporal en minutos<input name="temporary_restriction_minutes" type="number" min={5} max={43200} defaultValue={configuration.temporaryRestrictionMinutes} /></label>
        <label className="telegram-check"><input name="moderation_enabled" type="checkbox" value="enabled" defaultChecked={configuration.moderationEnabled} /> Moderación automática activa</label>
        <label className="telegram-check"><input name="auto_ban_enabled" type="checkbox" value="enabled" defaultChecked={configuration.autoBanEnabled} /> Permitir veto automático tras reincidencia o una señal crítica</label>
        <button className="button button-primary" type="submit">Guardar configuración</button>
      </form>
    </section>}

    <section className="telegram-admin-section">
      <header><div><p className="eyebrow">NOVEDADES</p><h2>Publicaciones sincronizadas</h2><p>Este flujo es independiente del blog. Desde Telegram, publica en el tema configurado o usa /novedad; solo se aceptan identidades administrativas vinculadas.</p></div><Link className="button button-outline" href="/novedades">Ver página pública</Link></header>
      {canPublish && <form className="telegram-bulletin-create" action="/api/admin/telegram/novedades" method="post"><label>Título<input name="title" maxLength={120} required /></label><label>Texto<textarea name="body" rows={7} maxLength={3800} required /></label><div><button className="button button-outline" name="status" value="draft" type="submit">Guardar borrador</button><button className="button button-primary" name="status" value="published" type="submit">Publicar en web y Telegram</button></div></form>}
      {bulletins.length ? <div className="telegram-bulletin-list">{bulletins.map((bulletin) => <details key={bulletin.id} id={bulletin.id}><summary><span><b>{bulletin.status === "published" ? "Publicada" : bulletin.status === "draft" ? "Borrador" : "Archivada"}</b><strong>{bulletin.title}</strong><small>{bulletin.source === "telegram" ? "Creada en Telegram" : "Creada en el panel"} · {date(bulletin.updatedAt)}</small></span></summary><p>{bulletin.body}</p>{canPublish && bulletin.status !== "archived" && <form action={`/api/admin/telegram/novedades/${encodeURIComponent(bulletin.id)}`} method="post"><label>Título<input name="title" defaultValue={bulletin.title} maxLength={120} required /></label><label>Texto<textarea name="body" defaultValue={bulletin.body} rows={7} maxLength={3800} required /></label><div><button className="button button-outline" name="status" value="draft" type="submit">Guardar como borrador</button><button className="button button-primary" name="status" value="published" type="submit">Actualizar publicación</button><button className="button button-danger" name="intent" value="archive" type="submit">Archivar</button></div></form>}</details>)}</div> : <p className="telegram-empty">Aún no hay novedades.</p>}
    </section>

    <section className="telegram-admin-section">
      <header><div><p className="eyebrow">MODERACIÓN</p><h2>Alertas y medidas</h2><p>Las medidas automáticas son trazables. Un veto de Telegram no deshabilita por sí solo la cuenta del sitio.</p></div><span className={`telegram-status ${openCases ? "is-banned" : "is-linked"}`}>{openCases} abiertos</span></header>
      {cases.length ? <div className="telegram-case-list">{cases.map((item) => <article key={item.id} className={item.status === "open" ? "is-open" : undefined}><header><div><span>{item.severity} · {item.automated ? "Automático" : "Manual"}</span><h3>{item.telegramUsername ? `@${item.telegramUsername}` : `Telegram ${item.telegramUserId}`}</h3></div><b>{item.status}</b></header><p>{item.reason}</p>{item.evidenceSnippet && <blockquote>{item.evidenceSnippet}</blockquote>}<small>{date(item.createdAt)} · Acción: {item.action}</small>{canModerate && item.status === "open" && <form action={`/api/admin/telegram/moderacion/${encodeURIComponent(item.id)}`} method="post"><button className="button button-outline" name="intent" value="resolve" type="submit">Cerrar caso</button><button className="button button-outline" name="intent" value="dismiss" type="submit">Descartar</button><button className="button button-danger" name="intent" value="ban" type="submit">Vetar en Telegram</button></form>}{canModerate && item.action === "ban" && <form action={`/api/admin/telegram/moderacion/${encodeURIComponent(item.id)}`} method="post"><button className="button button-outline" name="intent" value="unban" type="submit">Retirar veto</button></form>}</article>)}</div> : <p className="telegram-empty">No existen medidas de moderación registradas.</p>}
    </section>

    <details className="telegram-admin-section telegram-audit-section"><summary>Ver actividad técnica y auditoría</summary>{audits.length ? <div className="telegram-audit-list">{audits.map((event) => <article key={event.id}><span className={event.outcome === "success" ? "is-ready" : "is-pending"}>{event.outcome === "success" ? "Correcto" : "Error"}</span><div><strong>{event.summary}</strong><small>{event.action} · {date(event.createdAt)}</small></div></article>)}</div> : <p className="telegram-empty">Aún no hay actividad registrada.</p>}</details>
  </div></AdminShell>;
}
