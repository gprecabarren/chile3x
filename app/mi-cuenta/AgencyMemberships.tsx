import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { agencyMembers, agencyMembershipRequests, profiles } from "@/db/schema";

type AgencyMembershipsProps = { ownerId: string };

export async function AgencyMemberships({ ownerId }: AgencyMembershipsProps) {
  const db = await getDb();
  const ownedProfiles = await db.select().from(profiles).where(eq(profiles.ownerId, ownerId));
  const agencyProfiles = ownedProfiles.filter((profile) => profile.type === "agency");
  const escortProfiles = ownedProfiles.filter((profile) => profile.type === "escort");
  const ownedIds = ownedProfiles.map((profile) => profile.id);
  if (!ownedIds.length) return null;

  const [availableEscorts, requests, memberships] = await Promise.all([
    agencyProfiles.length ? db.select({ id: profiles.id, displayName: profiles.displayName, city: profiles.city }).from(profiles).where(and(eq(profiles.type, "escort"), eq(profiles.status, "approved"))) : Promise.resolve([]),
    db.select().from(agencyMembershipRequests).where(or(inArray(agencyMembershipRequests.agencyProfileId, ownedIds), inArray(agencyMembershipRequests.escortProfileId, ownedIds))),
    db.select().from(agencyMembers).where(or(inArray(agencyMembers.agencyProfileId, ownedIds), inArray(agencyMembers.memberProfileId, ownedIds))),
  ]);
  const relatedIds = [...new Set([
    ...requests.flatMap((request) => [request.agencyProfileId, request.escortProfileId]),
    ...memberships.flatMap((membership) => [membership.agencyProfileId, membership.memberProfileId]),
  ])];
  const relatedProfiles = relatedIds.length ? await db.select({ id: profiles.id, displayName: profiles.displayName, city: profiles.city }).from(profiles).where(inArray(profiles.id, relatedIds)) : [];
  const nameById = new Map(relatedProfiles.map((profile) => [profile.id, profile]));
  const incoming = requests.filter((request) => escortProfiles.some((profile) => profile.id === request.escortProfileId) && request.status === "pending");
  const outgoing = requests.filter((request) => agencyProfiles.some((profile) => profile.id === request.agencyProfileId) && request.status === "pending");

  return (
    <section className="agency-membership-panel">
      <div><p className="eyebrow">ASOCIACIONES DE AGENCIA</p><h2>Las escorts siempre deciden</h2><p>Una invitación no publica una relación: la escort debe aceptarla desde su propia cuenta antes de aparecer bajo una agencia.</p></div>
      {agencyProfiles.map((agency) => {
        const agencyMembers = memberships.filter((membership) => membership.agencyProfileId === agency.id);
        const inviteOptions = availableEscorts.filter((escort) => escort.id !== agency.id && !agencyMembers.some((member) => member.memberProfileId === escort.id));
        return <article className="agency-management-card" key={agency.id}>
          <h3>{agency.displayName}</h3>
          <form action={`/api/agencias/${agency.id}/invitaciones`} method="post" className="agency-invite-form">
            <label>Invitar una escort aprobada<select name="escort_profile_id" required defaultValue=""><option value="" disabled>Seleccionar anuncio</option>{inviteOptions.map((escort) => <option key={escort.id} value={escort.id}>{escort.displayName} · {escort.city}</option>)}</select></label>
            <label>Mensaje opcional<input name="message" maxLength={240} placeholder="Ej. Te invitamos a aparecer en nuestra agencia." /></label>
            <button className="button button-primary" type="submit" disabled={!inviteOptions.length}>Enviar invitación</button>
          </form>
          <div className="membership-list"><strong>Anuncios asociados</strong>{agencyMembers.length ? agencyMembers.map((membership) => <div key={membership.id}><span>{nameById.get(membership.memberProfileId)?.displayName ?? "Anuncio"}</span><form action={`/api/asociaciones-agencia/${membership.id}`} method="post"><button type="submit">Quitar asociación</button></form></div>) : <p>Aún no hay anuncios de escort que hayan aceptado una invitación.</p>}</div>
        </article>;
      })}
      {incoming.length > 0 && <div className="membership-incoming"><h3>Invitaciones que requieren tu aprobación</h3>{incoming.map((request) => <article key={request.id}><div><strong>{nameById.get(request.agencyProfileId)?.displayName ?? "Agencia"}</strong><span>invita a {nameById.get(request.escortProfileId)?.displayName ?? "tu anuncio"}</span>{request.message && <p>{request.message}</p>}</div><div><form action={`/api/solicitudes-agencia/${request.id}`} method="post"><input type="hidden" name="action" value="accepted" /><button className="button button-primary" type="submit">Aceptar</button></form><form action={`/api/solicitudes-agencia/${request.id}`} method="post"><input type="hidden" name="action" value="declined" /><button className="button button-outline" type="submit">Rechazar</button></form></div></article>)}</div>}
      {outgoing.length > 0 && <div className="membership-outgoing"><h3>Invitaciones enviadas</h3>{outgoing.map((request) => <p key={request.id}>Esperando la aprobación de <strong>{nameById.get(request.escortProfileId)?.displayName ?? "la escort"}</strong> para {nameById.get(request.agencyProfileId)?.displayName ?? "la agencia"}.</p>)}</div>}
    </section>
  );
}
