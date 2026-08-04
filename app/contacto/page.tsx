import type { Metadata } from "next";
import { DirectoryShell, PortalContactLinks } from "@/app/directorio/_components";
import { getPortalContacts } from "@/lib/site-contacts";
import { getSiteSettings } from "@/lib/site-settings";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Contacto",
  description: "Canales oficiales de contacto de Chile3X para consultas relacionadas con el directorio y la publicación de perfiles.",
  path: "/contacto",
  socialTitle: "Contacto | Chile3X",
});

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const contacts = getPortalContacts(await getSiteSettings());
  return <DirectoryShell>
    <section className="static-page-hero"><p className="eyebrow">CHILE3X</p><h1>Canales de <em>contacto.</em></h1><p>Usa únicamente los canales oficiales configurados por el equipo del portal.</p></section>
    <section className="static-page-content contact-content">
      <article><h2>Escríbenos</h2><p>Para dudas sobre una cuenta, una publicación o una revisión, elige el canal que prefieras. Chile3X no gestiona pagos, citas ni acuerdos entre usuarios.</p>{contacts.length > 0 ? <PortalContactLinks placement="footer" /> : <p className="contact-empty">Los canales oficiales se habilitarán próximamente.</p>}</article>
      <article><h2>Antes de escribir</h2><ul><li>No envíes documentos de identidad, certificados médicos ni información bancaria.</li><li>Para reportar un aviso, incluye el enlace público del perfil y una explicación breve.</li><li>Las solicitudes de publicación se revisan manualmente.</li></ul></article>
    </section>
  </DirectoryShell>;
}
