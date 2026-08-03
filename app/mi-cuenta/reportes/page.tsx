import { desc, eq, inArray } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileReportEvidence, profileReports, profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pending: "En revisión",
  reviewed: "Revisado",
  resolved: "Resuelto",
  dismissed: "Cerrado",
};

const reasonLabels: Record<string, string> = {
  impersonation: "Suplantación de identidad",
  inappropriate: "Contenido que incumple las reglas",
  fraud: "Posible fraude",
  underage: "Posible persona menor de edad",
  wrong_information: "Información incorrecta",
  other: "Otro motivo",
};

export default async function MyReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/reportes");
  const db = await getDb();
  const rows = await db.select({ report: profileReports, profileName: profiles.displayName, profileSlug: profiles.slug, city: profiles.city })
    .from(profileReports)
    .innerJoin(profiles, eq(profileReports.profileId, profiles.id))
    .where(eq(profileReports.reporterId, user.id))
    .orderBy(desc(profileReports.createdAt));
  const reportIds = rows.map(({ report }) => report.id);
  const evidence = reportIds.length ? await db.select().from(profileReportEvidence).where(inArray(profileReportEvidence.reportId, reportIds)).orderBy(desc(profileReportEvidence.createdAt)) : [];
  const evidenceByReport = new Map<string, typeof evidence>();
  for (const item of evidence) evidenceByReport.set(item.reportId, [...(evidenceByReport.get(item.reportId) ?? []), item]);

  return <AccountShell user={user}><div className="account-content"><Link className="page-back-link" href="/mi-cuenta">← Volver a mi cuenta</Link><AccountHeading eyebrow="SEGURIDAD Y CONFIANZA" title="Mis reportes" description="Revisa los reportes que enviaste, su estado y los pantallazos privados que adjuntaste." />
    {rows.length ? <section className="account-report-list">{rows.map(({ report, profileName, profileSlug, city }) => {
      const screenshots = evidenceByReport.get(report.id) ?? [];
      return <article key={report.id}>
        <header><div><span className={`account-report-status is-${report.status}`}>{statusLabels[report.status]}</span><h2>{profileName}</h2><p>{city} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p></div><Link href={`/perfil/${profileSlug}`}>Abrir anuncio</Link></header>
        <dl><div><dt>Motivo</dt><dd>{reasonLabels[report.reason]}</dd></div><div><dt>Estado</dt><dd>{report.status === "pending" ? "Nuestro equipo aún no revisa este reporte." : "El reporte fue actualizado por el equipo de Chile3X."}</dd></div></dl>
        <blockquote>{report.body}</blockquote>
        <section className="account-report-evidence"><div><h3>Pantallazos adjuntos</h3><span>{screenshots.length ? `${screenshots.length} evidencia${screenshots.length === 1 ? "" : "s"} privada${screenshots.length === 1 ? "" : "s"}` : "No adjuntaste evidencias"}</span></div>{screenshots.length > 0 && <div className="account-report-evidence-grid">{screenshots.map((item, index) => <a href={`/api/reportes/${report.id}/evidencias/${item.id}`} target="_blank" rel="noreferrer" key={item.id}><Image src={`/api/reportes/${report.id}/evidencias/${item.id}`} alt={`Evidencia ${index + 1} del reporte`} width={360} height={240} unoptimized /></a>)}</div>}</section>
      </article>;
    })}</section> : <section className="account-empty"><h2>Aún no has enviado reportes</h2><p>Si detectas un anuncio que incumple las reglas, inicia sesión y repórtalo desde el perfil. Tus reportes y evidencias serán privados.</p><Link className="button button-primary" href="/escorts">Ver escorts</Link></section>}
  </div></AccountShell>;
}
