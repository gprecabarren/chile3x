import Link from "next/link";

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const reason = (await searchParams).reason;
  const emailConflict = reason === "email_conflict";
  return (
    <main className="admin-denied">
      <p>CHILE3X &middot; ADMINISTRACI&#211;N</p>
      <h1>Este acceso no est&#225; autorizado.</h1>
      <span>{emailConflict ? "El correo verificado de esta identidad de GitHub ya pertenece a una cuenta de anunciante o tester. Por seguridad, un mismo correo no puede usarse en ambos paneles." : "Tu identidad de GitHub no tiene acceso a esta sección o su autorización fue revocada. Si formas parte del equipo, solicita el permiso correspondiente a la persona propietaria."}</span>
      <div className="admin-denied-actions">
        <Link prefetch={false} className="button button-primary" href="/admin">Volver al panel</Link>
        <Link prefetch={false} className="button button-outline" href="/">Ir al sitio</Link>
      </div>
    </main>
  );
}
