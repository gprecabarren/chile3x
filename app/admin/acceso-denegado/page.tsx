import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="admin-denied">
      <p>CHILE3X &middot; ADMINISTRACI&#211;N</p>
      <h1>Este acceso no est&#225; autorizado.</h1>
      <span>Ingresa con una cuenta de GitHub autorizada previamente como due&#241;a del portal.</span>
      <Link className="button button-primary" href="/">Volver al sitio</Link>
    </main>
  );
}
