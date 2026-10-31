import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  agencyActivityLogs,
  agencyEmailJobs,
  agencyMembers,
  agencyMembershipRequests,
  agencyProfileClaims,
  collaborationGuards,
  exclusiveContentCollections,
  profiles,
  users,
} from "@/db/schema";
import { expectedVersion, guardedBatch } from "@/lib/collaboration";
import { publicProfileCondition } from "@/lib/public-profile-visibility";
import {
  AGENCY_INVITATION_DAYS,
  AGENCY_CONSENT_VERSION,
} from "@/lib/agency-policy";
import type { ProfileAccess } from "@/lib/profile-access";
import type { AccountUser, AdminUser } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";

export class AgencyError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
const lifetime = AGENCY_INVITATION_DAYS * 86_400_000;
export const realEscortCondition = sql`not exists(select 1 from profile_details d where d.profile_id=${profiles.id} and json_valid(d.metadata) and coalesce(json_extract(d.metadata,'$.content_only'),'0')='1')`;
export const inviteableEscortCondition = and(
  eq(profiles.type, "escort"),
  publicProfileCondition,
  isNull(profiles.agencyCustodianId),
  realEscortCondition,
)!;
type Db = Awaited<ReturnType<typeof getDb>>;
export function agencyActivity(
  db: Db,
  actorId: string,
  agencyId: string | null,
  escortId: string | null,
  action: string,
  summary: string,
) {
  return db.insert(agencyActivityLogs).values({
    id: `aal_${crypto.randomUUID()}`,
    actorUserId: actorId,
    agencyProfileId: agencyId,
    escortProfileId: escortId,
    action,
    summary,
  });
}
export function profileManagementActivity(
  db: Db,
  access: ProfileAccess,
  action: string,
  summary: string,
) {
  return agencyActivity(
    db,
    access.actorId,
    access.agencyId,
    access.profile.id,
    action,
    summary,
  );
}
function emailJob(
  db: Db,
  id: string,
  recipientId: string,
  agencyId: string,
  escortId: string,
  kind: string,
) {
  return db
    .insert(agencyEmailJobs)
    .values({
      id,
      recipientId,
      agencyProfileId: agencyId,
      escortProfileId: escortId,
      kind,
    })
    .onConflictDoNothing();
}
export async function ownedAgency(actorId: string, agencyId: string) {
  const [agency] = await (
    await getDb()
  )
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, agencyId),
        eq(profiles.ownerId, actorId),
        eq(profiles.type, "agency"),
        isNull(profiles.trashedAt),
      ),
    )
    .limit(1);
  if (!agency)
    throw new AgencyError(
      "La agencia no está disponible o no pertenece a tu cuenta.",
      403,
    );
  return agency;
}
export async function inviteEscort(
  user: AccountUser,
  agencyId: string,
  form: FormData,
) {
  const agency = await ownedAgency(user.id, agencyId),
    db = await getDb(),
    escortId = String(form.get("escort_profile_id") ?? "");
  const [escort] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, escortId), inviteableEscortCondition))
    .limit(1);
  if (!escort)
    throw new AgencyError(
      "Elige un Escort publicado y visible de una cuenta activa. Venta solo de contenido no admite asociación de agencia.",
    );
  const [member] = await db
    .select()
    .from(agencyMembers)
    .where(
      and(
        eq(agencyMembers.agencyProfileId, agencyId),
        eq(agencyMembers.memberProfileId, escortId),
      ),
    )
    .limit(1);
  const management = form.get("management_requested") === "on",
    documents = management && form.get("documents_requested") === "on";
  if (
    member &&
    (form.get("intent") !== "permissions" || member.canManage || !management)
  )
    throw new AgencyError(
      "Este anuncio ya está asociado a tu agencia. Puedes consultar su vínculo y sus permisos actuales.",
    );
  const [previous] = await db
    .select()
    .from(agencyMembershipRequests)
    .where(
      and(
        eq(agencyMembershipRequests.agencyProfileId, agencyId),
        eq(agencyMembershipRequests.escortProfileId, escortId),
      ),
    )
    .limit(1);
  if (
    previous?.status === "pending" &&
    (previous.expiresAt ?? Date.parse(previous.createdAt) + lifetime) >
      Date.now()
  )
    throw new AgencyError(
      "Ya hay una invitación pendiente para este anuncio. No se envió otro correo.",
    );
  if (
    previous &&
    previous.status !== "accepted" &&
    previous.respondedAt &&
    Date.parse(previous.respondedAt) > Date.now() - 86_400_000
  )
    throw new AgencyError(
      "Espera 24 horas antes de volver a invitar a este anuncio.",
    );
  const id = previous?.id ?? `amr_${crypto.randomUUID()}`,
    expiresAt = Date.now() + lifetime,
    guard = crypto.randomUUID();
  await guardedBatch(
    expectedVersion(form, `profile:${agencyId}`),
    [
      db.insert(collaborationGuards).values({
        id: guard,
        allowed: sql`case when exists(select 1 from profiles where id=${escortId} and ${inviteableEscortCondition}) then 1 else 0 end`,
      }),
      db
        .insert(agencyMembershipRequests)
        .values({
          id,
          agencyProfileId: agencyId,
          escortProfileId: escortId,
          requestedBy: user.id,
          managementRequested: management,
          documentsRequested: documents,
          expiresAt,
          message:
            String(form.get("message") ?? "")
              .trim()
              .slice(0, 240) || null,
        })
        .onConflictDoUpdate({
          target: [
            agencyMembershipRequests.agencyProfileId,
            agencyMembershipRequests.escortProfileId,
          ],
          set: {
            status: "pending",
            requestedBy: user.id,
            managementRequested: management,
            documentsRequested: documents,
            message:
              String(form.get("message") ?? "")
                .trim()
                .slice(0, 240) || null,
            expiresAt,
            respondedAt: null,
          },
        }),
      emailJob(
        db,
        `${id}:${expiresAt}:invite`,
        escort.ownerId,
        agencyId,
        escortId,
        "invitation",
      ),
      agencyActivity(
        db,
        user.id,
        agencyId,
        escortId,
        "invitation.sent",
        management
          ? "Solicitó asociación y gestión del anuncio; requiere aceptación de la titular."
          : "Solicitó asociación pública sin gestión.",
      ),
      db
        .update(profiles)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(profiles.id, agency.id)),
      db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    ],
    user.id,
  );
}
export async function respondAgencyInvitation(
  user: AccountUser,
  id: string,
  form: FormData,
) {
  const db = await getDb(),
    [request] = await db
      .select()
      .from(agencyMembershipRequests)
      .where(eq(agencyMembershipRequests.id, id))
      .limit(1);
  if (
    !request ||
    request.status !== "pending" ||
    (request.expiresAt ?? Date.parse(request.createdAt) + lifetime) <=
      Date.now()
  )
    throw new AgencyError("La invitación ya fue atendida o venció.");
  const action = String(form.get("action"));
  if (!["accepted", "declined"].includes(action))
    throw new AgencyError("Elige aceptar o rechazar la invitación.");
  const [escort] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, request.escortProfileId),
        eq(profiles.ownerId, user.id),
        isNull(profiles.trashedAt),
        action === "accepted" ? inviteableEscortCondition : sql`1`,
      ),
    )
    .limit(1);
  if (!escort)
    throw new AgencyError(
      "Este anuncio no está disponible para aceptar la invitación.",
      403,
    );
  const [agency] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, request.agencyProfileId),
        eq(profiles.type, "agency"),
        action === "accepted"
          ? and(
              isNull(profiles.trashedAt),
              sql`exists(select 1 from users u where u.id=${profiles.ownerId} and u.is_active=1)`,
            )
          : sql`1`,
      ),
    )
    .limit(1);
  if (!agency) throw new AgencyError("La agencia ya no está disponible.");
  const management =
    action === "accepted" &&
    request.managementRequested &&
    form.get("authorize_management") === "on";
  if (action === "accepted" && request.managementRequested && !management)
    throw new AgencyError(
      "Confirma la gestión solicitada o rechaza la invitación. La asociación no se aceptó.",
    );
  const documents =
    management &&
    request.documentsRequested &&
    form.get("authorize_documents") === "on";
  const now = new Date().toISOString(),
    guard = crypto.randomUUID();
  await guardedBatch(
    expectedVersion(form, `profile:${escort.id}`),
    [
      db.insert(collaborationGuards).values({
        id: guard,
        allowed: sql`case when exists(select 1 from agency_membership_requests where id=${id} and status='pending' and (expires_at is null or expires_at>${Date.now()})) and ${action === "accepted" ? sql`exists(select 1 from profiles a join users u on u.id=a.owner_id where a.id=${agency.id} and a.trashed_at is null and u.is_active=1)` : sql`1`} then 1 else 0 end`,
      }),
      db
        .update(agencyMembershipRequests)
        .set({ status: action as "accepted" | "declined", respondedAt: now })
        .where(eq(agencyMembershipRequests.id, id)),
      ...(action === "accepted"
        ? [
            db
              .insert(agencyMembers)
              .values({
                id: `agm_${crypto.randomUUID()}`,
                agencyProfileId: agency.id,
                memberProfileId: escort.id,
                canManage: management,
                documentsAuthorized: documents,
              })
              .onConflictDoUpdate({
                target: [
                  agencyMembers.agencyProfileId,
                  agencyMembers.memberProfileId,
                ],
                set: { canManage: management, documentsAuthorized: documents },
              }),
          ]
        : []),
      agencyActivity(
        db,
        user.id,
        agency.id,
        escort.id,
        `invitation.${action}`,
        action === "accepted"
          ? `[${AGENCY_CONSENT_VERSION}] Aceptó el vínculo${management ? " y la gestión completa" : " sin gestión"}${documents ? ", con autorización específica de documentos" : "; sin acceso a documentos"}.`
          : "Rechazó la invitación.",
      ),
      emailJob(
        db,
        `${id}:${action}:${request.expiresAt}`,
        agency.ownerId,
        agency.id,
        escort.id,
        action,
      ),
      db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    ],
    user.id,
  );
}
export async function changeAgencyMembership(
  user: AccountUser,
  membershipId: string,
  form: FormData,
) {
  const db = await getDb(),
    [membership] = await db
      .select()
      .from(agencyMembers)
      .where(eq(agencyMembers.id, membershipId))
      .limit(1);
  if (!membership) throw new AgencyError("La asociación ya no existe.");
  const [escort] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, membership.memberProfileId))
      .limit(1),
    [agency] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, membership.agencyProfileId))
      .limit(1);
  if (!escort || !agency || ![escort.ownerId, agency.ownerId].includes(user.id))
    throw new AgencyError(
      "No tienes permiso para cambiar esta asociación.",
      403,
    );
  if (escort.agencyCustodianId === agency.id)
    throw new AgencyError(
      "Este perfil todavía está gestionado por su agencia de origen. Primero debe vincularse a una cuenta personal o enviarse a papelera; no puede quedar sin agencia.",
    );
  const action = String(form.get("action") ?? "unlink");
  if (
    ![
      "unlink",
      "revoke_management",
      "revoke_documents",
      "update_permissions",
    ].includes(action)
  )
    throw new AgencyError("Acción no válida.");
  if (action === "update_permissions" && user.id !== escort.ownerId)
    throw new AgencyError(
      "Solo la cuenta titular puede ampliar los permisos de la agencia.",
      403,
    );
  const permissionChange =
    action === "update_permissions"
      ? {
          canManage: form.get("can_manage") === "on",
          documentsAuthorized:
            form.get("can_manage") === "on" &&
            form.get("documents_authorized") === "on",
        }
      : action === "revoke_documents"
        ? { documentsAuthorized: false }
        : { canManage: false, documentsAuthorized: false };
  await guardedBatch(
    expectedVersion(form, `profile:${escort.id}`),
    [
      ...(action === "unlink"
        ? [db.delete(agencyMembers).where(eq(agencyMembers.id, membershipId))]
        : [
            db
              .update(agencyMembers)
              .set(permissionChange)
              .where(eq(agencyMembers.id, membershipId)),
          ]),
      db
        .update(agencyMembershipRequests)
        .set({ status: "cancelled", respondedAt: new Date().toISOString() })
        .where(
          and(
            eq(agencyMembershipRequests.agencyProfileId, agency.id),
            eq(agencyMembershipRequests.escortProfileId, escort.id),
            eq(agencyMembershipRequests.status, "pending"),
          ),
        ),
      agencyActivity(
        db,
        user.id,
        agency.id,
        escort.id,
        `membership.${action}`,
        action === "update_permissions"
          ? `[${AGENCY_CONSENT_VERSION}] La titular actualizó los permisos: gestión ${permissionChange.canManage ? "autorizada" : "retirada"}, documentos ${permissionChange.documentsAuthorized ? "autorizados" : "no autorizados"}.`
          : action === "unlink"
            ? "Retiró la asociación y todos sus permisos. El anuncio conserva su titularidad y archivos."
            : action === "revoke_documents"
              ? "Retiró únicamente el acceso de la agencia a documentos privados."
              : "Retiró la gestión de la agencia, conservando la asociación pública.",
      ),
      emailJob(
        db,
        `${membershipId}:${crypto.randomUUID()}`,
        user.id === escort.ownerId ? agency.ownerId : escort.ownerId,
        agency.id,
        escort.id,
        "revoked",
      ),
    ],
    user.id,
  );
}
export async function requestAgencyClaim(
  user: AccountUser,
  agencyId: string,
  escortId: string,
  form: FormData,
) {
  await ownedAgency(user.id, agencyId);
  const db = await getDb(),
    [escort] = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.id, escortId),
          eq(profiles.ownerId, user.id),
          eq(profiles.agencyCustodianId, agencyId),
          isNull(profiles.trashedAt),
        ),
      )
      .limit(1);
  if (!escort)
    throw new AgencyError(
      "Solo puedes proponer la vinculación de un perfil gestionado por esta agencia.",
      403,
    );
  const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
    [target] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.isActive, true),
          sql`${users.emailVerifiedAt} is not null`,
          ne(users.role, "admin"),
        ),
      )
      .limit(1);
  if (!target || target.id === user.id)
    throw new AgencyError(
      "Indica el correo de otra cuenta existente, activa y con correo verificado.",
    );
  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.ownerId, target.id),
        eq(profiles.type, "escort"),
        isNull(profiles.agencyCustodianId),
        isNull(profiles.trashedAt),
      ),
    )
    .limit(1);
  if (existing)
    throw new AgencyError(
      "La cuenta destinataria ya tiene un Escort personal. Vincula ese anuncio a la agencia o resuelve primero el anuncio existente; no se creó un duplicado.",
    );
  const id = `agc_${crypto.randomUUID()}`,
    expiresAt = Date.now() + lifetime;
  const pending = await db
    .select()
    .from(agencyProfileClaims)
    .where(
      and(
        eq(agencyProfileClaims.escortProfileId, escortId),
        inArray(agencyProfileClaims.status, ["pending", "accepted"]),
      ),
    );
  if (pending.some((row) => row.expiresAt > Date.now()))
    throw new AgencyError(
      "Ya existe una propuesta de vinculación pendiente para este perfil.",
    );
  await guardedBatch(
    expectedVersion(form, `profile:${escortId}`),
    [
      db
        .update(agencyProfileClaims)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(agencyProfileClaims.escortProfileId, escortId),
            inArray(agencyProfileClaims.status, ["pending", "accepted"]),
          ),
        ),
      db.insert(agencyProfileClaims).values({
        id,
        agencyProfileId: agencyId,
        escortProfileId: escortId,
        sourceOwnerId: user.id,
        targetUserId: target.id,
        requestedBy: user.id,
        expiresAt,
      }),
      db
        .update(profiles)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(profiles.id, escortId)),
      emailJob(db, `${id}:claim`, target.id, agencyId, escortId, "claim"),
      agencyActivity(
        db,
        user.id,
        agencyId,
        escortId,
        "claim.requested",
        "Propuso vincular el perfil a una cuenta existente. La titularidad no cambia hasta la aceptación y comprobación administrativa.",
      ),
    ],
    user.id,
  );
  return id;
}
export async function respondAgencyClaim(
  user: AccountUser,
  id: string,
  form: FormData,
) {
  const db = await getDb(),
    [claim] = await db
      .select()
      .from(agencyProfileClaims)
      .where(eq(agencyProfileClaims.id, id))
      .limit(1);
  if (
    !claim ||
    claim.targetUserId !== user.id ||
    !["pending", "accepted"].includes(claim.status) ||
    claim.expiresAt <= Date.now()
  )
    throw new AgencyError(
      "La propuesta no está disponible para tu cuenta.",
      403,
    );
  if (String(form.get("claim_revision")) !== String(claim.revision))
    throw new AgencyError(
      "La propuesta cambió. Recarga antes de responder.",
      409,
    );
  const action = String(form.get("action")),
    version = expectedVersion(form, `profile:${claim.escortProfileId}`);
  if (!["accept", "decline"].includes(action))
    throw new AgencyError("Elige aceptar o rechazar la propuesta.");
  if (action === "accept" && form.get("confirm_ownership") !== "on")
    throw new AgencyError(
      "Confirma que el anuncio te representa y que quieres vincularlo a tu cuenta.",
    );
  const [source] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, claim.escortProfileId))
    .limit(1);
  if (
    !source ||
    source.ownerId !== claim.sourceOwnerId ||
    source.agencyCustodianId !== claim.agencyProfileId ||
    source.trashedAt
  )
    throw new AgencyError(
      "El perfil cambió de titularidad o ya no está disponible.",
    );
  const claimGuard = crypto.randomUUID();
  await guardedBatch(
    version,
    [
      db.insert(collaborationGuards).values({
        id: claimGuard,
        allowed: sql`case when exists(select 1 from agency_profile_claims where id=${id} and revision=${claim.revision} and status in ('pending','accepted') and expires_at>${Date.now()}) then 1 else 0 end`,
      }),
      db
        .update(agencyProfileClaims)
        .set({
          status: action === "accept" ? "accepted" : "declined",
          acceptedAt: action === "accept" ? new Date().toISOString() : null,
          acceptedRevision: action === "accept" ? version.revision : null,
          keepManagement:
            action === "accept" && form.get("keep_management") === "on",
          documentsAuthorized:
            action === "accept" &&
            form.get("keep_management") === "on" &&
            form.get("authorize_documents") === "on",
        })
        .where(
          and(
            eq(agencyProfileClaims.id, id),
            inArray(agencyProfileClaims.status, ["pending", "accepted"]),
          ),
        ),
      db
        .delete(collaborationGuards)
        .where(eq(collaborationGuards.id, claimGuard)),
      agencyActivity(
        db,
        user.id,
        claim.agencyProfileId,
        claim.escortProfileId,
        `claim.${action}`,
        action === "accept"
          ? "Aceptó la vinculación a su cuenta; queda sujeta a comprobación administrativa y cupo personal."
          : "Rechazó vincular el perfil a su cuenta.",
      ),
    ],
    user.id,
  );
  if (action === "accept") return finalizeAgencyClaim(id);
  return false;
}
export async function verifyAgencyClaim(
  admin: AdminUser,
  id: string,
  form: FormData,
) {
  if (
    !adminHasCapability(admin, "accounts.manage") ||
    !adminHasCapability(admin, "profiles.moderate")
  )
    throw new AgencyError(
      "No tienes permiso para comprobar titularidades.",
      403,
    );
  if (form.get("confirmed") !== "on")
    throw new AgencyError(
      "Confirma la comprobación manual con la agencia y la persona destinataria.",
    );
  const db = await getDb(),
    [claim] = await db
      .select()
      .from(agencyProfileClaims)
      .where(eq(agencyProfileClaims.id, id))
      .limit(1);
  if (
    !claim ||
    !["pending", "accepted"].includes(claim.status) ||
    claim.expiresAt <= Date.now()
  )
    throw new AgencyError("La propuesta ya no está pendiente o venció.");
  if (String(form.get("claim_revision")) !== String(claim.revision))
    throw new AgencyError(
      "La propuesta cambió. Revisa su versión actual.",
      409,
    );
  const version = expectedVersion(form, `profile:${claim.escortProfileId}`);
  const claimGuard = crypto.randomUUID();
  await guardedBatch(
    version,
    [
      db.insert(collaborationGuards).values({
        id: claimGuard,
        allowed: sql`case when exists(select 1 from agency_profile_claims where id=${id} and revision=${claim.revision} and status in ('pending','accepted') and expires_at>${Date.now()}) then 1 else 0 end`,
      }),
      db
        .update(agencyProfileClaims)
        .set({
          verifiedBy: admin.id,
          verifiedAt: new Date().toISOString(),
          verifiedRevision: version.revision,
        })
        .where(eq(agencyProfileClaims.id, id)),
      agencyActivity(
        db,
        admin.id,
        claim.agencyProfileId,
        claim.escortProfileId,
        "claim.verified",
        "Administración confirmó manualmente la titularidad; no concede verificación de identidad ni médica.",
      ),
      db
        .delete(collaborationGuards)
        .where(eq(collaborationGuards.id, claimGuard)),
    ],
    admin.id,
  );
  return finalizeAgencyClaim(id);
}
export async function finalizeAgencyClaim(id: string) {
  const db = await getDb(),
    [claim] = await db
      .select()
      .from(agencyProfileClaims)
      .where(eq(agencyProfileClaims.id, id))
      .limit(1);
  if (
    !claim ||
    claim.status !== "accepted" ||
    !claim.acceptedAt ||
    !claim.verifiedAt
  )
    return false;
  const [escort] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, claim.escortProfileId))
    .limit(1);
  if (
    !escort ||
    escort.revision !== claim.acceptedRevision ||
    escort.revision !== claim.verifiedRevision
  )
    throw new AgencyError(
      "El anuncio cambió después de su revisión. La persona destinataria y administración deben volver a confirmar su versión actual.",
      409,
    );
  const guard = crypto.randomUUID(),
    now = new Date().toISOString();
  await guardedBatch(
    { key: `profile:${escort.id}`, revision: escort.revision },
    [
      db.insert(collaborationGuards).values({
        id: guard,
        allowed: sql`case when exists(select 1 from agency_profile_claims c join profiles p on p.id=c.escort_profile_id join profiles a on a.id=c.agency_profile_id join users source on source.id=c.source_owner_id join users target on target.id=c.target_user_id where c.id=${id} and c.revision=${claim.revision} and c.status='accepted' and c.expires_at>${Date.now()} and c.verified_at is not null and p.agency_custodian_id=c.agency_profile_id and p.owner_id=c.source_owner_id and p.trashed_at is null and a.trashed_at is null and source.is_active=1 and target.is_active=1 and target.email_verified_at is not null and target.role!='admin' and not exists(select 1 from profiles other where other.owner_id=c.target_user_id and other.type='escort' and other.trashed_at is null and other.agency_custodian_id is null and other.id!=p.id)) then 1 else 0 end`,
      }),
      db
        .update(profiles)
        .set({
          ownerId: claim.targetUserId,
          agencyCustodianId: null,
          adminEscortLimitOverride: false,
          updatedAt: now,
        })
        .where(eq(profiles.id, escort.id)),
      db
        .update(users)
        .set({ role: "advertiser" })
        .where(
          and(eq(users.id, claim.targetUserId), eq(users.role, "visitor")),
        ),
      db
        .update(exclusiveContentCollections)
        .set({ profileId: null })
        .where(
          and(
            eq(exclusiveContentCollections.profileId, escort.id),
            ne(exclusiveContentCollections.ownerId, claim.targetUserId),
          ),
        ),
      db
        .update(agencyMembers)
        .set({
          canManage: claim.keepManagement,
          documentsAuthorized:
            claim.keepManagement && claim.documentsAuthorized,
        })
        .where(
          and(
            eq(agencyMembers.agencyProfileId, claim.agencyProfileId),
            eq(agencyMembers.memberProfileId, escort.id),
          ),
        ),
      db
        .update(agencyProfileClaims)
        .set({ status: "completed", completedAt: now })
        .where(eq(agencyProfileClaims.id, id)),
      agencyActivity(
        db,
        claim.targetUserId,
        claim.agencyProfileId,
        escort.id,
        "claim.completed",
        "Vinculación completada: la cuenta personal es titular. Conserva ID, URL, fotos, historias, reseñas y estadísticas; decide los permisos y su permanencia en la agencia.",
      ),
      emailJob(
        db,
        `${id}:completed:target`,
        claim.targetUserId,
        claim.agencyProfileId,
        escort.id,
        "completed",
      ),
      emailJob(
        db,
        `${id}:completed:agency`,
        claim.sourceOwnerId,
        claim.agencyProfileId,
        escort.id,
        "completed",
      ),
      db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    ],
    claim.verifiedBy ?? undefined,
  );
  return true;
}

export async function countAgencyNotices(userId: string) {
  const db = await getDb(),
    row = await db.get<{ n: number }>(
      sql`select (select count(*) from agency_membership_requests r join profiles p on p.id=r.escort_profile_id join profiles a on a.id=r.agency_profile_id join users u on u.id=a.owner_id where p.owner_id=${userId} and p.trashed_at is null and a.trashed_at is null and u.is_active=1 and r.status='pending' and coalesce(r.expires_at,cast(strftime('%s',r.created_at) as integer)*1000+${lifetime})>${Date.now()})+(select count(*) from agency_profile_claims c join profiles p on p.id=c.escort_profile_id join profiles a on a.id=c.agency_profile_id join users u on u.id=c.source_owner_id where c.target_user_id=${userId} and c.status in ('pending','accepted') and p.trashed_at is null and a.trashed_at is null and u.is_active=1 and p.agency_custodian_id=c.agency_profile_id and p.owner_id=c.source_owner_id and c.expires_at>${Date.now()}) n`,
    );
  return Number(row?.n ?? 0);
}

export async function cancelAgencyProposal(
  user: AccountUser,
  id: string,
  form: FormData,
) {
  const db = await getDb(),
    [claim] = await db
      .select()
      .from(agencyProfileClaims)
      .where(eq(agencyProfileClaims.id, id))
      .limit(1);
  if (
    !claim ||
    claim.sourceOwnerId !== user.id ||
    !["pending", "accepted"].includes(claim.status)
  )
    throw new AgencyError(
      "La propuesta no está disponible para cancelarla.",
      403,
    );
  const agency = await ownedAgency(user.id, claim.agencyProfileId);
  if (String(form.get("claim_revision")) !== String(claim.revision))
    throw new AgencyError(
      "La propuesta cambió. Revisa su versión actual.",
      409,
    );
  const guard = crypto.randomUUID();
  await guardedBatch(
    expectedVersion(form, `profile:${claim.escortProfileId}`),
    [
      db
        .insert(collaborationGuards)
        .values({
          id: guard,
          allowed: sql`case when exists(select 1 from agency_profile_claims where id=${id} and revision=${claim.revision} and status in ('pending','accepted')) then 1 else 0 end`,
        }),
      db
        .update(agencyProfileClaims)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(agencyProfileClaims.id, id),
            eq(agencyProfileClaims.revision, claim.revision),
          ),
        ),
      db
        .update(profiles)
        .set({ updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(profiles.id, claim.escortProfileId),
            eq(profiles.agencyCustodianId, agency.id),
          ),
        ),
      db
        .update(agencyEmailJobs)
        .set({ status: "failed" })
        .where(
          and(
            eq(agencyEmailJobs.id, `${id}:claim`),
            eq(agencyEmailJobs.status, "pending"),
          ),
        ),
      agencyActivity(
        db,
        user.id,
        agency.id,
        claim.escortProfileId,
        "claim.cancelled",
        "Canceló una propuesta de vinculación; la cuenta destinataria ya no puede aceptarla ni revisar la vista privada por esta propuesta.",
      ),
      db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    ],
    user.id,
  );
}

export async function cancelAgencyInvitation(
  user: AccountUser,
  agencyId: string,
  form: FormData,
) {
  const agency = await ownedAgency(user.id, agencyId),
    db = await getDb(),
    id = String(form.get("request_id") ?? "");
  const [request] = await db
    .select()
    .from(agencyMembershipRequests)
    .where(
      and(
        eq(agencyMembershipRequests.id, id),
        eq(agencyMembershipRequests.agencyProfileId, agencyId),
        eq(agencyMembershipRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!request)
    throw new AgencyError("La invitación ya fue atendida o cancelada.");
  const guard = crypto.randomUUID();
  await guardedBatch(
    expectedVersion(form, `profile:${agency.id}`),
    [
      db
        .insert(collaborationGuards)
        .values({
          id: guard,
          allowed: sql`case when exists(select 1 from agency_membership_requests where id=${id} and status='pending') then 1 else 0 end`,
        }),
      db
        .update(agencyMembershipRequests)
        .set({ status: "cancelled", respondedAt: new Date().toISOString() })
        .where(eq(agencyMembershipRequests.id, id)),
      db
        .update(profiles)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(profiles.id, agency.id)),
      agencyActivity(
        db,
        user.id,
        agency.id,
        request.escortProfileId,
        "invitation.cancelled",
        "Canceló una invitación pendiente; ya no puede aceptarse.",
      ),
      db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    ],
    user.id,
  );
}
