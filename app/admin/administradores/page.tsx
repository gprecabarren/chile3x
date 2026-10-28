import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { desc, eq } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminGithubAccess, adminGithubIdentities, telegramAdminIdentities, users } from "@/db/schema";
import { ADMIN_ACCESS_CAPABILITIES, ADMIN_ACCESS_DESCRIPTIONS, ADMIN_ACCESS_LABELS, ADMIN_CAPABILITY_LABELS, adminHasCapability } from "@/lib/admin-permissions";
import { getCurrentAdmin } from "@/lib/auth";
import { telegramIdentityLabel } from "@/lib/telegram";
import { AdminPageHeading, AdminShell } from "../_components";
import "./administrators.css";
import { AdminAccessForm } from "./AdminAccessForm";
import { ADMIN_ACCESS_NOTICES } from "@/lib/admin-access-validation";

export const dynamic = "force-dynamic";

const notices = ADMIN_ACCESS_NOTICES;

function instant(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}

function formatDate(value: string | null) {
  if (!value) return "Aún no registra ingreso";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago",
  }).format(new Date(instant(value)));
}

function administratorName(displayName: string | null, githubLogin: string) {
  return displayName?.trim().toLowerCase() === "propietario chile3x"
    ? "Propietario"
    : displayName || `@${githubLogin}`;
}

export default async function AdministratorsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/administradores");
  if (!adminHasCapability(admin, "admins.manage")) redirect("/admin/acceso-denegado?reason=permission");

  const [db, query] = await Promise.all([getDb(), searchParams]);
  const grants = await db.select({
    id: adminGithubAccess.id,
    githubLogin: adminGithubAccess.githubLogin,
    accessLevel: adminGithubAccess.accessLevel,
    isActive: adminGithubAccess.isActive,
    isProtectedOwner: adminGithubAccess.isProtectedOwner,
    createdAt: adminGithubAccess.createdAt,
    revokedAt: adminGithubAccess.revokedAt,
    userId: adminGithubAccess.userId,
    protectedEmail: adminGithubAccess.protectedEmail,
    displayName: users.displayName,
    githubEmail: adminGithubIdentities.githubEmail,
    lastLoginAt: adminGithubIdentities.lastLoginAt,
    telegramUserId: telegramAdminIdentities.telegramUserId,
    telegramUsername: telegramAdminIdentities.username,
    telegramFirstName: telegramAdminIdentities.firstName,
    telegramIsActive: telegramAdminIdentities.isActive,
  }).from(adminGithubAccess)
    .leftJoin(users, eq(adminGithubAccess.userId, users.id))
    .leftJoin(adminGithubIdentities, eq(adminGithubIdentities.userId, adminGithubAccess.userId))
    .leftJoin(telegramAdminIdentities, eq(telegramAdminIdentities.userId, adminGithubAccess.userId))
    .orderBy(desc(adminGithubAccess.isProtectedOwner), desc(adminGithubAccess.isActive), desc(adminGithubAccess.createdAt));
  const active = grants.filter((grant) => grant.isActive).length;
  const pending = grants.filter((grant) => grant.isActive && !grant.userId).length;
  const revoked = grants.filter((grant) => !grant.isActive).length;

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading
      eyebrow="SEGURIDAD Y EQUIPO"
      title="Administradores"
      description="Autoriza identidades de GitHub, limita lo que puede hacer cada persona y revoca accesos de forma inmediata."
      backHref="/admin"
    />
    {query.notice && notices[query.notice] && <p className={["created", "updated", "login_updated", "reactivated", "revoked", "sessions_revoked"].includes(query.notice) ? "admin-success" : "admin-error"} role="status">{notices[query.notice]}</p>}
    <section className="admin-access-summary" aria-label="Resumen de accesos">
      <div><span>Activos</span><strong>{active}</strong></div>
      <div><span>Sin primer ingreso</span><strong>{pending}</strong></div>
      <div><span>Revocados</span><strong>{revoked}</strong></div>
    </section>

    <section className="admin-access-intro">
      <div>
        <p>ACCESO EXCLUSIVO POR GITHUB</p>
        <h2>Agregar una persona</h2>
        <span>Escribe su usuario exacto y un correo que GitHub muestre como verificado. Ese correo quedará reservado para administración y no podrá usarse a la vez en una cuenta de anunciante o tester.</span>
      </div>
      <AdminAccessForm />
      <details className="admin-access-level-help">
        <summary>Qué permite cada nivel</summary>
        <dl>{Object.entries(ADMIN_ACCESS_DESCRIPTIONS).filter(([level]) => level !== "owner").map(([level, description]) => <div key={level}><dt>{ADMIN_ACCESS_LABELS[level as keyof typeof ADMIN_ACCESS_LABELS]}</dt><dd>{description}</dd></div>)}</dl>
      </details>
    </section>

    <section className="admin-access-list" aria-label="Accesos administrativos">
      <header><p>PERSONAS AUTORIZADAS</p><h2>{grants.length} acceso{grants.length === 1 ? "" : "s"} registrado{grants.length === 1 ? "" : "s"}</h2></header>
      <div className="admin-access-cards">{grants.map((grant) => <article className={`admin-access-card${grant.isActive ? "" : " is-revoked"}`} key={grant.id}>
        <header>
          <div><span className="admin-access-role">{ADMIN_ACCESS_LABELS[grant.accessLevel]}</span><h3>{administratorName(grant.displayName, grant.githubLogin)}</h3><Link className="admin-github-profile-link" href={`https://github.com/${encodeURIComponent(grant.githubLogin)}`} target="_blank" rel="noreferrer">@{grant.githubLogin}<ActionIcon name="open" /></Link></div>
          <span className={`admin-access-status${grant.isActive ? " is-active" : ""}`}>{grant.isActive ? (grant.userId ? "Activo" : "Invitado") : "Revocado"}</span>
        </header>
        {grant.isProtectedOwner && <p className="admin-access-protected">Identidad propietaria protegida. No puede ser removida ni modificada desde el panel.</p>}
        <dl>
          <div><dt>Correo administrativo</dt><dd>{grant.githubEmail ?? grant.protectedEmail ?? "No disponible"}{!grant.githubEmail && grant.protectedEmail ? " · reservado hasta el primer ingreso" : ""}</dd></div>
          <div><dt>Último ingreso</dt><dd>{formatDate(grant.lastLoginAt)}</dd></div>
          <div><dt>Autorizado</dt><dd>{formatDate(grant.createdAt)}</dd></div>
          <div><dt>Telegram administrativo</dt><dd>{grant.telegramIsActive && grant.telegramUserId
            ? telegramIdentityLabel(grant.telegramFirstName, grant.telegramUsername, grant.telegramUserId)
            : grant.userId === admin.id
              ? <Link href="/admin/telegram#identidad-administrativa">Vincular ahora desde mi sesión</Link>
            : grant.userId
              ? "Pendiente · debe vincularlo desde su propia sesión"
              : "Disponible después del primer ingreso"}</dd></div>
        </dl>
        {!grant.isProtectedOwner && <div className="admin-access-actions">
          {grant.isActive && !grant.userId && <details className="admin-access-login-correction"><summary>Corregir usuario de la invitación</summary><p>Solo antes del primer ingreso. Conserva el correo y el nivel de acceso; comprueba el usuario real debajo del nombre visible en GitHub.</p><form action={`/api/admin/administradores/${encodeURIComponent(grant.id)}`} method="post"><input type="hidden" name="intent" value="login" /><input type="hidden" name="previous_login" value={grant.githubLogin} /><label>Usuario real de GitHub<input name="github_login" defaultValue={grant.githubLogin} required maxLength={40} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label><ActionButton className="button button-outline" type="submit">Guardar usuario de GitHub</ActionButton></form></details>}
          <form action={`/api/admin/administradores/${encodeURIComponent(grant.id)}`} method="post">
            <input type="hidden" name="intent" value="level" />
            <label><span>Nivel</span><select name="access_level" defaultValue={grant.accessLevel}>
              <option value="moderator">Moderación</option><option value="administrator">Administrador</option><option value="editor">Noticias</option><option value="support">Soporte</option>
            </select></label>
            <ActionButton className="button button-outline" type="submit">Guardar nivel</ActionButton>
          </form>
          {grant.isActive ? <>
            <form action={`/api/admin/administradores/${encodeURIComponent(grant.id)}`} method="post"><input type="hidden" name="intent" value="sessions" /><ActionButton className="button button-outline" type="submit">Cerrar sus sesiones</ActionButton></form>
            <form action={`/api/admin/administradores/${encodeURIComponent(grant.id)}`} method="post"><input type="hidden" name="intent" value="revoke" /><ActionButton className="button admin-access-danger" type="submit">Revocar acceso</ActionButton></form>
          </> : <form action={`/api/admin/administradores/${encodeURIComponent(grant.id)}`} method="post"><input type="hidden" name="intent" value="reactivate" /><ActionButton className="button button-primary" type="submit">Reactivar acceso</ActionButton></form>}
        </div>}
      </article>)}</div>
    </section>
    <section className="admin-role-guide" aria-labelledby="admin-role-guide-title">
      <header><p>PERMISOS POR FUNCIÓN</p><h2 id="admin-role-guide-title">Qué puede hacer cada administrador</h2><span>Los permisos se aplican en el servidor, no solo en el menú. Una opción oculta tampoco puede abrirse escribiendo su URL directamente.</span></header>
      <div>{(["owner", "administrator", "moderator", "editor", "support"] as const).map((level) => <article key={level}>
        <h3>{ADMIN_ACCESS_LABELS[level]}</h3>
        <p>{ADMIN_ACCESS_DESCRIPTIONS[level]}</p>
        <ul>{ADMIN_ACCESS_CAPABILITIES[level].map((capability) => <li key={capability}>{ADMIN_CAPABILITY_LABELS[capability]}</li>)}</ul>
      </article>)}</div>
      <aside><strong>Separación de identidades</strong><span>Un correo verificado solo puede pertenecer al panel administrativo o a una cuenta de anunciante/tester, nunca a ambos. El primer ingreso con GitHub confirma y reserva el correo administrativo.</span></aside>
    </section>
  </div></AdminShell>;
}
