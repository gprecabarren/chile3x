import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { listingPeriods, profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "./_components";
import { AgencyMemberships } from "./AgencyMemberships";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  approved: "Publicado",
  draft: "Borrador",
  expired: "Vencido",
  paused: "Pausado",
  pending: "En revisión",
  rejected: "Requiere cambios",
};

const messages: Record<string, string> = {
  welcome: "Tu cuenta está lista. Puedes comenzar un perfil cuando quieras.",
  saved: "El borrador fue guardado.",
  submitted: "Tu perfil fue enviado a revisión manual.",
  paused: "El perfil quedó pausado.",
  resumed: "La reactivación fue enviada a revisión.",
  closed: "La creación de perfiles está cerrada temporalmente.",
  invite_sent: "La invitación fue enviada. La escort debe aceptarla para que la asociación sea pública.",
  invite_accepted: "La asociación fue aceptada y ya puede mostrarse públicamente.",
  invite_declined: "La invitación fue rechazada.",
  membership_removed: "La asociación fue retirada.",
  invite_error: "No se pudo procesar la invitación o asociación.",
  error: "No fue posible completar esa acción. Revisa el estado del perfil.",
};

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/ingresar?return_to=/mi-cuenta");
  }

  const db = await getDb();
  const rows = await db.select({
    id: profiles.id,
    displayName: profiles.displayName,
    type: profiles.type,
    status: profiles.status,
    city: profiles.city,
    region: profiles.region,
    updatedAt: profiles.updatedAt,
    pauseCount: listingPeriods.pauseCount,
    periodStatus: listingPeriods.status,
  }).from(profiles)
    .leftJoin(listingPeriods, eq(listingPeriods.profileId, profiles.id))
    .where(eq(profiles.ownerId, user.id))
    .orderBy(desc(profiles.updatedAt));
  const params = await searchParams;

  return (
    <AccountShell user={user}>
      <div className="account-content">
        <AccountHeading
          eyebrow="PANEL DE ANUNCIANTE"
          title="Tus perfiles"
          description="Guarda borradores, actualiza la información y envía cada aviso a revisión manual antes de publicarlo."
        >
          <Link className="button button-primary" href="/mi-cuenta/nuevo-perfil">Crear perfil</Link>
        </AccountHeading>
        {params.notice && <p className="account-success" role="status">{messages[params.notice] ?? messages.error}</p>}
        {rows.length === 0 ? (
          <section className="account-empty">
            <h2>Aún no tienes perfiles</h2>
            <p>Puedes crear un aviso de tipo escort, agencia o arriendo. Primero quedará como borrador y tú decides cuándo enviarlo a revisión.</p>
            <Link className="button button-primary" href="/mi-cuenta/nuevo-perfil">Crear mi primer perfil</Link>
          </section>
        ) : (
          <div className="owner-profile-list">
            {rows.map((profile) => (
              <article className="owner-profile-card" key={profile.id}>
                <div>
                  <span className={`account-status account-status-${profile.status}`}>{statusLabel[profile.status]}</span>
                  <h2>{profile.displayName}</h2>
                  <p>{profile.type} · {profile.city}, {profile.region}</p>
                </div>
                <div className="owner-profile-actions">
                  <Link className="button button-outline" href={`/mi-cuenta/${profile.id}/editar`}>Editar</Link>
                  {(profile.status === "draft" || profile.status === "rejected") && (
                    <form action={`/api/perfiles/${profile.id}/enviar-revision`} method="post"><button className="button button-primary" type="submit">Enviar a revisión</button></form>
                  )}
                  {profile.status === "approved" && profile.periodStatus === "active" && (
                    <form action={`/api/perfiles/${profile.id}/pausa`} method="post"><input type="hidden" name="action" value="pause" /><button className="button button-outline" type="submit">Pausar ({profile.pauseCount ?? 0}/2)</button></form>
                  )}
                  {profile.status === "paused" && profile.periodStatus === "paused" && (
                    <form action={`/api/perfiles/${profile.id}/pausa`} method="post"><input type="hidden" name="action" value="resume" /><button className="button button-primary" type="submit">Solicitar reactivación</button></form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <AgencyMemberships ownerId={user.id} />
      </div>
    </AccountShell>
  );
}
