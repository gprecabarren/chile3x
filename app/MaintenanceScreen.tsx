import Link from "next/link";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";

export function MaintenanceScreen() {
  return (
    <main className="maintenance-screen">
      <section>
        <OfficialChile3xLogo className="maintenance-logo" priority />
        <p className="eyebrow">MEJORAS EN CURSO</p>
        <h1>Volveremos pronto.</h1>
        <p>Estamos realizando ajustes para mejorar Chile3X. Gracias por tu paciencia.</p>
        <Link className="button button-outline" href="/ingresar">Acceso de administración</Link>
      </section>
    </main>
  );
}
