import { and, asc, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminAuditLogs, adminGithubIdentities, users } from "@/db/schema";
import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_CATEGORIES,
  ADMIN_AUDIT_ENTITY_TYPES,
  parseAuditJson,
} from "@/lib/admin-audit";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPagination, readAdminPage } from "../pagination";

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
  const requestedPage = readAdminPage(params.page);

  const [[allCount], [filteredCount], administrators] = await Promise.all([
    db.select({ total: count() }).from(adminAuditLogs),
    db.select({ total: count() }).from(adminAuditLogs).where(where),
    db.select({
      id: users.id,
      name: users.displayName,
      email: users.email,
      githubLogin: adminGithubIdentities.githubLogin,
    }).from(users).leftJoin(adminGithubIdentities, eq(adminGithubIdentities.userId, users.id)).where(eq(users.role, "admin")).orderBy(asc(users.displayName), asc(users.email)),
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
      <div className="admin-audit-filter-actions"><button className="button button-primary" type="submit">Aplicar filtros</button>{hasFilters && <Link className="button button-outline" href="/admin/actividad">Limpiar</Link>}</div>
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
            <div><dt>Objeto afectado</dt><dd>{href ? <Link href={href}>{row.entityLabel ?? row.entityId ?? ADMIN_AUDIT_ENTITY_TYPES[row.entityType as keyof typeof ADMIN_AUDIT_ENTITY_TYPES] ?? row.entityType}</Link> : row.entityLabel ?? row.entityId ?? ADMIN_AUDIT_ENTITY_TYPES[row.entityType as keyof typeof ADMIN_AUDIT_ENTITY_TYPES] ?? row.entityType}{row.entityId && <span>ID: {row.entityId}</span>}</dd></div>
          </dl>
          <Changes beforeData={row.beforeData} afterData={row.afterData} metadata={row.metadata} />
        </div>
      </article>;
    })}</section> : <section className="admin-empty"><h2>No hay registros para estos filtros</h2><p>Prueba ampliando las fechas o quitando condiciones. Los eventos nuevos aparecerán aquí automáticamente.</p></section>}
    <AdminPagination pathname="/admin/actividad" params={query} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label="Actividad" />
  </div></AdminShell>;
}
