import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell, PortalContactIcon, PortalContactLinks } from "@/app/directorio/_components";
import { getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Directorio nacional de escorts",
  description: "Chile3X es un directorio nacional de escorts en Chile, con perfiles por ciudad, agencias y arriendos para adultos. Cobertura nacional, revisión manual y soporte cercano.",
  alternates: { canonical: "/quienes-somos" },
};

export const dynamic = "force-dynamic";

function formatChileanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("569") && digits.length === 11) return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (digits.startsWith("56") && digits.length > 2) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  return value.trim();
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const whatsappHref = getPortalWhatsappLink(settings.contact_whatsapp, "Hola, quiero conocer más sobre Chile3X.");
  const siteUrl = siteBaseUrl(settings.site_url);
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Directorio nacional de escorts | Chile3X",
    description: "Chile3X es un directorio nacional de escorts en Chile, con agencias y arriendos para adultos por ciudad.",
    url: `${siteUrl}/quienes-somos`,
    inLanguage: "es-CL",
    isPartOf: { "@type": "WebSite", name: "Chile3X", url: siteUrl },
  };

  return <DirectoryShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />
    <section className="about-hero">
      <div className="about-hero-copy">
        <p className="eyebrow">CHILE3X · TODO CHILE</p>
        <h1>Un directorio nacional de escorts, <em>hecho con otra mirada.</em></h1>
        <p>Chile3X reúne escorts en Chile, agencias y arriendos para adultos en un mismo lugar: una propuesta elegante, clara y pensada para llegar más allá de las ciudades de siempre.</p>
        <div className="about-hero-actions">
          <Link className="button button-primary" href="/registro">Crear una cuenta</Link>
          <Link className="button button-outline" href="/escorts">Explorar escorts</Link>
        </div>
      </div>
      <aside className="about-hero-panel" aria-label="Principios de Chile3X">
        <p>LO QUE NOS MUEVE</p>
        <strong>16</strong>
        <span>regiones incluidas desde el comienzo</span>
        <hr />
        <b>Revisión manual</b>
        <small>Antes de que una publicación llegue al directorio.</small>
      </aside>
    </section>

    <section className="about-intro">
      <p className="eyebrow">NUESTRA PROPUESTA</p>
      <div>
        <h2>Escorts en Chile, <em>con más cobertura.</em></h2>
        <p>Chile3X nace para construir un espacio nacional para personas adultas que ofrecen compañía y servicios afines, sin excluir a hombres, mujeres, personas trans, agencias ni arriendos que cumplan las reglas del portal.</p>
        <p>Queremos que encontrar o publicar un perfil sea simple: ciudades visibles, filtros útiles, información ordenada, contacto directo y una plataforma que se vea tan bien como funciona.</p>
      </div>
    </section>

    <section className="about-principles" aria-label="Compromisos de Chile3X">
      <article><span>01</span><h2>Cobertura real</h2><p>El directorio está diseñado para incluir todo Chile, con navegación por regiones, ciudades y comunas definidas para el lanzamiento.</p></article>
      <article><span>02</span><h2>Acceso más cercano</h2><p>Buscamos una alternativa con condiciones y precios accesibles para quienes comienzan, sin perder una presentación cuidada ni atención humana.</p></article>
      <article><span>03</span><h2>Soporte y criterio</h2><p>Las publicaciones pasan por revisión manual. El portal informa y conecta; los acuerdos se realizan siempre entre anunciantes y visitantes.</p></article>
    </section>

    <section className="about-roadmap">
      <div>
        <p className="eyebrow">MIRANDO HACIA ADELANTE</p>
        <h2>Una red que quiere <em>seguir creciendo.</em></h2>
        <p>La meta es que Chile3X se convierta en un referente nacional por su cobertura, diseño, soporte y criterios de publicación. Primero consolidamos un directorio responsable; después, solo cuando la infraestructura, la verificación y las reglas lo permitan, ampliaremos la experiencia.</p>
      </div>
      <div className="about-roadmap-list">
        <article><strong>Próximamente, con condiciones claras</strong><h3>Comunidad y foro</h3><p>Un espacio moderado para conversación, ayuda e información útil de la comunidad.</p></article>
        <article><strong>Futuro producto</strong><h3>Venta de contenido</h3><p>Una alternativa para creadores, sujeta a políticas, verificación y requisitos legales, con comisiones competitivas y reglas transparentes.</p></article>
      </div>
    </section>

    <section className="about-contact">
      <div>
        <p className="eyebrow">HABLEMOS</p>
        <h2>¿Quieres ser parte desde el inicio?</h2>
        <p>Crea una cuenta para preparar tu publicación o escríbenos por los canales oficiales del portal. No gestionamos pagos, citas ni acuerdos privados.</p>
        <div className="about-contact-actions"><Link className="button button-primary" href="/registro">Registrarme</Link><Link className="button button-outline" href="/contacto">Ver contacto</Link></div>
      </div>
      <aside>
        <p>CONTACTO OFICIAL</p>
        {whatsappHref && <a className="about-contact-number" href={whatsappHref} target="_blank" rel="noreferrer"><PortalContactIcon kind="whatsapp" /><span><small>WhatsApp</small><strong>{formatChileanPhone(settings.contact_whatsapp)}</strong></span></a>}
        {settings.contact_email.trim() && <a className="about-contact-number" href={`mailto:${settings.contact_email.trim()}`}><PortalContactIcon kind="email" /><span><small>Correo</small><strong>{settings.contact_email.trim()}</strong></span></a>}
        {!whatsappHref && !settings.contact_email.trim() && <p className="about-contact-empty">Los canales oficiales se habilitarán desde Administración.</p>}
        <PortalContactLinks placement="footer" />
      </aside>
    </section>
  </DirectoryShell>;
}
