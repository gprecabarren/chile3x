import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
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
  return "Sin asignar";
}

type WebhookHealth = {
  ok: boolean;
  url: string;
  pendingUpdateCount: number;
  lastErrorMessage: string | null;
};

async function telegramWebhookHealth(token: string): Promise<WebhookHealth> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { cache: "no-store" });
    const value = await response.json() as { ok?: boolean; result?: { url?: string; pending_update_count?: number; last_error_message?: string } };
    return {
      ok: response.ok && value.ok === true,
      url: value.result?.url ?? "",
      pendingUpdateCount: Number(value.result?.pending_update_count ?? 0),
      lastErrorMessage: value.result?.last_error_message?.slice(0, 240) ?? null,
    };
  } catch {
    return { ok: false, url: "", pendingUpdateCount: 0, lastErrorMessage: "No fue posible consultar Telegram en este momento." };
  }
}

export default async function AdminTelegramPage({ searchParams }: { searchParams: Promise<{ notice?: string; case_status?: string; case_action?: string; case_severity?: string; case_q?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/telegram");
  if (!adminHasCapability(admin, "telegram.view")) redirect("/admin/acceso-denegado?reason=permission");
  const db = await getDb();
  const canManage = adminHasCapability(admin, "telegram.manage");
  const canPublish = adminHasCapability(admin, "telegram.publish");
  const canModerate = adminHasCapability(admin, "telegram.moderate");
  const query = await searchParams;
  const caseStatus = ["open", "resolved", "dismissed"].includes(query.case_status ?? "") ? query.case_status as "open" | "resolved" | "dismissed" : "";
  const caseAction = ["observed", "warn", "delete", "restrict", "ban", "unban"].includes(query.case_action ?? "") ? query.case_action as "observed" | "warn" | "delete" | "restrict" | "ban" | "unban" : "";
  const caseSeverity = ["low", "medium", "high", "critical"].includes(query.case_severity ?? "") ? query.case_severity as "low" | "medium" | "high" | "critical" : "";
  const caseSearch = query.case_q?.trim().slice(0, 80) ?? "";
  const moderationFilters: SQL<unknown>[] = [];
  if (caseStatus) moderationFilters.push(eq(telegramModerationCases.status, caseStatus));
  if (caseAction) moderationFilters.push(eq(telegramModerationCases.action, caseAction));
  if (caseSeverity) moderationFilters.push(eq(telegramModerationCases.severity, caseSeverity));
  if (caseSearch) {
    const searchFilter = or(
      like(telegramModerationCases.telegramUsername, `%${caseSearch}%`),
      like(telegramModerationCases.telegramUserId, `%${caseSearch}%`),
      like(telegramModerationCases.reason, `%${caseSearch}%`),
    );
    if (searchFilter) moderationFilters.push(searchFilter);
  }
  const casesPromise = moderationFilters.length
    ? db.select().from(telegramModerationCases).where(and(...moderationFilters)).orderBy(desc(telegramModerationCases.createdAt)).limit(50)
    : db.select().from(telegramModerationCases).orderBy(desc(telegramModerationCases.createdAt)).limit(50);
  const [configuration, identityRows, attempt, chats, bulletins, cases, audits, [members], [pendingJobs], [openCaseCount]] = await Promise.all([
    getTelegramConfiguration(),
    db.select().from(telegramAdminIdentities).where(eq(telegramAdminIdentities.userId, admin.id)).limit(1),
    latestTelegramLinkAttempt(admin.id, "admin"),
    db.select().from(telegramChats).where(eq(telegramChats.isActive, true)).orderBy(desc(telegramChats.lastSeenAt)).limit(20),
    db.select().from(telegramBulletins).orderBy(desc(telegramBulletins.updatedAt)).limit(20),
    casesPromise,
    db.select().from(telegramAuditEvents).orderBy(desc(telegramAuditEvents.createdAt)).limit(20),
    db.select({ total: count() }).from(telegramMemberships).where(eq(telegramMemberships.status, "active")),
    db.select({ total: count() }).from(telegramOutboxJobs).where(eq(telegramOutboxJobs.status, "pending")),
    db.select({ total: count() }).from(telegramModerationCases).where(eq(telegramModerationCases.status, "open")),
  ]);
  const identity = identityRows[0] ?? null;
  const candidateReady = attempt?.status === "candidate";
  let secretStatus = { bot: false, webhook: false };
  let webhookHealth: WebhookHealth = { ok: false, url: "", pendingUpdateCount: 0, lastErrorMessage: null };
  try {
    const { env } = await import("cloudflare:workers");
    secretStatus = { bot: Boolean(env.TELEGRAM_BOT_TOKEN), webhook: Boolean(env.TELEGRAM_WEBHOOK_SECRET) };
    if (env.TELEGRAM_BOT_TOKEN) webhookHealth = await telegramWebhookHealth(env.TELEGRAM_BOT_TOKEN);
  } catch {
    // The static render used by local checks has no Worker environment.
  }
  const publicChat = chats.find((chat) => chat.role === "public");
  const membersChat = chats.find((chat) => chat.role === "members");
  const openCases = Number(openCaseCount?.total ?? 0);
  const webhookReady = webhookHealth.ok && webhookHealth.url === "https://chile3x.cl/api/telegram/webhook";

  return <AdminShell user={admin}><div className="admin-content telegram-admin-page">
    <AdminPageHeading eyebrow="TELEGRAM" title="Comunidad, Novedades y moderación" description="Administra el bot, la comunidad pública, el espacio privado de Miembros y la sincronización del sitio desde un solo lugar.">
      {configuration.publicCommunityUrl && <a className="button button-outline" href={configuration.publicCommunityUrl} target="_blank" rel="noreferrer">Abrir comunidad</a>}
    </AdminPageHeading>
    {query.notice && notices[query.notice] && <p className={query.notice.includes("error") || query.notice.includes("missing") ? "admin-error" : "admin-success"} role="status">{notices[query.notice]}</p>}

    <section className="telegram-admin-metrics" aria-label="Estado de Telegram">
      <article className={webhookReady && secretStatus.webhook ? undefined : "has-warning"}><span>Bot y webhook</span><strong>{webhookReady && secretStatus.webhook ? "Listos" : "Revisar"}</strong><small>{configuration.botUsername ? `@${configuration.botUsername} · ${webhookHealth.pendingUpdateCount} actualizaciones pendientes` : "Sin bot identificado"}</small></article>
      <article><span>Comunidad pública</span><strong>{publicChat ? "Asignada" : "Pendiente"}</strong><small>{publicChat?.title ?? "El bot debe descubrir el chat"}</small></article>
      <article><span>Miembros activos</span><strong>{Number(members?.total ?? 0)}</strong><small>{membersChat?.title ?? "Espacio privado sin asignar"}</small></article>
      <article className={openCases ? "has-warning" : undefined}><span>Casos abiertos</span><strong>{openCases}</strong><small>Revisables en este panel</small></article>
      <article><span>Acciones pendientes</span><strong>{Number(pendingJobs?.total ?? 0)}</strong><small>La cola y el cron reintentan errores transitorios.</small></article>
    </section>

    <section className="telegram-admin-section telegram-admin-guide">
      <header><div><p className="eyebrow">MAPA OPERATIVO</p><h2>Cómo funciona la comunidad</h2><p>El acceso público, la identidad del sitio y el espacio privado cumplen funciones distintas. Este es el recorrido completo que verá una persona.</p></div></header>
      <div className="telegram-admin-guide-grid">
        <article><span>1</span><div><h3>Comunidad pública</h3><p>Cualquier visitante entra desde el header o footer. No necesita una cuenta Chile3X y no ve el espacio privado.</p></div></article>
        <article><span>2</span><div><h3>Vinculación segura</h3><p>Una persona con sesión iniciada abre «Telegram y Miembros», conversa con el bot y confirma su identidad nuevamente en el sitio.</p></div></article>
        <article><span>3</span><div><h3>Acceso a Miembros</h3><p>Solo una cuenta activa y con correo verificado recibe una invitación temporal. El reingreso siempre es manual.</p></div></article>
        <article><span>4</span><div><h3>Moderación y Novedades</h3><p>El bot aplica las reglas, registra medidas y alerta a administradores. Las Novedades se sincronizan entre el panel, la web y Telegram.</p></div></article>
      </div>
      <details className="telegram-command-guide"><summary>Ver comandos disponibles</summary><dl><div><dt>Todos</dt><dd>/start, /help y /rules</dd></div><div><dt>Administradores vinculados</dt><dd>/status, /warn, /mute, /unmute, /ban, /unban y /novedad</dd></div></dl><p>Los comandos de moderación también comprueban que la identidad tenga permisos en Chile3X y sea administradora real del chat de Telegram.</p></details>
    </section>

    <section className="telegram-admin-section">
      <header><div><p className="eyebrow">IDENTIDAD ADMINISTRATIVA</p><h2>Tu acceso desde Telegram</h2><p>El vínculo administrativo está separado de las cuentas públicas y solo funciona junto a un acceso GitHub activo.</p></div><span className={`telegram-status is-${identity?.isActive ? "linked" : "unlinked"}`}>{identity?.isActive ? "Vinculada" : "Sin vincular"}</span></header>
      {identity?.isActive ? <p className="telegram-admin-identity">{telegramIdentityLabel(identity.firstName, identity.username, identity.telegramUserId)}</p> : <form action="/api/admin/telegram/vincular" method="post"><button className="button button-primary" type="submit">Vincular mi Telegram administrativo</button></form>}
      {candidateReady && <div className="telegram-confirm-card"><strong>{telegramIdentityLabel(attempt.candidateFirstName, attempt.candidateUsername, attempt.candidateTelegramUserId)}</strong><p>Confirma únicamente si reconoces esta identidad.</p><form action="/api/admin/telegram/confirmar" method="post"><button className="button button-primary" type="submit">Confirmar identidad administrativa</button></form></div>}
    </section>

    {canManage && <section className="telegram-admin-section">
      <header><div><p className="eyebrow">INSTALACIÓN</p><h2>Conexión segura del bot</h2><p>El token y el secreto viven únicamente en Cloudflare. Este control registra el webhook oficial y los comandos de moderación.</p></div></header>
      <div className="telegram-setup-checks"><span className={secretStatus.bot ? "is-ready" : "is-pending"}>Token del bot: {secretStatus.bot ? "configurado" : "pendiente"}</span><span className={secretStatus.webhook ? "is-ready" : "is-pending"}>Secreto del webhook: {secretStatus.webhook ? "configurado" : "pendiente"}</span><span className={webhookReady ? "is-ready" : "is-pending"}>URL oficial: {webhookReady ? "activa" : "revisar"}</span><span className={webhookHealth.pendingUpdateCount === 0 ? "is-ready" : "is-pending"}>Cola de Telegram: {webhookHealth.pendingUpdateCount} pendiente{webhookHealth.pendingUpdateCount === 1 ? "" : "s"}</span></div>
      <form action="/api/admin/telegram/setup" method="post"><button className="button button-primary" type="submit" disabled={!secretStatus.bot || !secretStatus.webhook}>Instalar o renovar webhook</button></form>
      {webhookHealth.lastErrorMessage && <p className="telegram-webhook-error"><strong>Último error informado por Telegram:</strong> {webhookHealth.lastErrorMessage}</p>}
      <p className="telegram-implementation-note">Para moderar todos los mensajes, BotFather debe dejar desactivado el modo privacidad. El bot debe ser administrador de cada chat con permisos para borrar mensajes, restringir, vetar, invitar y aprobar solicitudes.</p>
    </section>}

    {canManage && <section className="telegram-admin-section">
      <header><div><p className="eyebrow">ESTRUCTURA</p><h2>Espacios descubiertos</h2><p>La Comunidad reúne un espacio público y otro privado para Miembros. Añade el bot a ambos y asigna aquí su función.</p></div></header>
      {chats.length ? <div className="telegram-chat-grid">{chats.map((chat) => <article key={chat.id}>
        <header><div><span>{chatRoleLabel(chat.role)}</span><h3>{chat.title}</h3></div><b className={chat.botIsAdministrator ? "is-ready" : "is-pending"}>{chat.botIsAdministrator ? "Bot administrador" : "Revisar permisos"}</b></header>
        <dl><div><dt>ID interno de Telegram</dt><dd>{chat.telegramChatId}</dd></div><div><dt>Foro</dt><dd>{chat.isForum ? "Sí" : "No"}</dd></div><div><dt>Última señal</dt><dd>{date(chat.lastSeenAt)}</dd></div></dl>
        <form action={`/api/admin/telegram/chats/${encodeURIComponent(chat.id)}`} method="post"><label>Función<select name="role" defaultValue={chat.role === "public" || chat.role === "members" ? chat.role : "unassigned"}><option value="unassigned">Sin asignar</option><option value="public">Comunidad pública</option><option value="members">Miembros privado</option></select></label><label>ID del tema “Novedades”<input name="updates_thread_id" inputMode="numeric" defaultValue={chat.updatesThreadId ?? ""} placeholder="Solo para el chat público" /></label><button className="button button-outline" type="submit">Guardar asignación</button></form>
      </article>)}</div> : <p className="telegram-empty">Todavía no hay espacios descubiertos. Añade el bot como administrador y envía un mensaje en Comunidad y Miembros.</p>}
    </section>}

    {canManage && <section className="telegram-admin-section">
      <header><div><p className="eyebrow">CONFIGURACIÓN</p><h2>Comunidad y reglas automáticas</h2><p>El enlace público se reutiliza en el header y footer. El chat privado nunca se expone en HTML público.</p></div></header>
      <form className="telegram-settings-form" action="/api/admin/telegram/configuracion" method="post">
        <label>Usuario del bot<span className="telegram-readonly-field">{configuration.botUsername ? `@${configuration.botUsername}` : "Se detecta al instalar el webhook"}</span><input name="telegram_bot_username" type="hidden" value={configuration.botUsername} /></label>
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

    <section className="telegram-admin-section" id="moderacion">
      <header><div><p className="eyebrow">MODERACIÓN</p><h2>Alertas y medidas</h2><p>Las medidas automáticas son trazables. Un veto de Telegram no deshabilita por sí solo la cuenta del sitio.</p></div><span className={`telegram-status ${openCases ? "is-banned" : "is-linked"}`}>{openCases} abiertos</span></header>
      <form className="telegram-case-filters" action="/admin/telegram#moderacion" method="get">
        <label>Buscar<input name="case_q" defaultValue={caseSearch} placeholder="Usuario, ID o motivo" /></label>
        <label>Estado<select name="case_status" defaultValue={caseStatus}><option value="">Todos</option><option value="open">Abierto</option><option value="resolved">Cerrado</option><option value="dismissed">Descartado</option></select></label>
        <label>Medida<select name="case_action" defaultValue={caseAction}><option value="">Todas</option><option value="observed">Observación</option><option value="warn">Advertencia</option><option value="delete">Mensaje eliminado</option><option value="restrict">Restricción</option><option value="ban">Veto</option><option value="unban">Veto retirado</option></select></label>
        <label>Gravedad<select name="case_severity" defaultValue={caseSeverity}><option value="">Todas</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
        <div><button className="button button-primary" type="submit">Aplicar filtros</button>{(caseSearch || caseStatus || caseAction || caseSeverity) && <Link className="button button-outline" href="/admin/telegram#moderacion">Limpiar</Link>}</div>
      </form>
      {cases.length ? <div className="telegram-case-list">{cases.map((item) => <article key={item.id} className={item.status === "open" ? "is-open" : undefined}><header><div><span>{item.severity} · {item.automated ? "Automático" : "Manual"}</span><h3>{item.telegramUsername ? `@${item.telegramUsername}` : `Telegram ${item.telegramUserId}`}</h3></div><b>{item.status}</b></header><p>{item.reason}</p>{item.evidenceSnippet && <blockquote>{item.evidenceSnippet}</blockquote>}<small>{date(item.createdAt)} · Acción: {item.action}</small>{canModerate && item.status === "open" && <form action={`/api/admin/telegram/moderacion/${encodeURIComponent(item.id)}`} method="post"><button className="button button-outline" name="intent" value="resolve" type="submit">Cerrar caso</button><button className="button button-outline" name="intent" value="dismiss" type="submit">Descartar</button><button className="button button-danger" name="intent" value="ban" type="submit">Vetar en Telegram</button></form>}{canModerate && item.action === "ban" && <form action={`/api/admin/telegram/moderacion/${encodeURIComponent(item.id)}`} method="post"><button className="button button-outline" name="intent" value="unban" type="submit">Retirar veto</button></form>}</article>)}</div> : <p className="telegram-empty">{caseSearch || caseStatus || caseAction || caseSeverity ? "Ningún caso coincide con los filtros." : "No existen medidas de moderación registradas."}</p>}
    </section>

    <details className="telegram-admin-section telegram-audit-section"><summary>Ver actividad técnica y auditoría</summary>{audits.length ? <div className="telegram-audit-list">{audits.map((event) => <article key={event.id}><span className={event.outcome === "success" ? "is-ready" : "is-pending"}>{event.outcome === "success" ? "Correcto" : "Error"}</span><div><strong>{event.summary}</strong><small>{event.action} · {date(event.createdAt)}</small></div></article>)}</div> : <p className="telegram-empty">Aún no hay actividad registrada.</p>}</details>
  </div></AdminShell>;
}
