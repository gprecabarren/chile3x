import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="admin-denied">
      <p>CHILE3X &middot; ADMINISTRACI&#211;N</p>
      <h1>Este acceso no est&#225; autorizado.</h1>
      <span>Tu identidad de GitHub no tiene acceso a esta secci&#243;n o su autorizaci&#243;n fue revocada. Si formas parte del equipo, solicita el permiso correspondiente a la persona propietaria.</span>
      <div className="admin-denied-actions">
        <Link className="button button-primary" href="/admin">Volver al panel</Link>
        <Link className="button button-outline" href="/">Ir al sitio</Link>
      </div>
    </main>
  );
}
