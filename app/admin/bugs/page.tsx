import { desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { bugReportMessages, bugReports, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = { new: "Nuevos", reviewing: "En revisión", waiting_tester: "Esperando tester", in_progress: "En progreso", resolved: "Resueltos", closed: "Cerrados" };
const statusLabel: Record<string, string> = { new: "Nuevo", reviewing: "En revisión", waiting_tester: "Esperando respuesta", in_progress: "En progreso", resolved: "Resuelto", closed: "Cerrado" };

export default async function AdminBugReportsPage({ searchParams }: { searchParams: Promise<{ estado?: string; notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/bugs");
  const query = await searchParams;
  const selected = Object.hasOwn(labels, query.estado ?? "") ? query.estado! : "new";
  const db = await getDb();
  const rows = await db.select({ report: bugReports, reporterName: users.displayName, reporterEmail: users.email })
    .from(bugReports).innerJoin(users, eq(bugReports.reporterId, users.id))
    .where(eq(bugReports.status, selected as typeof bugReports.$inferSelect.status)).orderBy(desc(bugReports.updatedAt));
  const reportIds = rows.map((row) => row.report.id);
  const messages = reportIds.length ? await db.select({ message: bugReportMessages, authorName: users.displayName, authorEmail: users.email, authorRole: users.role })
    .from(bugReportMessages).innerJoin(users, eq(bugReportMessages.authorId, users.id)).where(inArray(bugReportMessages.reportId, reportIds)).orderBy(bugReportMessages.createdAt) : [];
  const messagesByReport = new Map<string, typeof messages>();
  for (const message of messages) messagesByReport.set(message.message.reportId, [...(messagesByReport.get(message.message.reportId) ?? []), message]);

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="CONTROL DE CALIDAD" title="Reportes de testers" description="Revisa errores reportados desde móvil y escritorio, conversa con cada tester y lleva el seguimiento hasta su cierre." backHref="/admin" />
    {query.notice === "updated" && <p className="admin-success" role="status">El ticket fue actualizado.</p>}
    <nav className="admin-review-tabs">{Object.entries(labels).map(([key, label]) => <Link className={selected === key ? "is-active" : undefined} href={`/admin/bugs?estado=${key}`} key={key}>{label}</Link>)}</nav>
    {rows.length ? <section className="bug-report-list">{rows.map(({ report, reporterName, reporterEmail }) => <article key={report.id}>
      <header><div><span className={`bug-status is-${report.status}`}>{statusLabel[report.status]}</span><h2>{report.title}</h2><p>Reportado por {reporterName ?? reporterEmail} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p></div><a className="button button-outline" href={report.pageUrl} target="_blank" rel="noreferrer">Abrir página</a></header>
      <div className="bug-context"><div><span>Página</span><strong>{report.pageUrl}</strong>{report.pageTitle && <small>{report.pageTitle}</small>}</div><div><span>Entorno</span><strong>{report.deviceType === "mobile" ? "Móvil" : "Escritorio"} · {report.viewport || "Sin tamaño"}</strong><small>{report.userAgent || "Navegador no informado"}</small></div></div>
      <section className="bug-thread"><article className="bug-message is-reporter"><header><strong>{reporterName ?? reporterEmail}</strong><span>Reporte inicial</span></header><p>{report.description}</p></article>{(messagesByReport.get(report.id) ?? []).map(({ message, authorName, authorEmail, authorRole }) => <article className={`bug-message ${authorRole === "admin" ? "is-admin" : "is-reporter"}`} key={message.id}><header><strong>{authorName ?? authorEmail}</strong><span>{authorRole === "admin" ? "Administrador" : "Tester"} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.createdAt))}</span></header><p>{message.body}</p></article>)}</section>
      <form action={`/api/bugs/${encodeURIComponent(report.id)}`} method="post" className="bug-admin-form"><label>Respuesta para el tester<textarea name="body" maxLength={2000} rows={3} placeholder="Haz una pregunta, explica la corrección o deja una instrucción." /></label><label>Estado<select name="status" defaultValue={report.status}>{Object.entries(statusLabel).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><button className="button button-primary" type="submit">Guardar actualización</button></form>
    </article>)}</section> : <section className="admin-empty"><h2>No hay tickets en este estado</h2><p>Los reportes enviados por testers aparecerán aquí de forma privada.</p></section>}
  </div></AdminShell>;
}
