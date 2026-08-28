import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { exclusiveContentMedia, profileMedia, profiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "./_components";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin");
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
    ["Anuncios registrados", allProfiles?.total ?? 0, "Incluye borradores, anuncios en revisión y publicados."],
    ["Pendientes de revisión", pendingProfiles?.total ?? 0, "Revisa identidad fuera del sitio y aprueba solo material moderado."],
    ["Archivos pendientes", pendingMedia, "Incluye fotos, videos y contenido exclusivo que aún requieren moderación."],
    ["Pausados", pausedProfiles?.total ?? 0, "Los períodos de publicación se administran manualmente por ahora."],
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
          {summary.map(([label, value, hint]) => (
            <article className="admin-stat" key={label as string}>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{hint}</p>
            </article>
          ))}
        </section>
        {pendingMedia > 0 && <section className="admin-review-alert" role="status">
          <div>
            <p>MEDIOS PENDIENTES</p>
            <h2>{pendingMedia} archivo{pendingMedia === 1 ? " requiere" : "s requieren"} moderación</h2>
            <span>Revisa las galerías públicas y el contenido exclusivo por separado antes de aprobarlos.</span>
          </div>
          <Link className="button button-primary" href="/admin/medios?estado=pending">Revisar medios</Link>
        </section>}
        <section className="admin-note">
          <span>01</span>
          <div>
            <h2>El primer propietario está registrado</h2>
            <p>El acceso se concede únicamente a correos marcados como administradores y verificados por GitHub. Cuando agreguemos otro dueño, se crea su registro antes de darle entrada.</p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
