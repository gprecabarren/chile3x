import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { redirect } from "next/navigation";
import { DateField } from "@/app/DateField";
import { getDb } from "@/db";
import { emailDeliveryLogs } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { chileDayBoundary, validIsoDay } from "@/lib/chile-date-boundary";
import { canViewEmailHistory, EMAIL_AUDIENCES, EMAIL_KINDS, EMAIL_PROVIDERS, EMAIL_STATUSES, parseEmailAttempts } from "@/lib/email-history-policy";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPagination, readAdminPage } from "../pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;
type Params = { q?: string; kind?: string; status?: string; audience?: string; provider?: string; period?: string; from?: string; to?: string; page?: string };
const dateFormatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/Santiago" });
function date(value: string) { return dateFormatter.format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`)); }
function choice<T extends Record<string, string>>(value: string | undefined, options: T): Extract<keyof T, string> | "" { return value && Object.hasOwn(options, value) ? value as Extract<keyof T, string> : ""; }
const errors: Record<string, string> = {
  ACCEPTED: "El servicio aceptó el envío.", NOT_CONFIGURED: "Servicio no configurado.", RELAY_REJECTED: "El relay no confirmó el envío.",
  PROVIDER_TIMEOUT: "Se agotó el tiempo de espera; no pudo confirmarse el resultado.", PROVIDER_ERROR: "El servicio no completó el intento.",
  E_SENDER_NOT_VERIFIED: "El remitente no está verificado.", E_RECIPIENT_NOT_ALLOWED: "El servicio no permite este destinatario.",
  E_RECIPIENT_SUPPRESSED: "El destinatario está en la lista de supresión por rebotes o reclamaciones.",
  E_RATE_LIMIT_EXCEEDED: "Se alcanzó el límite de frecuencia del servicio.", E_DAILY_LIMIT_EXCEEDED: "Se alcanzó la cuota diaria del servicio.",
  E_DELIVERY_FAILED: "El servicio informó un fallo de entrega.", E_SENDER_DOMAIN_NOT_AVAILABLE: "El dominio remitente no está disponible para enviar.",
  E_VALIDATION_ERROR: "El servicio rechazó los datos del envío.", E_INTERNAL_SERVER_ERROR: "El servicio informó un fallo interno.",
};

export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/correos");
  if (!canViewEmailHistory(admin)) redirect("/admin/acceso-denegado?reason=permission");
  const params = await searchParams;
  const filters = {
    q: (params.q ?? "").trim().slice(0, 120), kind: choice(params.kind, EMAIL_KINDS), status: choice(params.status, EMAIL_STATUSES),
    audience: choice(params.audience, EMAIL_AUDIENCES), provider: choice(params.provider, EMAIL_PROVIDERS),
    period: ["24h", "7d", "30d"].includes(params.period ?? "") ? params.period! : "all", from: validIsoDay(params.from), to: validIsoDay(params.to),
  };
  const conditions: SQL[] = [];
  if (filters.q) { const pattern = `%${filters.q.toLowerCase()}%`; conditions.push(or(like(sql`lower(${emailDeliveryLogs.recipient})`, pattern), like(sql`lower(${emailDeliveryLogs.subject})`, pattern), like(emailDeliveryLogs.id, pattern))!); }
  if (filters.kind) conditions.push(eq(emailDeliveryLogs.kind, filters.kind));
  if (filters.status) conditions.push(eq(emailDeliveryLogs.status, filters.status));
  if (filters.audience) conditions.push(eq(emailDeliveryLogs.audience, filters.audience));
  if (filters.provider) conditions.push(or(eq(emailDeliveryLogs.provider, filters.provider), sql`exists (select 1 from json_each(case when json_valid(${emailDeliveryLogs.attempts}) then ${emailDeliveryLogs.attempts} else '[]' end) as attempt where json_extract(attempt.value, '$.provider') = ${filters.provider})`)!);
  if (filters.from) conditions.push(sql`datetime(${emailDeliveryLogs.createdAt}) >= datetime(${chileDayBoundary(filters.from)})`);
  if (filters.to) conditions.push(sql`datetime(${emailDeliveryLogs.createdAt}) <= datetime(${chileDayBoundary(filters.to, true)})`);
  if (!filters.from && !filters.to && filters.period !== "all") {
    const days = filters.period === "24h" ? 1 : filters.period === "30d" ? 30 : 7;
    conditions.push(sql`datetime(${emailDeliveryLogs.createdAt}) >= datetime(${new Date(Date.now() - days * 86400_000).toISOString()})`);
  }
  const db = await getDb(), where = conditions.length ? and(...conditions) : undefined;
  const [stats] = await db.select({ total: count(), accepted: sql<number>`coalesce(sum(case when ${emailDeliveryLogs.status}='accepted' then 1 else 0 end),0)`, failed: sql<number>`coalesce(sum(case when ${emailDeliveryLogs.status}='failed' then 1 else 0 end),0)`, pending: sql<number>`coalesce(sum(case when ${emailDeliveryLogs.status}='sending' then 1 else 0 end),0)`, skipped: sql<number>`coalesce(sum(case when ${emailDeliveryLogs.status}='skipped' then 1 else 0 end),0)` }).from(emailDeliveryLogs).where(where);
  const total = Number(stats?.total ?? 0), page = Math.min(readAdminPage(params.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const rows = await db.select().from(emailDeliveryLogs).where(where).orderBy(desc(emailDeliveryLogs.createdAt), desc(emailDeliveryLogs.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  return <AdminShell user={admin}><div className="admin-content admin-email-history">
    <AdminPageHeading eyebrow="CORREOS DEL SISTEMA" title="Historial global de correos" description="Todos los intentos de correo transaccional de Chile3X, para usuarios, administradores, propietarios y otros destinatarios. No depende de quién consulte el panel." backHref="/admin" />
    <section className="admin-email-notice"><strong>Registro desde la activación de este historial</strong><p>Los diagnósticos anteriores no incluían destinatarios y no permiten reconstruir los correos antiguos. Se conservan hasta 90 días. “Aceptado” no confirma recepción, lectura ni llegada a la bandeja principal. “En proceso / sin resultado” puede corresponder a un envío interrumpido; no lo reenvíes sin comprobarlo primero.</p><p>No se guardan cuerpos de mensajes, contraseñas ni enlaces de recuperación. Las notificaciones internas del panel no son correos enviados.</p><Link prefetch={false} href="/admin?ops_category=email&ops_period=all">Consultar diagnósticos técnicos anteriores</Link></section>
    <form className="admin-email-filters" method="get">
      <label className="admin-email-search">Buscar destinatario, asunto o ID<input name="q" defaultValue={filters.q} maxLength={120} placeholder="correo@ejemplo.cl o restablecimiento" /></label>
      <label>Tipo de correo<select name="kind" defaultValue={filters.kind}><option value="">Todos los tipos</option>{Object.entries(EMAIL_KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Resultado<select name="status" defaultValue={filters.status}><option value="">Todos los resultados</option>{Object.entries(EMAIL_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Destinatarios<select name="audience" defaultValue={filters.audience}><option value="">Todos los destinatarios</option>{Object.entries(EMAIL_AUDIENCES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Servicio utilizado<select name="provider" defaultValue={filters.provider}><option value="">Todos los servicios</option>{Object.entries(EMAIL_PROVIDERS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Período<select name="period" defaultValue={filters.period}><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="all">Todo el historial conservado</option></select></label>
      <div className="admin-email-date-range"><DateField name="from" label="Desde" defaultValue={filters.from} /><DateField name="to" label="Hasta" defaultValue={filters.to} /></div>
      <small>Una fecha específica reemplaza el período rápido. Fechas y horas de Chile (Santiago). El filtro de servicio incluye también los intentos alternativos fallidos.</small>
      <div><button className="button button-primary" type="submit">Aplicar filtros</button><Link prefetch={false} className="button button-outline" href="/admin/correos">Limpiar</Link></div>
    </form>
    <div className="admin-email-stats">{[["Registros", total], ["Aceptados", Number(stats?.accepted ?? 0)], ["Fallidos", Number(stats?.failed ?? 0)], ["Sin resultado", Number(stats?.pending ?? 0)], ["Omitidos", Number(stats?.skipped ?? 0)]].map(([label, number]) => <div key={label}><span>{label}</span><strong>{number}</strong></div>)}</div>
    <section className="admin-email-list" aria-label="Correos registrados">{rows.map(row => <article key={row.id}>
      <header><div><span>{EMAIL_KINDS[row.kind as keyof typeof EMAIL_KINDS] ?? row.kind}</span><h2>{row.subject || "Sin asunto"}</h2><time dateTime={row.createdAt}>{date(row.createdAt)}</time></div><strong className={`admin-email-status is-${row.status}`}>{EMAIL_STATUSES[row.status]}</strong></header>
      <dl><div><dt>Destinatario</dt><dd>{row.recipient}</dd></div><div><dt>Tipo de destinatario</dt><dd>{EMAIL_AUDIENCES[row.audience]}</dd></div><div><dt>Último servicio</dt><dd>{row.provider ? EMAIL_PROVIDERS[row.provider] : "Sin servicio de envío"}</dd></div><div><dt>Duración total</dt><dd>{row.durationMs === null ? "Sin resultado registrado" : `${(row.durationMs / 1000).toLocaleString("es-CL", { maximumFractionDigits: 2 })} s`}</dd></div></dl>
      {row.detail && <p>{row.detail}</p>}
      <details><summary>Ver intentos y detalle técnico</summary><p>ID: {row.id}</p>{row.finishedAt && <p>Finalizado: {date(row.finishedAt)}</p>}<ol>{parseEmailAttempts(row.attempts).map((attempt, index) => <li key={index}><strong>{EMAIL_PROVIDERS[attempt.provider]} · {attempt.accepted ? "Aceptado" : "No confirmado / fallido"}</strong><span>{errors[attempt.code] ?? (attempt.code.startsWith("HTTP_") ? `El relay respondió con error HTTP ${attempt.code.slice(5)}.` : "El servicio devolvió un error técnico.")} <code>{attempt.code}</code></span>{attempt.messageId && <small>ID del servicio: {attempt.messageId}</small>}</li>)}</ol>{!parseEmailAttempts(row.attempts).length && <p>No hay intentos confirmados con un servicio externo.</p>}</details>
    </article>)}{!rows.length && <p className="admin-media-empty">No hay correos registrados que coincidan con estos filtros.</p>}</section>
    <AdminPagination pathname="/admin/correos" params={query} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label="Correos" />
  </div></AdminShell>;
}
