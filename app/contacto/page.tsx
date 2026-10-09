import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell, PortalContactLinks } from "@/app/directorio/_components";
import { getPortalContacts } from "@/lib/site-contacts";
import { getSiteSettings } from "@/lib/site-settings";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Contacto y soporte de Chile3X",
  description: "Canales oficiales de Chile3X para consultas de cuenta, publicación, revisión, seguridad y reportes sobre perfiles del directorio.",
  path: "/contacto",
  socialTitle: "Contacto | Chile3X",
});

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const contacts = getPortalContacts(await getSiteSettings());
  return <DirectoryShell>
    <section className="static-page-hero"><p className="eyebrow">CHILE3X</p><h1>Canales de <em>contacto.</em></h1><p>Usa únicamente los canales oficiales configurados por el equipo del portal.</p></section>
    <section className="static-page-content contact-content">
      <article><h2>Soporte del sitio</h2><p>Para dudas sobre una cuenta, una publicación o una revisión, elige el canal que prefieras. Estos contactos son del equipo de Chile3X: no ofrecemos servicios sexuales ni gestionamos pagos, citas o acuerdos entre usuarios.</p>{contacts.length > 0 ? <PortalContactLinks placement="contact" /> : <p className="contact-empty">Los canales oficiales se habilitarán próximamente.</p>}</article>
      <article><h2>Antes de escribir</h2><ul><li>No envíes documentos de identidad, certificados médicos ni información bancaria.</li><li>Para reportar un aviso, incluye el enlace público del perfil y una explicación breve.</li><li>Las solicitudes de publicación se revisan manualmente.</li></ul></article>
      <article><h2>Consultas sobre publicaciones</h2><p>Si administras un anuncio, indícanos el correo de tu cuenta y el enlace o nombre del perfil. Podemos orientarte sobre borradores, envío a revisión, estado de moderación y cambios permitidos, pero nunca pediremos tu contraseña.</p><p>Para conocer los criterios antes de enviar contenido, revisa las <Link href="/reglas-de-publicacion">reglas de publicación</Link> y las <Link href="/faq">preguntas frecuentes</Link>.</p></article>
      <article><h2>Reportes y seguridad</h2><p>Los reportes deben describir el problema con precisión y señalar la URL afectada. No adjuntes datos personales que no sean necesarios. Si el caso corresponde a una publicación, usa también el formulario de reporte disponible en su página para que el equipo reciba el contexto correcto.</p><p>Chile3X modera el contenido del directorio, pero no interviene en conversaciones, encuentros, transferencias ni acuerdos realizados fuera del sitio.</p></article>
    </section>
  </DirectoryShell>;
}
