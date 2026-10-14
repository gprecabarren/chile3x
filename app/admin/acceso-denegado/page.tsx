import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { ResumeAdminSession } from "./ResumeAdminSession";

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
  return (
    <main className="admin-denied">
      {resumeSession && <ResumeAdminSession />}
      <p>CHILE3X &middot; ADMINISTRACI&#211;N</p>
      <h1>{resumeSession ? "Acceso confirmado." : loginError ? "No se pudo completar el inicio de sesión." : "Este acceso no está autorizado."}</h1>
      <span>{resumeSession ? "Tu sesión administrativa está activa y autorizada. Te llevamos al panel; si no se abre automáticamente, utiliza Volver al panel." : loginError ? reason === "oauth_invalid" ? "El intento de acceso venció, ya se utilizó o no pudo verificarse. Inicia sesión nuevamente desde el panel. Este aviso no significa que tus permisos hayan sido revocados." : "No fue posible completar la comunicación con GitHub. Intenta iniciar sesión nuevamente; tus permisos no se modificaron." : emailConflict ? "El correo verificado de esta identidad de GitHub ya pertenece a una cuenta de anunciante o tester. Por seguridad, un mismo correo no puede usarse en ambos paneles." : reason === "permission" ? "No tienes el permiso necesario para esta sección. Puedes volver al panel o solicitar ese permiso a la persona propietaria." : "Tu identidad de GitHub no tiene acceso a esta sección o su autorización fue revocada. Si formas parte del equipo, solicita el permiso correspondiente a la persona propietaria."}</span>
      <div className="admin-denied-actions">
        <Link prefetch={false} className="button button-primary" href="/admin">Volver al panel</Link>
        <Link prefetch={false} className="button button-outline" href="/">Ir al sitio</Link>
      </div>
    </main>
  );
}
