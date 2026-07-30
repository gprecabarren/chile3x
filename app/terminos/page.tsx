import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/LegalPage";

export const metadata: Metadata = { title: "Términos y condiciones", description: "Términos de uso de Chile3X para visitantes y anunciantes mayores de edad." };

export default function TermsPage() {
  return <LegalPage eyebrow="MARCO DE USO" title="Términos y condiciones" updated="30 de julio de 2026">
    <section><h2>1. Acceso para adultos</h2><p>Chile3X está destinado exclusivamente a personas mayores de 18 años. Al ingresar, declaras cumplir la edad legal aplicable y aceptas no facilitar el acceso a menores de edad.</p></section>
    <section><h2>2. Rol del portal</h2><p>Chile3X es un directorio de publicaciones. No es parte de los acuerdos, citas, arriendos, comunicaciones ni pagos que puedan ocurrir entre visitantes y anunciantes. Cada persona debe actuar con criterio, consentimiento y respeto a la ley.</p></section>
    <section><h2>3. Cuentas y publicaciones</h2><p>Quien publica es responsable de que la información de su perfil sea veraz, tenga autorización para usar sus imágenes y datos de contacto, y cumpla estas reglas. Chile3X puede revisar, pausar, rechazar o retirar publicaciones para proteger a la comunidad o cumplir la normativa.</p></section>
    <section><h2>4. Conductas no permitidas</h2><p>Está prohibido utilizar el portal para explotación, trata de personas, participación de menores, engaño, amenazas, acoso, discriminación, difusión de datos personales de terceros, estafas, suplantación, spam o cualquier actividad ilícita.</p></section>
    <section><h2>5. Disponibilidad y cambios</h2><p>El servicio puede modificarse, suspenderse o ponerse en mantenimiento. Las funciones de planes, pagos y contenido de pago no forman parte del flujo actual mientras no se anuncien expresamente.</p></section>
    <section><h2>6. Contacto</h2><p>Para reportar una publicación o solicitar una revisión, utiliza los canales que Chile3X habilite desde el panel administrativo o el perfil correspondiente.</p></section>
  </LegalPage>;
}
