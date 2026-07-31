import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/LegalPage";

export const metadata: Metadata = { title: "Política de privacidad", description: "Cómo Chile3X trata los datos necesarios para operar el directorio y una verificación opcional." };

export default function PrivacyPage() {
  return <LegalPage eyebrow="DATOS Y PRIVACIDAD" title="Política de privacidad" updated="31 de julio de 2026">
    <section><h2>1. Datos que tratamos</h2><p>Al crear una cuenta o perfil tratamos datos de cuenta, ciudad, documento declarado, fecha de nacimiento, medios de contacto que decidas publicar, información de perfil y registros técnicos mínimos de seguridad.</p></section>
    <section><h2>2. Finalidades</h2><p>Usamos esos datos para crear y moderar perfiles, comprobar requisitos de edad, atender solicitudes, prevenir usos indebidos, mantener la seguridad y operar el directorio.</p></section>
    <section><h2>3. Información pública</h2><p>Solo se muestra públicamente la información que una persona incorpora a un perfil y que el equipo aprueba. No publicamos el documento, fecha de nacimiento, teléfono de cuenta, carnet, certificados ni direcciones exactas.</p></section>
    <section><h2>4. Archivos de verificación opcional</h2><p>Una escort puede adjuntar de forma voluntaria una imagen de carnet y/o examen médico para revisión interna. Estos archivos se guardan en almacenamiento privado, no tienen enlace público, no se indexan y solo pueden ser descargados por la persona dueña del perfil o administradores autorizados. Un archivo nuevo reemplaza y elimina el anterior.</p></section>
    <section><h2>5. Conservación y solicitudes</h2><p>Conservamos la información mientras sea necesaria para la cuenta, la moderación o el cumplimiento de obligaciones aplicables. Puedes solicitar actualización, retiro o revisión de tus datos mediante los canales de soporte del portal; algunas obligaciones legales pueden requerir conservar registros internos limitados.</p></section>
    <section><h2>6. Cookies y medición</h2><p>El aviso +18 se guarda localmente en el navegador para no solicitar confirmación en cada visita. La medición de visualizaciones usa una clave opaca de navegador y día, sin conservar la dirección IP.</p></section>
  </LegalPage>;
}
