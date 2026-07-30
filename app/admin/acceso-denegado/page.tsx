import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="admin-denied">
      <p>CHILE3X · ADMINISTRACIÓN</p>
      <h1>Este acceso no está autorizado.</h1>
      <span>Ingresa con una cuenta de GitHub cuyo correo haya sido registrado previamente como dueño del portal.</span>
      <Link className="button button-primary" href="/">Volver al sitio</Link>
    </main>
  );
}
