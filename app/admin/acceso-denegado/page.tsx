import { ActionAnchor } from "@/app/ActionButton";
import Link from "@/app/NavigationLink";
import { getCurrentAdmin } from "@/lib/auth";
import { ResumeAdminSession } from "./ResumeAdminSession";
import "./access-denied.css";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const reason = (await searchParams).reason;
  // A repeated/expired callback or an old denial URL is not a revoked grant.
  // Always revalidate the administrative session; never trust a public account.
  const loginError = reason === "oauth_invalid" || reason === "oauth_provider";
  const admin = await getCurrentAdmin();
  // vinext probes page components with empty parameters before real rendering.
  // A query-dependent server redirect would incorrectly swallow permission
  // denials in that probe. Resume only after the actual page is hydrated.
  const resumeSession = Boolean(admin && (!reason || loginError));
  const emailConflict = reason === "email_conflict";
  const loginMessage = reason === "oauth_invalid" ? "El intento de acceso venció, ya se utilizó o no pudo verificarse. Inicia sesión nuevamente desde el panel. Este aviso no significa que tus permisos hayan sido revocados." : "No fue posible completar la comunicación con GitHub. Intenta iniciar sesión nuevamente; tus permisos no se modificaron.";
  return (
    <main className="admin-denied">
      <p>CHILE3X &middot; ADMINISTRACI&#211;N</p>
      {resumeSession || loginError ? <ResumeAdminSession initialConfirmed={resumeSession} failureMessage={loginMessage} /> : <><h1>Este acceso no está autorizado.</h1><span>{emailConflict ? "El correo verificado de esta identidad de GitHub ya pertenece a una cuenta de anunciante o tester. Por seguridad, un mismo correo no puede usarse en ambos paneles." : reason === "permission" ? "No tienes el permiso necesario para esta sección. Puedes volver al panel o solicitar ese permiso a la persona propietaria." : "Tu identidad de GitHub no tiene acceso a esta sección o su autorización fue revocada. Si formas parte del equipo, solicita el permiso correspondiente a la persona propietaria."}</span></>}
      {!admin && <p className="admin-denied-account-help">Comprueba que elegiste el usuario de GitHub autorizado por Chile3X y que esa cuenta tiene verificado el correo administrativo. El correo de autorización de GitHub confirma la conexión de la aplicación; el acceso al panel depende de la autorización de Chile3X.</p>}
      <div className="admin-denied-actions">
        {admin ? <ActionAnchor className="button button-primary" href="/admin">Volver al panel</ActionAnchor> : <ActionAnchor className="button button-primary" href="/api/auth/github/start?select_account=1">Elegir cuenta de GitHub</ActionAnchor>}
        <Link className="button button-outline" href="/">Ir al sitio</Link>
      </div>
    </main>
  );
}
