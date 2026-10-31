import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  agencyActivityLogs,
  agencyEmailJobs,
  agencyProfileClaims,
  profiles,
  users,
} from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { privatePageMetadata } from "@/lib/seo";
import { AdminShell, AdminPageHeading } from "../_components";
import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { profilePublicPath } from "@/lib/profile";
import "@/app/mi-cuenta/agency-management.css";
export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({
  title: "Agencias y vinculaciones",
  description:
    "Comprobación de titularidad y seguimiento de gestión autorizada.",
  path: "/admin/agencias",
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/agencias");
  if (
    !adminHasCapability(admin, "accounts.manage") ||
    !adminHasCapability(admin, "profiles.moderate")
  )
    redirect("/admin/acceso-denegado?reason=permission");
  const db = await getDb(),
    query = await searchParams;
  const claims = await db
    .select()
    .from(agencyProfileClaims)
    .where(
      and(
        inArray(agencyProfileClaims.status, ["pending", "accepted"]),
        sql`${agencyProfileClaims.expiresAt}>${Date.now()}`,
      ),
    )
    .orderBy(desc(agencyProfileClaims.createdAt))
    .limit(100);
  const ids = [
      ...new Set(claims.flatMap((c) => [c.escortProfileId, c.agencyProfileId])),
    ],
    targetIds = [...new Set(claims.map((c) => c.targetUserId))];
  const [related, accounts, history, mail] = await Promise.all([
    ids.length
      ? db.select().from(profiles).where(inArray(profiles.id, ids))
      : Promise.resolve([]),
    targetIds.length
      ? db
          .select({
            id: users.id,
            email: users.email,
            username: users.username,
            isActive: users.isActive,
            emailVerifiedAt: users.emailVerifiedAt,
          })
          .from(users)
          .where(inArray(users.id, targetIds))
      : Promise.resolve([]),
    db
      .select({
        id: agencyActivityLogs.id,
        summary: agencyActivityLogs.summary,
        action: agencyActivityLogs.action,
        createdAt: agencyActivityLogs.createdAt,
        username: users.username,
      })
      .from(agencyActivityLogs)
      .leftJoin(users, eq(users.id, agencyActivityLogs.actorUserId))
      .orderBy(desc(agencyActivityLogs.createdAt))
      .limit(50),
    db
      .select({ status: agencyEmailJobs.status, total: sql<number>`count(*)` })
      .from(agencyEmailJobs)
      .groupBy(agencyEmailJobs.status),
  ]);
  return (
    <AdminShell user={admin}>
      <div className="admin-content agency-workflow-panel">
        <AdminPageHeading
          eyebrow="AGENCIAS · CONTROL DE TITULARIDAD"
          title="Agencias y vinculaciones"
          description="Los perfiles gestionados pueden publicarse con la revisión habitual sin inventar cuentas. Vincularlos a otra cuenta requiere aceptación, cupo personal y comprobación manual. La comprobación no concede verificación de identidad ni médica."
        />
        {query.message && (
          <p
            className={query.error ? "form-alert" : "admin-notice"}
            role={query.error ? "alert" : "status"}
          >
            {query.message.slice(0, 800)}
          </p>
        )}
        <section className="agency-workflow-card">
          <h2>Vinculaciones pendientes ({claims.length})</h2>
          {!claims.length && <p>No hay propuestas vigentes por comprobar.</p>}
          {claims.map((c) => {
            const p = related.find((p) => p.id === c.escortProfileId),
              a = related.find((p) => p.id === c.agencyProfileId),
              u = accounts.find((u) => u.id === c.targetUserId);
            if (!p) return null;
            return (
              <article key={c.id}>
                <h3>
                  {p.displayName} · {a?.displayName ?? "Agencia"}
                </h3>
                <p>
                  ID: <code>{p.id}</code>
                </p>
                <p>
                  Cuenta destinataria:{" "}
                  {u?.username ? `@${u.username}` : "Sin usuario"} ·{" "}
                  {u?.email ?? "No disponible"} ·{" "}
                  {u?.isActive && u.emailVerifiedAt
                    ? "activa y verificada"
                    : "revisar estado de la cuenta"}
                </p>
                <p>
                  {c.acceptedAt
                    ? `Aceptación registrada${c.acceptedRevision === p.revision ? " para la versión actual" : " para una versión anterior; requiere nueva aceptación"}.`
                    : "La persona destinataria todavía no acepta."}{" "}
                  {c.verifiedAt
                    ? `Comprobación administrativa ${c.verifiedRevision === p.revision ? "vigente" : "anterior; vuelve a comprobar"}.`
                    : "Falta comprobación administrativa."}
                </p>
                <p>
                  {c.keepManagement
                    ? "Solicita mantener gestión de la agencia"
                    : "La agencia quedará solo asociada, sin gestión"}{" "}
                  ·{" "}
                  {c.documentsAuthorized
                    ? "autorización específica de documentos"
                    : "sin autorización de documentos"}
                  .
                </p>
                <div className="agency-inline-actions">
                  <ActionAnchor
                    className="button button-outline"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={profilePublicPath(p)}
                  >
                    <ActionIcon name="eye" />
                    Revisar anuncio
                  </ActionAnchor>
                  <ActionAnchor
                    className="button button-outline"
                    href={`/admin/anuncios-publicaciones/${p.id}/editar`}
                  >
                    Editar anuncio
                  </ActionAnchor>
                </div>
                <form
                  action={`/api/admin/agencias/traspasos/${c.id}`}
                  method="post"
                >
                  <input
                    type="hidden"
                    name="review_key"
                    value={`profile:${p.id}`}
                  />
                  <input
                    type="hidden"
                    name="review_revision"
                    value={p.revision}
                  />
                  <input
                    type="hidden"
                    name="claim_revision"
                    value={c.revision}
                  />
                  <label className="agency-permission">
                    <input name="confirmed" type="checkbox" required />
                    Comprobé manualmente con la agencia y la persona
                    destinataria la titularidad de este perfil y la cuenta que
                    lo recibirá.
                  </label>
                  <ActionButton className="button button-primary" type="submit">
                    Confirmar comprobación de titularidad
                  </ActionButton>
                </form>
              </article>
            );
          })}
        </section>
        <section className="agency-workflow-card">
          <h2>Avisos por correo</h2>
          <p>
            {mail
              .map(
                (m) =>
                  `${m.status === "accepted" ? "Aceptados por el proveedor" : m.status === "failed" ? "No enviados o por revisar" : "Pendientes"}: ${m.total}`,
              )
              .join(" · ") || "Todavía no hay avisos de agencias."}
            . La aceptación por el proveedor no confirma recepción ni lectura.
            Las invitaciones siempre están disponibles en el panel.
          </p>
          <ActionAnchor href="/admin/correos" className="button button-outline">
            Consultar historial de correo
          </ActionAnchor>
        </section>
        <details className="agency-workflow-card">
          <summary>Últimos cambios de gestión</summary>
          <ol className="agency-history">
            {history.map((h) => (
              <li key={h.id}>
                <span>
                  {h.username ? `@${h.username}` : "Cuenta registrada"} ·{" "}
                  {h.action}
                </span>
                <p>{h.summary}</p>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </AdminShell>
  );
}
