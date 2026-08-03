import { desc, eq, inArray } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileReportEvidence, profileReports, profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";
const labels: Record<string, string> = { pending: "Pendiente", reviewed: "Revisado", resolved: "Resuelto", dismissed: "Descartado" };
const reasons: Record<string, string> = { impersonation: "Suplantación", inappropriate: "Contenido inapropiado", fraud: "Posible fraude", underage: "Posible menor de edad", wrong_information: "Información incorrecta", other: "Otro" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ estado?: string; notice?: string }> }) {
  const admin = await getCurrentAdmin(); if (!admin) redirect("/api/auth/github/start?return_to=/admin/reportes");
  const query = await searchParams;
  const selected = Object.hasOwn(labels, query.estado ?? "") ? query.estado! : "pending";
  const db = await getDb();
  const rows = await db.select({ report: profileReports, profileName: profiles.displayName, profileSlug: profiles.slug, reporterEmail: users.email })
    .from(profileReports).innerJoin(profiles, eq(profileReports.profileId, profiles.id)).leftJoin(users, eq(profileReports.reporterId, users.id))
    .where(eq(profileReports.status, selected as typeof profileReports.$inferSelect.status)).orderBy(desc(profileReports.createdAt));
  const reportIds = rows.map(({ report }) => report.id);
  const evidence = reportIds.length ? await db.select().from(profileReportEvidence).where(inArray(profileReportEvidence.reportId, reportIds)).orderBy(desc(profileReportEvidence.createdAt)) : [];
  const evidenceByReport = new Map<string, typeof evidence>();
  for (const item of evidence) evidenceByReport.set(item.reportId, [...(evidenceByReport.get(item.reportId) ?? []), item]);

  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="SEGURIDAD Y CONFIANZA" title="Reportes de anuncios" description="Revisa denuncias privadas, consulta sus evidencias, abre el anuncio señalado y documenta la decisión tomada." backHref="/admin" />
    {query.notice === "updated" && <p className="admin-success">El reporte fue actualizado.</p>}
    <nav className="admin-review-tabs">{Object.entries(labels).map(([key, label]) => <Link className={selected === key ? "is-active" : undefined} href={`/admin/reportes?estado=${key}`} key={key}>{label}</Link>)}</nav>
    {rows.length ? <section className="admin-report-list">{rows.map(({ report, profileName, profileSlug, reporterEmail }) => {
      const screenshots = evidenceByReport.get(report.id) ?? [];
      return <article key={report.id}>
        <div><span className="media-status media-status-pending">{reasons[report.reason]}</span><h2>{profileName}</h2><p>{reporterEmail ? `Enviado por ${reporterEmail}` : "Cuenta reportante eliminada"} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p><blockquote>{report.body}</blockquote><Link className="button button-public-preview" href={`/perfil/${profileSlug}`} target="_blank">Abrir anuncio</Link>
          <section className="report-evidence"><div><h3>Evidencias adjuntas</h3><span>{screenshots.length ? `${screenshots.length} pantallazo${screenshots.length === 1 ? "" : "s"} privado${screenshots.length === 1 ? "" : "s"}` : "No se adjuntaron pantallazos"}</span></div>{screenshots.length > 0 && <div className="report-evidence-grid">{screenshots.map((item, index) => <a href={`/api/reportes/${report.id}/evidencias/${item.id}`} target="_blank" rel="noreferrer" key={item.id}><Image src={`/api/reportes/${report.id}/evidencias/${item.id}`} alt={`Evidencia ${index + 1} del reporte de ${profileName}`} width={360} height={240} unoptimized /></a>)}</div>}</section>
        </div>
        <form action={`/api/admin/reportes/${report.id}`} method="post"><label>Nota interna<textarea name="admin_note" maxLength={1000} defaultValue={report.adminNote ?? ""} rows={3} /></label><div><button className="button button-outline" name="status" value="reviewed">Marcar revisado</button><button className="button button-primary" name="status" value="resolved">Resolver</button><button className="button button-outline" name="status" value="dismissed">Descartar</button></div></form>
      </article>;
    })}</section> : <section className="admin-empty"><h2>No hay reportes en este estado</h2><p>Los nuevos reportes aparecerán aquí sin exponerlos públicamente.</p></section>}
  </div></AdminShell>;
}
