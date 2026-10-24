import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { desc, eq, inArray } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { getDb } from "@/db";
import { bugReportMessages, bugReports, users } from "@/db/schema";
import { testingBugReportsPath } from "@/lib/admin-testing-policy";

const labels: Record<string, string> = { new: "Nuevos", reviewing: "En revisión", waiting_tester: "Esperando tester", in_progress: "En progreso", resolved: "Resueltos", closed: "Cerrados" };
const statusLabel: Record<string, string> = { new: "Nuevo", reviewing: "En revisión", waiting_tester: "Esperando respuesta", in_progress: "En progreso", resolved: "Resuelto", closed: "Cerrado" };

export async function BugReportsPanel({ estado, notice }: { estado?: string; notice?: string }) {
  const query = { estado, notice };
  const selected = Object.hasOwn(labels, query.estado ?? "") ? query.estado! : "new";
  const db = await getDb();
  const rows = await db.select({ report: bugReports, reporterName: users.displayName, reporterEmail: users.email })
    .from(bugReports).innerJoin(users, eq(bugReports.reporterId, users.id))
    .where(eq(bugReports.status, selected as typeof bugReports.$inferSelect.status)).orderBy(desc(bugReports.updatedAt));
  const reportIds = rows.map((row) => row.report.id);
  const messages = reportIds.length ? await db.select({ message: bugReportMessages, authorName: users.displayName, authorEmail: users.email, authorRole: users.role })
    .from(bugReportMessages).innerJoin(users, eq(bugReportMessages.authorId, users.id)).where(inArray(bugReportMessages.reportId, reportIds)).orderBy(bugReportMessages.createdAt) : [];
  const messagesByReport = new Map<string, typeof messages>();
  for (const message of messages) {
    const thread = messagesByReport.get(message.message.reportId);
    if (thread) thread.push(message);
    else messagesByReport.set(message.message.reportId, [message]);
  }

  return <section className="admin-testing-panel" aria-labelledby="testers-bugs-heading">
    <h2 id="testers-bugs-heading">Reportes de errores</h2>
    <p className="admin-testing-description">Revisa la evidencia, responde a cada tester y lleva el seguimiento hasta su cierre.</p>
    {query.notice === "updated" && <p className="admin-success" role="status">El ticket fue actualizado.</p>}
    <nav className="admin-review-tabs" aria-label="Estado de los reportes">{Object.entries(labels).map(([key, label]) => <Link prefetch={false} className={selected === key ? "is-active" : undefined} aria-current={selected === key ? "page" : undefined} href={testingBugReportsPath(key)} key={key}>{label}</Link>)}</nav>
    {rows.length ? <section className="bug-report-list">{rows.map(({ report, reporterName, reporterEmail }) => <article key={report.id}>
      <header><div><span className={`bug-status is-${report.status}`}>{statusLabel[report.status]}</span><h2>{report.title}</h2><p>Reportado por {reporterName ?? reporterEmail} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p></div><ActionAnchor className="button button-outline" href={report.pageUrl} target="_blank" rel="noreferrer">Abrir página</ActionAnchor></header>
      <div className="bug-context"><div><span>Página</span><strong>{report.pageUrl}</strong>{report.pageTitle && <small>{report.pageTitle}</small>}</div><div><span>Entorno</span><strong>{report.deviceType === "mobile" ? "Móvil" : "Escritorio"} · {report.viewport || "Sin tamaño"}</strong><small>{report.userAgent || "Navegador no informado"}</small></div></div>
      <section className="bug-thread"><article className="bug-message is-reporter"><header><strong>{reporterName ?? reporterEmail}</strong><span>Reporte inicial</span></header><p>{report.description}</p></article>{(messagesByReport.get(report.id) ?? []).map(({ message, authorName, authorEmail, authorRole }) => <article className={`bug-message ${authorRole === "admin" ? "is-admin" : "is-reporter"}`} key={message.id}><header><strong>{authorName ?? authorEmail}</strong><span>{authorRole === "admin" ? "Administrador" : "Tester"} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.createdAt))}</span></header><p>{message.body}</p></article>)}</section>
      <form action={`/api/bugs/${encodeURIComponent(report.id)}`} method="post" className="bug-admin-form"><label>Respuesta para el tester<textarea name="body" maxLength={2000} rows={3} placeholder="Haz una pregunta, explica la corrección o deja una instrucción." /></label><label>Estado<select name="status" defaultValue={report.status}>{Object.entries(statusLabel).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><ActionButton className="button button-primary" type="submit">Guardar actualización</ActionButton></form>
    </article>)}</section> : <section className="admin-empty"><h2>No hay tickets en este estado</h2><p>Los reportes enviados por testers aparecerán aquí de forma privada.</p></section>}
  </section>;
}
