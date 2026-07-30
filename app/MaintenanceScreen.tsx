import Link from "next/link";

export function MaintenanceScreen() {
  return (
    <main className="maintenance-screen">
      <section>
        <span>CHILE<span>3X</span></span>
        <p className="eyebrow">MEJORAS EN CURSO</p>
        <h1>Volveremos pronto.</h1>
        <p>Estamos realizando ajustes para mejorar Chile3X. Gracias por tu paciencia.</p>
        <Link className="button button-outline" href="/ingresar">Acceso de administración</Link>
      </section>
    </main>
  );
}
