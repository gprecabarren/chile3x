import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/LegalPage";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({ title: "Política de privacidad", description: "Cómo Chile3X usa datos necesarios, cookies y medición opcional para operar el directorio.", path: "/privacidad" });

export default function PrivacyPage() {
  return <LegalPage eyebrow="DATOS Y PRIVACIDAD" title="Política de privacidad" updated="11 de agosto de 2026">
    <section><h2>1. Datos que tratamos</h2><p>Al crear una cuenta o perfil tratamos datos de cuenta, ciudad, documento declarado, fecha de nacimiento, medios de contacto que decidas publicar, información de perfil y registros técnicos mínimos de seguridad.</p></section>
    <section><h2>2. Finalidades</h2><p>Usamos esos datos para crear y moderar perfiles, comprobar requisitos de edad, atender solicitudes, prevenir usos indebidos, mantener la seguridad y operar el directorio.</p></section>
    <section><h2>3. Información pública</h2><p>Solo se muestra públicamente la información que una persona incorpora a un perfil y que el equipo aprueba. No publicamos el documento, fecha de nacimiento, teléfono de cuenta, carnet, certificados ni direcciones exactas.</p></section>
    <section id="medicion"><h2>4. Cookies y medición opcional</h2><p>Utilizamos almacenamiento local para recordar la confirmación de mayoría de edad y cookies necesarias cuando inicias sesión, proteges formularios o mantienes funciones de seguridad. La medición con Google Tag Manager y Google Analytics es opcional: solo se carga si eliges «Aceptar medición» en el aviso de privacidad.</p><p>Si aceptas, medimos visitas y acciones generales como registros, envíos de anuncios, clics de contacto, favoritos, likes y reseñas. No enviamos a Google nombres, correos, teléfonos, RUT, direcciones, archivos privados, identificadores de perfiles ni texto libre.</p><p>Si eliges «Solo necesarias», Chile3X seguirá funcionando y no cargaremos Google Tag Manager ni Google Analytics. Puedes cambiar esta elección cuando quieras desde esta página.</p><p><a className="text-link" href="/privacidad?medicion=editar#medicion">Cambiar mi elección de medición <span>→</span></a></p></section>
    <section><h2>5. Archivos de verificación opcional</h2><p>Una escort puede adjuntar de forma voluntaria una imagen de carnet y/o examen médico para revisión interna. Estos archivos se guardan en almacenamiento privado, no tienen enlace público, no se indexan y solo pueden ser descargados por la persona dueña del perfil o administradores autorizados. Un archivo nuevo reemplaza y elimina el anterior.</p></section>
    <section><h2>6. Conservación y solicitudes</h2><p>Conservamos la información mientras sea necesaria para la cuenta, la moderación o el cumplimiento de obligaciones aplicables. Puedes solicitar actualización, retiro o revisión de tus datos mediante los canales de soporte del portal; algunas obligaciones legales pueden requerir conservar registros internos limitados.</p></section>
  </LegalPage>;
}
