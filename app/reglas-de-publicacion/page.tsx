import type { Metadata } from "next";
import { LegalPage } from "@/app/legal/LegalPage";

export const metadata: Metadata = { title: "Reglas de publicación", description: "Criterios de Chile3X para aprobar perfiles, agencias y arriendos." };

export default function PublishingRulesPage() {
  return <LegalPage eyebrow="MODERACIÓN" title="Reglas de publicación" updated="30 de julio de 2026">
    <section><h2>1. Requisitos mínimos</h2><p>Las publicaciones deben corresponder a personas adultas o negocios autorizados, describirse de manera honesta y usar información de contacto propia o con permiso. Todo perfil pasa por revisión manual antes de ser visible.</p></section>
    <section><h2>2. Imágenes y videos</h2><p>Solo se podrán publicar fotos o videos propios o con autorización verificable de quienes aparezcan. Deben corresponder al perfil anunciado y no pueden incluir menores, violencia, coerción, contenido ilegal, marcas de terceros sin autorización ni datos que permitan ubicar una dirección privada.</p></section>
    <section><h2>3. Agencias y asociaciones</h2><p>Una agencia puede invitar perfiles de escort, pero la asociación solo se mostrará después de que cada escort la acepte desde su cuenta. Una agencia no puede atribuirse la representación de otra persona sin ese consentimiento.</p></section>
    <section><h2>4. Arriendos</h2><p>Los anuncios de arriendo deben incluir información real sobre condiciones, ubicación referencial y precio. No se permiten engaños, cobros anticipados abusivos, discriminación ilegal ni publicaciones que oculten condiciones esenciales.</p></section>
    <section><h2>5. Motivos de rechazo o retiro</h2><p>Podemos rechazar o retirar perfiles con contenido ilegal, suplantación, datos falsos, lenguaje de odio, acoso, spam, enlaces maliciosos, explotación de terceros o incumplimientos de estos términos. La reiteración puede implicar suspensión de la cuenta.</p></section>
  </LegalPage>;
}
