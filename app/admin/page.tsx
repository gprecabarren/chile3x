import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { exclusiveContentMedia, profileMedia, profiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { AdminPageHeading, AdminShell } from "./_components";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin");
  }

  if (!adminHasCapability(admin, "private.view")) {
    if (adminHasCapability(admin, "news.manage")) redirect("/admin/noticias");
    if (adminHasCapability(admin, "reports.manage")) redirect("/admin/reportes");
    if (adminHasCapability(admin, "bugs.manage")) redirect("/admin/bugs");
    redirect("/admin/acceso-denegado?reason=permission");
  }

  const db = await getDb();
  const [[allProfiles], [pendingProfiles], [pausedProfiles], [pendingPublicMedia], [pendingExclusiveMedia]] = await Promise.all([
    db.select({ total: count() }).from(profiles),
    db.select({ total: count() }).from(profiles).where(eq(profiles.status, "pending")),
    db.select({ total: count() }).from(profiles).where(eq(profiles.status, "paused")),
    db.select({ total: count() }).from(profileMedia).where(eq(profileMedia.moderationStatus, "pending")),
    db.select({ total: count() }).from(exclusiveContentMedia).where(eq(exclusiveContentMedia.moderationStatus, "pending")),
  ]);

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
          eyebrow="PANEL DE PROPIETARIO"
          title="Todo bajo control."
          description="Este acceso puede ver y administrar todas las cuentas, sus anuncios asociados y la configuración base del portal."
        />
        <section className="admin-stat-grid" aria-label="Resumen del sitio">
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
        </section>
        {pendingMedia > 0 && <section className="admin-review-alert" role="status">
          <div>
            <p>MEDIOS PENDIENTES</p>
            <h2>{pendingMedia} archivo{pendingMedia === 1 ? " requiere" : "s requieren"} moderación</h2>
            <span>Revisa las galerías públicas y el contenido exclusivo por separado antes de aprobarlos.</span>
          </div>
          <Link prefetch={false} className="button button-primary" href="/admin/medios?estado=pending">Revisar medios</Link>
        </section>}
        <section className="admin-note">
          <span>01</span>
          <div>
            <h2>Administradores identificados y trazables</h2>
            <p>Cada persona autorizada entra con su propio GitHub y conserva una identidad administrativa separada. Aprobaciones, cambios y accesos privados quedan registrados con fecha y hora.</p>
            <Link prefetch={false} className="text-link" href="/admin/actividad">Abrir historial administrativo →</Link>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
