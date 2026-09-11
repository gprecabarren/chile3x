import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { exclusiveContentMedia, profileMedia, profiles } from "@/db/schema";
import { getCurrentAdmin, getSessionCookieName } from "@/lib/auth";
import { ADMIN_ACCESS_LABELS, adminHasCapability } from "@/lib/admin-permissions";
import { getAccountSessions } from "@/lib/session-management";
import { getOperationalDashboard, readOperationalFilters } from "@/lib/operations";
import { SessionManager } from "@/app/SessionManager";
import { AdminPageHeading, AdminShell } from "./_components";
import { OperationalPanel } from "./OperationalPanel";

export const dynamic = "force-dynamic";

type AdminHomeParams = {
  session_notice?: string;
  ops_notice?: string;
  ops_period?: string;
  ops_category?: string;
  ops_status?: string;
};

export default async function AdminHome({ searchParams }: { searchParams: Promise<AdminHomeParams> }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin");
  }

  const params = await searchParams;
  const canViewSummary = adminHasCapability(admin, "private.view");
  const canViewOperations = adminHasCapability(admin, "settings.manage");
  const filters = readOperationalFilters(params);
  const statsPromise = canViewSummary ? (async () => {
    const db = await getDb();
    return Promise.all([
      db.select({ total: count() }).from(profiles),
      db.select({ total: count() }).from(profiles).where(eq(profiles.status, "pending")),
      db.select({ total: count() }).from(profiles).where(eq(profiles.status, "paused")),
      db.select({ total: count() }).from(profileMedia).where(eq(profileMedia.moderationStatus, "pending")),
      db.select({ total: count() }).from(exclusiveContentMedia).where(eq(exclusiveContentMedia.moderationStatus, "pending")),
    ]);
  })() : Promise.resolve([[], [], [], [], []] as { total: number }[][]);
  const [sessions, stats, operational] = await Promise.all([
    getAccountSessions(admin.id, getSessionCookieName()),
    statsPromise,
    canViewOperations ? getOperationalDashboard(filters) : Promise.resolve(null),
  ]);
  const [[allProfiles], [pendingProfiles], [pausedProfiles], [pendingPublicMedia], [pendingExclusiveMedia]] = stats;

  const pendingMedia = Number(pendingPublicMedia?.total ?? 0) + Number(pendingExclusiveMedia?.total ?? 0);

  const summary = [
    {
      label: "Anuncios registrados",
      value: allProfiles?.total ?? 0,
      hint: "Incluye borradores, anuncios en revisión y publicados.",
      href: "/admin/perfiles",
      action: "Ver todos los anuncios",
    },
    {
      label: "Pendientes de revisión",
      value: pendingProfiles?.total ?? 0,
      hint: "Revisa identidad fuera del sitio y aprueba solo material moderado.",
      href: "/admin/perfiles?estado=pending",
      action: "Revisar pendientes",
    },
    {
      label: "Archivos pendientes",
      value: pendingMedia,
      hint: "Incluye fotos, videos y contenido exclusivo que aún requieren moderación.",
      href: "/admin/medios?estado=pending",
      action: "Revisar archivos",
    },
    {
      label: "Pausados",
      value: pausedProfiles?.total ?? 0,
      hint: "Los períodos de publicación se administran manualmente por ahora.",
      href: "/admin/perfiles?estado=paused",
      action: "Ver anuncios pausados",
    },
  ];

  return (
    <AdminShell user={admin}>
      <div className="admin-content">
        <AdminPageHeading
          eyebrow={`PANEL DE ${ADMIN_ACCESS_LABELS[admin.accessLevel].toLocaleUpperCase("es-CL")}`}
          title="Resumen de administración"
          description={canViewSummary ? "Consulta las prioridades del portal y administra tu acceso desde un único resumen." : "Consulta las herramientas disponibles para tu función y administra tus sesiones activas."}
        />
        {canViewSummary && <section className="admin-stat-grid" aria-label="Resumen del sitio">
          {summary.map((item) => (
            <Link
              className="admin-stat-link"
              href={item.href}
              prefetch={false}
              key={item.label}
              aria-label={`${item.action}: ${item.value}`}
            >
              <article className="admin-stat">
                <span className="admin-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.hint}</p>
                <span className="admin-stat-action">{item.action}<b aria-hidden="true">→</b></span>
              </article>
            </Link>
          ))}
        </section>}
        {canViewSummary && pendingMedia > 0 && <section className="admin-review-alert" role="status">
          <div>
            <p>MEDIOS PENDIENTES</p>
            <h2>{pendingMedia} archivo{pendingMedia === 1 ? " requiere" : "s requieren"} moderación</h2>
            <span>Revisa las galerías públicas y el contenido exclusivo por separado antes de aprobarlos.</span>
          </div>
          <Link prefetch={false} className="button button-primary" href="/admin/medios?estado=pending">Revisar medios</Link>
        </section>}
        {!canViewSummary && <section className="admin-role-shortcuts" aria-label="Herramientas disponibles">
          <h2>Herramientas disponibles</h2>
          <div>
            {adminHasCapability(admin, "news.manage") && <Link href="/admin/noticias" prefetch={false}>Administrar noticias <b>→</b></Link>}
            {adminHasCapability(admin, "reports.manage") && <Link href="/admin/reportes" prefetch={false}>Atender reportes <b>→</b></Link>}
            {adminHasCapability(admin, "bugs.manage") && <Link href="/admin/bugs" prefetch={false}>Revisar pruebas <b>→</b></Link>}
            {adminHasCapability(admin, "telegram.view") && <Link href="/admin/telegram" prefetch={false}>Gestionar Telegram <b>→</b></Link>}
          </div>
        </section>}
        {canViewSummary && adminHasCapability(admin, "telegram.view") && <section className="admin-role-shortcuts" aria-label="Comunidad y novedades">
          <h2>Comunidad y novedades</h2>
          <div><Link href="/admin/telegram" prefetch={false}>Abrir administración de Telegram <b>→</b></Link></div>
        </section>}
        {adminHasCapability(admin, "audit.view") && <section className="admin-note">
          <span>01</span>
          <div>
            <h2>Administradores identificados y trazables</h2>
            <p>Cada persona autorizada entra con su propio GitHub y conserva una identidad administrativa separada. Aprobaciones, cambios y accesos privados quedan registrados con fecha y hora.</p>
            <Link prefetch={false} className="text-link" href="/admin/actividad">Abrir historial administrativo →</Link>
          </div>
        </section>}
        <SessionManager
          sessions={sessions}
          action="/api/admin/sesiones"
          currentLogoutAction="/api/auth/logout"
          eyebrow="SEGURIDAD DE ACCESO"
          title="Sesiones y dispositivos"
          description="Revisa desde dónde está abierta esta identidad administrativa y cierra cualquier acceso que no reconozcas."
          notice={params.session_notice === "closed" ? <p className="admin-success" role="status">La sesión seleccionada fue cerrada.</p> : undefined}
        />
        {operational && <OperationalPanel dashboard={operational} filters={filters} notice={params.ops_notice} />}
      </div>
    </AdminShell>
  );
}
