import { and, asc, count, desc, eq, isNotNull, isNull, like, or, sql, type SQL } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminAuditLogs, adminGithubIdentities, adminNotifications, profileContactEvents, profiles, users } from "@/db/schema";
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_CATEGORIES,
  ADMIN_AUDIT_ENTITY_TYPES,
  parseAuditJson,
} from "@/lib/admin-audit";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPagination, readAdminPage } from "../pagination";
import { countryName } from "@/lib/session-context";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 40;

type ActivitySearchParams = {
  q?: string;
  admin?: string;
  area?: string;
  action?: string;
  entity?: string;
  result?: string;
  from?: string;
  to?: string;
  order?: string;
  page?: string;
  notify_q?: string;
  notify_kind?: string;
  notify_state?: string;
  notice?: string;
};

function option<T extends Record<string, string>>(value: string | undefined, options: T) {
  return value && Object.hasOwn(options, value) ? value as keyof T & string : "";
}

function dateValue(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function activityInstant(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}

function chileDayBoundary(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second), endOfDay ? 999 : 0);
    guess += target - represented;
  }
  return new Date(guess).toISOString();
}

function activityDate(value: string) {
  const instant = activityInstant(value);
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Santiago",
  }).format(new Date(instant));
}

const fieldLabels: Record<string, string> = {
  status: "Estado",
  verificationStatus: "Verificación",
  healthReviewStatus: "Revisión médica",
  isFeatured: "Destacado",
  moderationStatus: "Moderación",
  displayName: "Nombre visible",
  email: "Correo",
  role: "Tipo de cuenta",
  isActive: "Cuenta activa",
  city: "Ciudad",
  region: "Región",
  phone: "Teléfono",
  title: "Título",
  slug: "Enlace",
  noindex: "Excluir de buscadores",
  settings: "Ajustes",
  keys: "Campos modificados",
};

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Sin valor";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function Changes({ beforeData, afterData, metadata }: { beforeData: string | null; afterData: string | null; metadata: string | null }) {
  const before = parseAuditJson(beforeData);
  const after = parseAuditJson(afterData);
  const extra = parseAuditJson(metadata);
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
    .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
  if (!keys.length && !extra) return null;
  return <details className="admin-audit-details">
    <summary>Ver detalle del registro</summary>
    {keys.length > 0 && <div className="admin-audit-change-list">
      {keys.map((key) => <div key={key}>
        <strong>{fieldLabels[key] ?? key}</strong>
        <span><small>Antes</small>{valueText(before?.[key])}</span>
        <span><small>Después</small>{valueText(after?.[key])}</span>
      </div>)}
    </div>}
    {extra && <div className="admin-audit-metadata"><strong>Información adicional</strong>{Object.entries(extra).map(([key, value]) => <span key={key}><small>{fieldLabels[key] ?? key}</small>{valueText(value)}</span>)}</div>}
  </details>;
}

function entityHref(type: string, id: string | null, label: string | null, returnTo: string) {
  if (!id) return null;
  if (type === "account") return `/admin/cuentas/${encodeURIComponent(id)}?return_to=${encodeURIComponent(returnTo)}`;
  if (type === "profile") return `/admin/perfiles?q=${encodeURIComponent(label ?? id)}&return_to=${encodeURIComponent(returnTo)}`;
  if (type === "news") return `/admin/noticias?edit=${encodeURIComponent(id)}`;
  if (type === "report" || type === "report_evidence") return "/admin/reportes";
  if (type === "bug_report") return "/admin/bugs";
  if (type === "public_media" || type === "exclusive_media" || type === "verification_document") return "/admin/medios";
  if (type === "settings") return "/admin/configuracion";
  return null;
}

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<ActivitySearchParams> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/actividad");
  if (!adminHasCapability(admin, "audit.view")) redirect("/admin/acceso-denegado?reason=permission");
  const [db, params] = await Promise.all([getDb(), searchParams]);
  const result: "" | "success" | "failure" = params.result === "success" || params.result === "failure" ? params.result : "";
  const filters = {
    q: (params.q ?? "").trim().slice(0, 120),
    admin: (params.admin ?? "").trim(),
    area: option(params.area, ADMIN_AUDIT_CATEGORIES),
    action: option(params.action, ADMIN_AUDIT_ACTIONS),
    entity: option(params.entity, ADMIN_AUDIT_ENTITY_TYPES),
    result,
    from: dateValue(params.from),
    to: dateValue(params.to),
    order: params.order === "oldest" ? "oldest" : "newest",
  };
  const conditions: SQL[] = [];
  if (filters.q) {
    const pattern = `%${filters.q.toLocaleLowerCase("es-CL")}%`;
    const textSearch = or(
      like(sql`lower(${adminAuditLogs.summary})`, pattern),
      like(sql`lower(${adminAuditLogs.actorEmail})`, pattern),
      like(sql`lower(coalesce(${adminAuditLogs.actorGithubLogin}, ''))`, pattern),
      like(sql`lower(coalesce(${adminAuditLogs.actorName}, ''))`, pattern),
      like(sql`lower(coalesce(${adminAuditLogs.entityLabel}, ''))`, pattern),
      like(sql`lower(coalesce(${adminAuditLogs.entityId}, ''))`, pattern),
    );
    if (textSearch) conditions.push(textSearch);
  }
  if (filters.admin) conditions.push(eq(adminAuditLogs.actorUserId, filters.admin));
  if (filters.area) conditions.push(eq(adminAuditLogs.category, filters.area));
  if (filters.action) conditions.push(eq(adminAuditLogs.action, filters.action));
  if (filters.entity) conditions.push(eq(adminAuditLogs.entityType, filters.entity));
  if (filters.result) conditions.push(eq(adminAuditLogs.outcome, filters.result));
  if (filters.from) conditions.push(sql`datetime(${adminAuditLogs.createdAt}) >= datetime(${chileDayBoundary(filters.from)})`);
  if (filters.to) conditions.push(sql`datetime(${adminAuditLogs.createdAt}) <= datetime(${chileDayBoundary(filters.to, true)})`);
  const where = conditions.length ? and(...conditions) : undefined;
  const notificationFilters = {
    q: (params.notify_q ?? "").trim().slice(0, 100),
    kind: ["account_registered", "profile_created", "profile_updated"].includes(params.notify_kind ?? "") ? params.notify_kind! : "",
    state: params.notify_state === "read" || params.notify_state === "unread" ? params.notify_state : "",
  };
  const notificationConditions: SQL[] = [];
  if (notificationFilters.kind) notificationConditions.push(eq(adminNotifications.kind, notificationFilters.kind as "account_registered" | "profile_created" | "profile_updated"));
  if (notificationFilters.state === "read") notificationConditions.push(isNotNull(adminNotifications.readAt));
  if (notificationFilters.state === "unread") notificationConditions.push(isNull(adminNotifications.readAt));
  if (notificationFilters.q) {
    const pattern = `%${notificationFilters.q.toLocaleLowerCase("es-CL")}%`;
    const match = or(like(sql`lower(${adminNotifications.summary})`, pattern), like(sql`lower(coalesce(${users.email}, ''))`, pattern), like(sql`lower(coalesce(${users.displayName}, ''))`, pattern), like(sql`lower(coalesce(${profiles.displayName}, ''))`, pattern));
    if (match) notificationConditions.push(match);
  }
  const notificationWhere = notificationConditions.length ? and(...notificationConditions) : undefined;
  const requestedPage = readAdminPage(params.page);

  const [[allCount], [filteredCount], administrators, whatsappClicks, notificationRows, [unreadNotifications]] = await Promise.all([
    db.select({ total: count() }).from(adminAuditLogs),
    db.select({ total: count() }).from(adminAuditLogs).where(where),
    db.select({
      id: users.id,
      name: users.displayName,
      email: users.email,
      githubLogin: adminGithubIdentities.githubLogin,
    }).from(users).leftJoin(adminGithubIdentities, eq(adminGithubIdentities.userId, users.id)).where(eq(users.role, "admin")).orderBy(asc(users.displayName), asc(users.email)),
    db.select({
      id: profileContactEvents.id,
      createdAt: profileContactEvents.createdAt,
      clickedOn: profileContactEvents.clickedOn,
      profileId: profiles.id,
      profileName: profiles.displayName,
      viewerUserId: profileContactEvents.viewerUserId,
      viewerName: users.displayName,
      viewerUsername: users.username,
      viewerEmail: users.email,
      countryCode: profileContactEvents.countryCode,
      region: profileContactEvents.region,
      city: profileContactEvents.city,
      deviceType: profileContactEvents.deviceType,
      referrerPath: profileContactEvents.referrerPath,
    }).from(profileContactEvents)
      .innerJoin(profiles, eq(profiles.id, profileContactEvents.profileId))
      .leftJoin(users, eq(users.id, profileContactEvents.viewerUserId))
      .where(eq(profileContactEvents.kind, "whatsapp"))
      .orderBy(desc(profileContactEvents.createdAt)).limit(50),
    db.select({
      id: adminNotifications.id,
      kind: adminNotifications.kind,
      summary: adminNotifications.summary,
      readAt: adminNotifications.readAt,
      createdAt: adminNotifications.createdAt,
      actorUserId: adminNotifications.actorUserId,
      actorName: users.displayName,
      actorUsername: users.username,
      actorEmail: users.email,
      profileId: adminNotifications.profileId,
      profileName: profiles.displayName,
    }).from(adminNotifications)
      .leftJoin(users, eq(users.id, adminNotifications.actorUserId))
      .leftJoin(profiles, eq(profiles.id, adminNotifications.profileId))
      .where(notificationWhere).orderBy(desc(adminNotifications.createdAt)).limit(50),
    db.select({ total: count() }).from(adminNotifications).where(isNull(adminNotifications.readAt)),
  ]);
  const total = Number(filteredCount?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rows = await db.select().from(adminAuditLogs).where(where)
    .orderBy(filters.order === "oldest" ? asc(adminAuditLogs.createdAt) : desc(adminAuditLogs.createdAt))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && !(key === "order" && value === "newest")) query.set(key === "q" ? "q" : key, value);
  const returnTo = `/admin/actividad${query.size ? `?${query}` : ""}`;
  const hasFilters = Boolean(filters.q || filters.admin || filters.area || filters.action || filters.entity || filters.result || filters.from || filters.to || filters.order === "oldest");

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="TRAZABILIDAD" title="Historial administrativo" description="Registro cronológico de accesos, moderación y cambios realizados por cada administrador. Las contraseñas, tokens y claves privadas nunca se guardan en esta bitácora." backHref="/admin" />
    <section className="admin-audit-summary" aria-label="Resumen del historial">
      <div><span>Registros totales</span><strong>{Number(allCount?.total ?? 0)}</strong></div>
      <div><span>Coincidencias</span><strong>{total}</strong></div>
      <p>Hora mostrada en Chile continental. Los eventos nuevos se identifican por la cuenta interna y el usuario de GitHub.</p>
    </section>
    {params.notice === "notifications_read" && <p className="admin-success" role="status">Las notificaciones seleccionadas quedaron marcadas como leídas.</p>}
    <details className="admin-notification-center" open>
      <summary><span><strong>Notificaciones del sitio</strong><small>Registros, anuncios nuevos y modificaciones hechas por usuarios</small></span><b>{Number(unreadNotifications?.total ?? 0)} nuevas</b></summary>
      <form className="admin-notification-filters" method="get">
        <label>Buscar<input type="search" name="notify_q" defaultValue={notificationFilters.q} placeholder="Cuenta o anuncio" /></label>
        <label>Tipo<select name="notify_kind" defaultValue={notificationFilters.kind}><option value="">Todos</option><option value="account_registered">Nuevas cuentas</option><option value="profile_created">Anuncios creados</option><option value="profile_updated">Anuncios modificados</option></select></label>
        <label>Estado<select name="notify_state" defaultValue={notificationFilters.state}><option value="">Leídas y nuevas</option><option value="unread">Solo nuevas</option><option value="read">Solo leídas</option></select></label>
        <button className="button button-primary" type="submit">Filtrar</button>
        {(notificationFilters.q || notificationFilters.kind || notificationFilters.state) && <Link className="button button-outline" href="/admin/actividad">Limpiar</Link>}
      </form>
      <form className="admin-notification-read-all" action="/api/admin/notificaciones" method="post"><input type="hidden" name="intent" value="all" /><input type="hidden" name="return_to" value="/admin/actividad?notice=notifications_read" /><button type="submit">Marcar todas como leídas</button></form>
      {notificationRows.length ? <div className="admin-notification-list">{notificationRows.map((notification) => <article className={notification.readAt ? "is-read" : "is-unread"} key={notification.id}>
        <div><span>{notification.kind === "account_registered" ? "Nueva cuenta" : notification.kind === "profile_created" ? "Anuncio creado" : "Anuncio modificado"}</span><strong>{notification.profileName ?? notification.actorName ?? (notification.actorUsername ? `@${notification.actorUsername}` : notification.actorEmail) ?? "Usuario de Chile3X"}</strong><p>{notification.summary}</p><time dateTime={activityInstant(notification.createdAt)}>{activityDate(notification.createdAt)}</time></div>
        <nav>{notification.actorUserId && <Link href={`/admin/cuentas/${encodeURIComponent(notification.actorUserId)}`}>Ver cuenta</Link>}{notification.profileId && <Link href={`/admin/perfiles?q=${encodeURIComponent(notification.profileName ?? notification.profileId)}`}>Ver anuncio</Link>}{!notification.readAt && <form action="/api/admin/notificaciones" method="post"><input type="hidden" name="notification_id" value={notification.id} /><input type="hidden" name="return_to" value="/admin/actividad?notice=notifications_read" /><button type="submit">Marcar leída</button></form>}</nav>
      </article>)}</div> : <p className="admin-media-empty">No hay notificaciones que coincidan con estos filtros.</p>}
    </details>
    <details className="admin-whatsapp-clicks" open>
      <summary><span><strong>Clics únicos en WhatsApp</strong><small>Últimos 50 registros diarios por anuncio y navegador</small></span><b>{whatsappClicks.length}</b></summary>
      <p>La cuenta, ubicación aproximada, dispositivo y ruta solo se agregan cuando la persona aceptó la medición. Sin ese permiso se conserva únicamente un identificador opaco para el conteo diario; nunca se guarda la IP en este registro.</p>
      {whatsappClicks.length ? <div className="admin-whatsapp-click-list">{whatsappClicks.map((click) => <article key={click.id}>
        <div><strong>{click.profileName}</strong><Link href={`/admin/perfiles?q=${encodeURIComponent(click.profileName)}`}>Abrir anuncio</Link></div>
        <dl><div><dt>Persona</dt><dd>{click.viewerUserId ? `${click.viewerName ?? click.viewerUsername ?? "Cuenta Chile3X"}${click.viewerEmail ? ` · ${click.viewerEmail}` : ""}` : "Visitante anónimo"}</dd></div><div><dt>Ubicación aproximada</dt><dd>{[click.city, click.region, countryName(click.countryCode)].filter(Boolean).join(", ") || "No disponible"}</dd></div><div><dt>Dispositivo</dt><dd>{click.deviceType === "mobile" ? "Móvil" : click.deviceType === "tablet" ? "Tablet" : click.deviceType === "desktop" ? "Computador" : "No identificado"}</dd></div><div><dt>Fecha</dt><dd>{activityDate(click.createdAt)}</dd></div>{click.referrerPath && <div><dt>Origen</dt><dd>{click.referrerPath}</dd></div>}</dl>
      </article>)}</div> : <p className="admin-media-empty">Aún no existen clics registrados en WhatsApp.</p>}
    </details>
    <form className="admin-audit-filters" method="get" role="search">
      <label className="admin-audit-search">Buscar<input type="search" name="q" defaultValue={filters.q} placeholder="Administrador, cuenta, anuncio, correo o identificador" /></label>
      <label>Administrador<select name="admin" defaultValue={filters.admin}><option value="">Todos</option>{administrators.map((item) => <option value={item.id} key={item.id}>{item.githubLogin ? `@${item.githubLogin} · ` : ""}{item.name ?? item.email}</option>)}</select></label>
      <label>Área<select name="area" defaultValue={filters.area}><option value="">Todas</option>{Object.entries(ADMIN_AUDIT_CATEGORIES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Acción<select name="action" defaultValue={filters.action}><option value="">Todas</option>{Object.entries(ADMIN_AUDIT_ACTIONS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Objeto afectado<select name="entity" defaultValue={filters.entity}><option value="">Todos</option>{Object.entries(ADMIN_AUDIT_ENTITY_TYPES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Resultado<select name="result" defaultValue={filters.result}><option value="">Todos</option><option value="success">Completado</option><option value="failure">Fallido</option></select></label>
      <label>Desde<input type="date" name="from" defaultValue={filters.from} /></label>
      <label>Hasta<input type="date" name="to" defaultValue={filters.to} /></label>
      <label>Orden<select name="order" defaultValue={filters.order}><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option></select></label>
      <div className="admin-audit-filter-actions"><button className="button button-primary" type="submit">Aplicar filtros</button>{hasFilters && <Link prefetch={false} className="button button-outline" href="/admin/actividad">Limpiar</Link>}</div>
    </form>
    <p className="admin-filter-summary">Mostrando {rows.length} de {total} registros{total > PAGE_SIZE ? ` · página ${page} de ${totalPages}` : ""}.</p>
    {rows.length ? <section className="admin-audit-list" aria-label="Eventos administrativos">{rows.map((row) => {
      const href = entityHref(row.entityType, row.entityId, row.entityLabel, returnTo);
      return <article key={row.id}>
        <div className="admin-audit-marker" aria-hidden="true" />
        <div className="admin-audit-event">
          <header><div><span className="admin-audit-category">{ADMIN_AUDIT_CATEGORIES[row.category as keyof typeof ADMIN_AUDIT_CATEGORIES] ?? row.category}</span><h2>{ADMIN_AUDIT_ACTIONS[row.action as keyof typeof ADMIN_AUDIT_ACTIONS] ?? row.action}</h2></div><span className={`admin-audit-outcome is-${row.outcome}`}>{row.outcome === "success" ? "Completado" : "Fallido"}</span></header>
          <p className="admin-audit-summary-text">{row.summary}</p>
          <dl>
            <div><dt>Administrador</dt><dd><strong>{row.actorName ?? row.actorEmail}</strong>{row.actorGithubLogin && <span>@{row.actorGithubLogin}</span>}<span>{row.actorEmail}</span></dd></div>
            <div><dt>Fecha y hora</dt><dd><time dateTime={activityInstant(row.createdAt)}>{activityDate(row.createdAt)}</time></dd></div>
            <div><dt>Objeto afectado</dt><dd>{href ? <Link prefetch={false} href={href}>{row.entityLabel ?? row.entityId ?? ADMIN_AUDIT_ENTITY_TYPES[row.entityType as keyof typeof ADMIN_AUDIT_ENTITY_TYPES] ?? row.entityType}</Link> : row.entityLabel ?? row.entityId ?? ADMIN_AUDIT_ENTITY_TYPES[row.entityType as keyof typeof ADMIN_AUDIT_ENTITY_TYPES] ?? row.entityType}{row.entityId && <span>ID: {row.entityId}</span>}</dd></div>
          </dl>
          <Changes beforeData={row.beforeData} afterData={row.afterData} metadata={row.metadata} />
        </div>
      </article>;
    })}</section> : <section className="admin-empty"><h2>No hay registros para estos filtros</h2><p>Prueba ampliando las fechas o quitando condiciones. Los eventos nuevos aparecerán aquí automáticamente.</p></section>}
    <AdminPagination pathname="/admin/actividad" params={query} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label="Actividad" />
  </div></AdminShell>;
}
