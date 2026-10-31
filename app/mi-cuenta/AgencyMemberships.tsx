import { ActionButton, ActionAnchor } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agencyActivityLogs,
  agencyMembers,
  agencyMembershipRequests,
  agencyProfileClaims,
  profiles,
  users,
} from "@/db/schema";
import { inviteableEscortCondition } from "@/lib/agency-management";
import { AGENCY_INVITATION_DAYS } from "@/lib/agency-policy";
import { profilePublicPath } from "@/lib/profile";
import "./agency-management.css";
function Version({ id, revision }: { id: string; revision: number }) {
  return (
    <>
      <input type="hidden" name="review_key" value={`profile:${id}`} />
      <input type="hidden" name="review_revision" value={revision} />
    </>
  );
}
export async function AgencyMemberships({ ownerId }: { ownerId: string }) {
  // This dynamic server component takes one request-time snapshot for expiration.
  // eslint-disable-next-line react-hooks/purity -- Server-only expiry, never a client render clock.
  const now = Date.now();
  const db = await getDb(),
    owned = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.ownerId, ownerId), isNull(profiles.trashedAt))),
    ownedIds = owned.map((p) => p.id),
    agencies = owned.filter((p) => p.type === "agency");
  const [available, requests, memberships, claims] = await Promise.all([
    agencies.length
      ? db
          .select({
            id: profiles.id,
            displayName: profiles.displayName,
            city: profiles.city,
          })
          .from(profiles)
          .where(inviteableEscortCondition)
      : Promise.resolve([]),
    ownedIds.length
      ? db
          .select()
          .from(agencyMembershipRequests)
          .where(
            or(
              inArray(agencyMembershipRequests.agencyProfileId, ownedIds),
              inArray(agencyMembershipRequests.escortProfileId, ownedIds),
            ),
          )
      : Promise.resolve([]),
    ownedIds.length
      ? db
          .select()
          .from(agencyMembers)
          .where(
            or(
              inArray(agencyMembers.agencyProfileId, ownedIds),
              inArray(agencyMembers.memberProfileId, ownedIds),
            ),
          )
      : Promise.resolve([]),
    db
      .select()
      .from(agencyProfileClaims)
      .where(
        or(
          eq(agencyProfileClaims.targetUserId, ownerId),
          eq(agencyProfileClaims.sourceOwnerId, ownerId),
        ),
      )
      .orderBy(desc(agencyProfileClaims.createdAt))
      .limit(100),
  ]);
  const ids = [
    ...new Set([
      ...ownedIds,
      ...requests.flatMap((r) => [r.agencyProfileId, r.escortProfileId]),
      ...memberships.flatMap((m) => [m.agencyProfileId, m.memberProfileId]),
      ...claims.flatMap((c) => [c.agencyProfileId, c.escortProfileId]),
    ]),
  ];
  const relatedRows = ids.length
      ? await db
          .select({ profile: profiles, ownerActive: users.isActive })
          .from(profiles)
          .innerJoin(users, eq(users.id, profiles.ownerId))
          .where(inArray(profiles.id, ids))
      : [],
    related = relatedRows.map((row) => ({
      ...row.profile,
      ownerActive: row.ownerActive,
    })),
    byId = new Map(related.map((p) => [p.id, p]));
  const incoming = requests.filter(
    (r) =>
      r.status === "pending" &&
      !byId.get(r.agencyProfileId)?.trashedAt &&
      byId.get(r.agencyProfileId)?.ownerActive &&
      (r.expiresAt ??
        Date.parse(r.createdAt) + AGENCY_INVITATION_DAYS * 86400000) > now &&
      owned.some((p) => p.id === r.escortProfileId && !p.agencyCustodianId),
  );
  const targetClaims = claims.filter(
    (c) =>
      c.targetUserId === ownerId &&
      ["pending", "accepted"].includes(c.status) &&
      c.expiresAt > now &&
      !byId.get(c.escortProfileId)?.trashedAt &&
      byId.get(c.escortProfileId)?.ownerActive &&
      !byId.get(c.agencyProfileId)?.trashedAt,
  );
  const ownLinks = memberships.filter((m) =>
    owned.some((p) => p.id === m.memberProfileId && !p.agencyCustodianId),
  );
  const history = await db
    .select({
      id: agencyActivityLogs.id,
      summary: agencyActivityLogs.summary,
      createdAt: agencyActivityLogs.createdAt,
      username: users.username,
    })
    .from(agencyActivityLogs)
    .leftJoin(users, eq(users.id, agencyActivityLogs.actorUserId))
    .where(
      or(
        inArray(
          agencyActivityLogs.escortProfileId,
          ownedIds.length ? ownedIds : ["none"],
        ),
        inArray(
          agencyActivityLogs.agencyProfileId,
          agencies.length ? agencies.map((a) => a.id) : ["none"],
        ),
      ),
    )
    .orderBy(desc(agencyActivityLogs.createdAt))
    .limit(20);
  return (
    <section
      id="agencias"
      className="agency-membership-panel agency-workflow-panel"
      aria-labelledby="agency-workflow-title"
    >
      <header>
        <p className="eyebrow">AGENCIAS Y TITULARIDAD</p>
        <h2 id="agency-workflow-title">Tus vínculos y permisos</h2>
        <p>
          Una cuenta puede tener su propio Escort y una o varias agencias. La
          asociación pública y el permiso para editar son cosas distintas. La
          titular puede retirar permisos o salir de una agencia sin perder su
          anuncio.
        </p>
      </header>
      {!incoming.length &&
        !targetClaims.length &&
        !ownLinks.length &&
        !agencies.length && (
          <p className="agency-workflow-card">
            Aquí aparecerán las invitaciones de agencias y las propuestas para
            vincular un anuncio a tu cuenta. Podrás revisar el anuncio, aceptar
            o rechazar y elegir sus permisos.
          </p>
        )}
      {incoming.length > 0 && (
        <section className="agency-workflow-card agency-incoming">
          <h3>Invitaciones para tus anuncios Escort</h3>
          {incoming.map((r) => {
            const p = byId.get(r.escortProfileId);
            if (!p) return null;
            return (
              <article key={r.id}>
                <h4>
                  {byId.get(r.agencyProfileId)?.displayName ?? "Agencia"} invita
                  a {p.displayName}
                </h4>
                {r.message && (
                  <p className="agency-invitation-message">{r.message}</p>
                )}
                <p>
                  {r.managementRequested
                    ? "Solicita editar datos, contactos, categoría, fotos, videos, historias, visibilidad y estadísticas del anuncio. No permite cambiar tu correo, contraseña ni seguridad de cuenta."
                    : "Solicita únicamente mostrar la asociación pública; no podrá editar tu anuncio."}
                </p>
                <p>
                  Vence{" "}
                  {new Date(
                    r.expiresAt ??
                      Date.parse(r.createdAt) +
                        AGENCY_INVITATION_DAYS * 86400000,
                  ).toLocaleDateString("es-CL", {
                    timeZone: "America/Santiago",
                  })}
                  . No exige exclusividad.
                </p>
                <form action={`/api/solicitudes-agencia/${r.id}`} method="post">
                  <Version id={p.id} revision={p.revision} />
                  <input type="hidden" name="action" value="accepted" />
                  {r.managementRequested && (
                    <label className="agency-permission">
                      <input
                        type="checkbox"
                        name="authorize_management"
                        required
                      />
                      Autorizo la gestión de este anuncio. Puedo retirar el
                      permiso desde este panel cuando quiera.
                    </label>
                  )}
                  {r.documentsRequested && (
                    <label className="agency-permission">
                      <input type="checkbox" name="authorize_documents" />
                      También autorizo expresamente consultar, subir, sustituir
                      y retirar mis documentos privados de identidad y médicos.
                      Es opcional y revocable.
                    </label>
                  )}
                  <ActionButton type="submit" className="button button-primary">
                    <ActionIcon name="check" />
                    Aceptar invitación
                  </ActionButton>
                </form>
                <form action={`/api/solicitudes-agencia/${r.id}`} method="post">
                  <Version id={p.id} revision={p.revision} />
                  <input type="hidden" name="action" value="declined" />
                  <ActionButton className="button button-outline" type="submit">
                    Rechazar invitación
                  </ActionButton>
                </form>
              </article>
            );
          })}
        </section>
      )}
      {targetClaims.length > 0 && (
        <section className="agency-workflow-card agency-incoming">
          <h3>Perfiles que proponen vincular a tu cuenta</h3>
          {targetClaims.map((c) => {
            const p = byId.get(c.escortProfileId);
            if (!p) return null;
            return (
              <article key={c.id}>
                <h4>
                  {p.displayName} ·{" "}
                  {byId.get(c.agencyProfileId)?.displayName ?? "Agencia"}
                </h4>
                <p>
                  ID: <code>{p.id}</code>
                </p>
                <p>
                  {c.acceptedAt
                    ? "Aceptación registrada. "
                    : "Revisa el anuncio antes de aceptar. "}
                  {c.verifiedAt
                    ? "Administración ya realizó una comprobación; debe coincidir con la versión que aceptes."
                    : "Falta la comprobación manual de administración."}{" "}
                  La vinculación no se completa si ya tienes otro Escort
                  personal.
                </p>
                <ActionAnchor
                  href={profilePublicPath(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-outline"
                >
                  <ActionIcon name="eye" />
                  Revisar perfil a vincular
                </ActionAnchor>
                <form action={`/api/agencias/traspasos/${c.id}`} method="post">
                  <Version id={p.id} revision={p.revision} />
                  <input
                    type="hidden"
                    name="claim_revision"
                    value={c.revision}
                  />
                  <input type="hidden" name="action" value="accept" />
                  <label className="agency-permission">
                    <input name="confirm_ownership" type="checkbox" required />
                    Confirmo que este anuncio me representa y quiero vincularlo
                    a mi cuenta. Conservaré su ID, enlace, medios, reseñas y
                    estadísticas.
                  </label>
                  <label className="agency-permission">
                    <input name="keep_management" type="checkbox" />
                    Quiero que la agencia siga gestionándolo después de
                    vincularlo. Podré retirar su gestión o desvincularme.
                  </label>
                  <label className="agency-permission">
                    <input name="authorize_documents" type="checkbox" />
                    Si mantengo la gestión, autorizo también acceso a mis
                    documentos privados.
                  </label>
                  <ActionButton type="submit" className="button button-primary">
                    {c.acceptedAt
                      ? "Confirmar la versión actual"
                      : "Aceptar vinculación a mi cuenta"}
                  </ActionButton>
                </form>
                <form action={`/api/agencias/traspasos/${c.id}`} method="post">
                  <Version id={p.id} revision={p.revision} />
                  <input
                    type="hidden"
                    name="claim_revision"
                    value={c.revision}
                  />
                  <input type="hidden" name="action" value="decline" />
                  <ActionButton type="submit" className="button button-outline">
                    Rechazar vinculación
                  </ActionButton>
                </form>
              </article>
            );
          })}
        </section>
      )}
      {ownLinks.length > 0 && (
        <section className="agency-workflow-card">
          <h3>Agencias vinculadas a tus Escorts personales</h3>
          {ownLinks.map((m) => {
            const p = byId.get(m.memberProfileId);
            if (!p) return null;
            return (
              <article key={m.id}>
                <h4>
                  {p.displayName} ·{" "}
                  {byId.get(m.agencyProfileId)?.displayName ?? "Agencia"}
                </h4>
                <p>
                  {m.canManage
                    ? "Gestión autorizada"
                    : "Solo asociación pública"}{" "}
                  ·{" "}
                  {m.documentsAuthorized
                    ? "Documentos autorizados"
                    : "Sin acceso a documentos"}
                </p>
                <details className="agency-invite-details">
                  <summary>Elegir los permisos de esta agencia</summary>
                  <form
                    action={`/api/asociaciones-agencia/${m.id}`}
                    method="post"
                  >
                    <Version id={p.id} revision={p.revision} />
                    <input
                      name="action"
                      type="hidden"
                      value="update_permissions"
                    />
                    <label className="agency-permission">
                      <input
                        type="checkbox"
                        name="can_manage"
                        defaultChecked={m.canManage}
                      />
                      Autorizar gestión de datos, contactos, categoría, fotos,
                      videos, historias, visibilidad, estadísticas y comentarios
                      de este anuncio.
                    </label>
                    <label className="agency-permission">
                      <input
                        type="checkbox"
                        name="documents_authorized"
                        defaultChecked={m.documentsAuthorized}
                      />
                      Autorizar además la consulta y gestión de documentos
                      privados de identidad y médicos. Solo se aplica si
                      mantengo autorizada la gestión.
                    </label>
                    <ActionButton
                      className="button button-primary"
                      type="submit"
                    >
                      Guardar permisos de esta agencia
                    </ActionButton>
                  </form>
                </details>
                <div className="agency-inline-actions">
                  {m.canManage && (
                    <form
                      action={`/api/asociaciones-agencia/${m.id}`}
                      method="post"
                    >
                      <Version id={p.id} revision={p.revision} />
                      <input
                        name="action"
                        type="hidden"
                        value="revoke_management"
                      />
                      <ActionButton
                        type="submit"
                        className="button button-outline"
                      >
                        Retirar gestión
                      </ActionButton>
                    </form>
                  )}
                  {m.documentsAuthorized && (
                    <form
                      action={`/api/asociaciones-agencia/${m.id}`}
                      method="post"
                    >
                      <Version id={p.id} revision={p.revision} />
                      <input
                        name="action"
                        type="hidden"
                        value="revoke_documents"
                      />
                      <ActionButton
                        type="submit"
                        className="button button-outline"
                      >
                        Retirar acceso a documentos
                      </ActionButton>
                    </form>
                  )}
                  <form
                    action={`/api/asociaciones-agencia/${m.id}`}
                    method="post"
                  >
                    <Version id={p.id} revision={p.revision} />
                    <input name="action" type="hidden" value="unlink" />
                    <ActionButton
                      type="submit"
                      className="button button-outline"
                    >
                      Desvincularme de esta agencia
                    </ActionButton>
                  </form>
                </div>
                <p>
                  Al salir conservas tu anuncio. Revisa su WhatsApp y otros
                  contactos si utilizaban datos de la agencia. Si ambos perfiles
                  son de tu misma cuenta, seguirás siendo su titular aunque
                  retires el vínculo.
                </p>
              </article>
            );
          })}
        </section>
      )}
      {agencies.map((agency) => {
        const links = memberships.filter(
            (m) =>
              m.agencyProfileId === agency.id &&
              !byId.get(m.memberProfileId)?.trashedAt,
          ),
          pending = requests.filter(
            (r) =>
              r.agencyProfileId === agency.id &&
              r.status === "pending" &&
              (r.expiresAt ??
                Date.parse(r.createdAt) + AGENCY_INVITATION_DAYS * 86400000) >
                now,
          ),
          options = available.filter(
            (p) =>
              !links.some((m) => m.memberProfileId === p.id) &&
              !pending.some((r) => r.escortProfileId === p.id),
          );
        return (
          <details
            key={agency.id}
            className="agency-workflow-card"
            open={agencies.length === 1}
          >
            <summary>
              <h3 className="agency-summary-title">
                Gestionar {agency.displayName}
              </h3>
            </summary>
            <div className="agency-card-content">
              <ActionAnchor
                href={`/mi-cuenta/nuevo-perfil?agencia=${encodeURIComponent(agency.id)}`}
                className="button button-primary"
              >
                <ActionIcon name="plus" />
                Crear Escort gestionado por esta agencia
              </ActionAnchor>
              <p>
                Recibirá su propio ID y no consumirá el cupo de tu Escort
                personal. Permanecerá ligado a esta agencia mientras no se
                vincule a una cuenta personal. Prepararlo no lo publica; también
                requiere la revisión normal del equipo.
              </p>
              <details className="agency-invite-details">
                <summary>Invitar un Escort que ya tiene cuenta</summary>
                <form
                  action={`/api/agencias/${agency.id}/invitaciones`}
                  method="post"
                  className="agency-invite-form"
                >
                  <Version id={agency.id} revision={agency.revision} />
                  <label>
                    Anuncio Escort publicado y visible
                    <select name="escort_profile_id" required defaultValue="">
                      <option value="" disabled>
                        Seleccionar anuncio
                      </option>
                      {options.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.displayName} · {p.city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mensaje opcional
                    <input
                      name="message"
                      maxLength={240}
                      placeholder="Presenta tu agencia y el motivo de la invitación."
                    />
                  </label>
                  <label className="agency-permission">
                    <input
                      name="management_requested"
                      type="checkbox"
                      defaultChecked
                    />
                    Solicitar gestión completa del anuncio
                  </label>
                  <label className="agency-permission">
                    <input name="documents_requested" type="checkbox" />
                    Solicitar autorización adicional para documentos privados
                  </label>
                  <ActionButton
                    type="submit"
                    className="button button-primary"
                    disabled={!options.length}
                  >
                    Enviar invitación
                  </ActionButton>
                </form>
                {!options.length && (
                  <p>
                    No hay otros Escorts elegibles. Los ya asociados o invitados
                    no aparecen de nuevo; se excluyen ocultos, cuentas inactivas
                    y venta solo de contenido.
                  </p>
                )}
              </details>
              {pending.map((r) => (
                <article className="agency-pending-line" key={r.id}>
                  <p>
                    Invitación pendiente:{" "}
                    {byId.get(r.escortProfileId)?.displayName ?? "Anuncio"}. La
                    persona debe responder desde su cuenta; enviarla nuevamente
                    no habilita permisos.
                  </p>
                  <form
                    action={`/api/agencias/${agency.id}/invitaciones`}
                    method="post"
                  >
                    <Version id={agency.id} revision={agency.revision} />
                    <input name="intent" type="hidden" value="cancel" />
                    <input name="request_id" type="hidden" value={r.id} />
                    <ActionButton
                      type="submit"
                      className="button button-outline"
                    >
                      Cancelar invitación
                    </ActionButton>
                  </form>
                </article>
              ))}
              <h4>Escorts asociados y gestionados</h4>
              {!links.length && <p>Todavía no tienes Escorts asociados.</p>}
              {links.map((m) => {
                const p = byId.get(m.memberProfileId);
                if (!p) return null;
                const custodial = p.agencyCustodianId === agency.id,
                  claim = claims.find(
                    (c) =>
                      c.escortProfileId === p.id &&
                      ["pending", "accepted"].includes(c.status) &&
                      c.expiresAt > now &&
                      !byId.get(c.escortProfileId)?.trashedAt &&
                      byId.get(c.escortProfileId)?.ownerActive &&
                      !byId.get(c.agencyProfileId)?.trashedAt,
                  );
                return (
                  <article key={m.id}>
                    <h4>{p.displayName}</h4>
                    <p>
                      <code>{p.id}</code> ·{" "}
                      {custodial
                        ? "Gestionado por agencia · sin cuenta personal vinculada"
                        : m.canManage
                          ? "Cuenta personal · gestión autorizada"
                          : "Cuenta personal · solo asociación"}
                    </p>
                    <div className="agency-inline-actions">
                      <ActionAnchor
                        href={profilePublicPath(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-outline"
                      >
                        <ActionIcon name="eye" />
                        Ver anuncio
                      </ActionAnchor>
                      {(custodial || m.canManage || p.ownerId === ownerId) && (
                        <ActionAnchor
                          href={`/mi-cuenta/${p.id}/editar`}
                          className="button button-outline"
                        >
                          <ActionIcon name="edit" />
                          Gestionar anuncio
                        </ActionAnchor>
                      )}
                    </div>
                    {custodial ? (
                      <details className="agency-invite-details">
                        <summary>
                          Vincular este perfil a una cuenta existente
                        </summary>
                        <p>
                          La cuenta debe estar activa, tener correo verificado y
                          no tener otro Escort personal. Requiere aceptación y
                          comprobación manual de administración; no cambia su ID
                          ni crea otro anuncio.
                        </p>
                        {claim ? (
                          <div>
                            <p>
                              Propuesta pendiente ·{" "}
                              {claim.acceptedAt
                                ? "aceptada por la cuenta destinataria"
                                : "esperando aceptación"}{" "}
                              ·{" "}
                              {claim.verifiedAt
                                ? "comprobada por administración"
                                : "esperando comprobación administrativa"}
                              . Vence{" "}
                              {new Date(claim.expiresAt).toLocaleDateString(
                                "es-CL",
                                { timeZone: "America/Santiago" },
                              )}
                              .
                            </p>
                            <form
                              action={`/api/agencias/traspasos/${claim.id}`}
                              method="post"
                            >
                              <Version id={p.id} revision={p.revision} />
                              <input
                                name="claim_revision"
                                type="hidden"
                                value={claim.revision}
                              />
                              <input
                                name="action"
                                type="hidden"
                                value="cancel"
                              />
                              <ActionButton
                                type="submit"
                                className="button button-outline"
                              >
                                Cancelar propuesta de vinculación
                              </ActionButton>
                            </form>
                          </div>
                        ) : (
                          <form
                            action={`/api/agencias/${agency.id}/vincular/${p.id}`}
                            method="post"
                          >
                            <Version id={p.id} revision={p.revision} />
                            <label>
                              Correo de la cuenta existente
                              <input
                                name="email"
                                type="email"
                                required
                                autoComplete="off"
                              />
                            </label>
                            <ActionButton
                              type="submit"
                              className="button button-primary"
                            >
                              Proponer vinculación
                            </ActionButton>
                          </form>
                        )}
                      </details>
                    ) : (
                      <div className="agency-inline-actions">
                        {!m.canManage && (
                          <form
                            action={`/api/agencias/${agency.id}/invitaciones`}
                            method="post"
                          >
                            <Version
                              id={agency.id}
                              revision={agency.revision}
                            />
                            <input
                              type="hidden"
                              name="intent"
                              value="permissions"
                            />
                            <input
                              type="hidden"
                              name="escort_profile_id"
                              value={p.id}
                            />
                            <input
                              type="hidden"
                              name="management_requested"
                              value="on"
                            />
                            <ActionButton
                              type="submit"
                              className="button button-outline"
                            >
                              Solicitar gestión completa
                            </ActionButton>
                          </form>
                        )}
                        <form
                          action={`/api/asociaciones-agencia/${m.id}`}
                          method="post"
                        >
                          <Version id={p.id} revision={p.revision} />
                          <input type="hidden" name="action" value="unlink" />
                          <ActionButton
                            type="submit"
                            className="button button-outline"
                          >
                            Quitar asociación
                          </ActionButton>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </details>
        );
      })}
      {history.length > 0 && (
        <details className="agency-workflow-card">
          <summary>Historial de gestión y permisos</summary>
          <ol className="agency-history">
            {history.map((row) => (
              <li key={row.id}>
                <span>
                  {row.username ? `@${row.username}` : "Cuenta registrada"} ·{" "}
                  {new Date(
                    row.createdAt.includes("T")
                      ? row.createdAt
                      : row.createdAt.replace(" ", "T") + "Z",
                  ).toLocaleString("es-CL", { timeZone: "America/Santiago" })}
                </span>
                <p>{row.summary}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
