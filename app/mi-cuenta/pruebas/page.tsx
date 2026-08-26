import { desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { bugReportMessages, bugReports, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { new: "Nuevo", reviewing: "En revisión", waiting_tester: "Esperando tu respuesta", in_progress: "En progreso", resolved: "Resuelto", closed: "Cerrado" };

export default async function TesterReportsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/pruebas");
  if (user.role !== "tester") redirect("/mi-cuenta");
  const db = await getDb();
  const rows = await db.select().from(bugReports).where(eq(bugReports.reporterId, user.id)).orderBy(desc(bugReports.updatedAt));
  const reportIds = rows.map((report) => report.id);
  const messages = reportIds.length ? await db.select({ message: bugReportMessages, authorName: users.displayName, authorEmail: users.email, authorRole: users.role })
    .from(bugReportMessages).innerJoin(users, eq(bugReportMessages.authorId, users.id)).where(inArray(bugReportMessages.reportId, reportIds)).orderBy(bugReportMessages.createdAt) : [];
  const messagesByReport = new Map<string, typeof messages>();
  for (const message of messages) messagesByReport.set(message.message.reportId, [...(messagesByReport.get(message.message.reportId) ?? []), message]);
  const query = await searchParams;

  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="ÁREA PRIVADA DE PRUEBAS" title="Mis reportes de bugs" description="Aquí puedes revisar cada problema enviado, responder al administrador y confirmar cuándo una corrección funciona." backHref="/mi-cuenta" />
    {query.notice === "updated" && <p className="account-success" role="status">Tu respuesta fue enviada al administrador.</p>}{query.notice === "reply_invalid" && <p className="account-error" role="alert">Escribe una respuesta de al menos 2 caracteres.</p>}
    {rows.length ? <section className="bug-report-list tester-bug-report-list">{rows.map((report) => <article key={report.id}>
      <header><div><span className={`bug-status is-${report.status}`}>{statusLabel[report.status]}</span><h2>{report.title}</h2><p>{report.pageUrl} · {report.deviceType === "mobile" ? "Móvil" : "Escritorio"} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p></div><Link className="button button-outline" href={report.pageUrl}>Abrir página</Link></header>
      <section className="bug-thread"><article className="bug-message is-reporter"><header><strong>Tú</strong><span>Reporte inicial</span></header><p>{report.description}</p></article>{(messagesByReport.get(report.id) ?? []).map(({ message, authorName, authorEmail, authorRole }) => <article className={`bug-message ${authorRole === "admin" ? "is-admin" : "is-reporter"}`} key={message.id}><header><strong>{authorRole === "admin" ? "Administrador" : authorName ?? authorEmail}</strong><span>{new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.createdAt))}</span></header><p>{message.body}</p></article>)}</section>
      {report.status !== "closed" && <form action={`/api/bugs/${encodeURIComponent(report.id)}`} method="post" className="bug-reply-form"><label>Responder al administrador<textarea name="body" required minLength={2} maxLength={2000} rows={3} placeholder={report.status === "resolved" ? "Confirma si el problema quedó resuelto o explica qué sigue ocurriendo." : "Añade información, pasos o responde la pregunta."} /></label><button className="button button-primary" type="submit">Enviar respuesta</button></form>}
    </article>)}</section> : <section className="account-empty"><h2>Aún no has reportado problemas</h2><p>Usa el botón flotante “Reportar bug” mientras navegas. Adjuntará automáticamente la página y el entorno de prueba.</p><Link className="button button-primary" href="/">Ir al sitio</Link></section>}
  </div></AccountShell>;
}
