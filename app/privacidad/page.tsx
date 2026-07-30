import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/LegalPage";

export const metadata: Metadata = { title: "Política de privacidad", description: "Cómo Chile3X trata los datos mínimos necesarios para operar el directorio." };

export default function PrivacyPage() {
  return <LegalPage eyebrow="DATOS Y PRIVACIDAD" title="Política de privacidad" updated="30 de julio de 2026">
    <section><h2>1. Datos que tratamos</h2><p>Al crear una cuenta o perfil podemos tratar datos de cuenta, datos de contacto que decidas publicar, información de perfil, preferencias operativas y registros técnicos necesarios para seguridad y administración.</p></section>
    <section><h2>2. Finalidades</h2><p>Usamos esos datos para crear y moderar perfiles, mostrar publicaciones aprobadas, atender solicitudes, prevenir usos indebidos, mantener seguridad y mejorar el funcionamiento del portal.</p></section>
    <section><h2>3. Información pública</h2><p>Solo se muestra públicamente la información que una persona incorpora a un perfil y que el equipo aprueba. No publiques direcciones exactas, documentos de identidad, datos de terceros ni información que no quieras hacer visible.</p></section>
    <section><h2>4. Archivos y verificación</h2><p>Chile3X no almacena documentos de identidad ni certificados médicos en esta primera etapa. Cuando se habiliten fotos y videos, su carga, moderación, conservación y acceso se regirán por reglas adicionales comunicadas antes de habilitar la función.</p></section>
    <section><h2>5. Cookies y medición</h2><p>El aviso +18 se guarda localmente en el navegador para no solicitar la confirmación en cada visita. Si el administrador activa Google Analytics, se utilizará esa medición según la configuración y políticas de Google.</p></section>
    <section><h2>6. Solicitudes</h2><p>Las personas titulares pueden solicitar actualización, rectificación o retiro de la información de su perfil mediante los canales de soporte que Chile3X habilite. Las obligaciones legales de conservación pueden requerir mantener ciertos registros internos.</p></section>
  </LegalPage>;
}
