import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell, PortalContactIcon, PortalContactLinks } from "@/app/directorio/_components";
import { getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { safeJsonLd } from "@/lib/json-ld";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Qué es Chile3X | Directorio para adultos en Chile",
  description: "Conoce Chile3X: directorio chileno para adultos con escorts, agencias y arriendos, cobertura nacional, revisión manual y comunidad moderada.",
  path: "/quienes-somos",
  socialTitle: "Quiénes somos | Chile3X",
});

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
    name: "Qué es Chile3X y cómo funciona",
    description: "Misión, cobertura nacional, revisión de publicaciones y comunidad de Chile3X.",
    url: `${siteUrl}/quienes-somos`,
    inLanguage: "es-CL",
    isPartOf: { "@type": "WebSite", name: "Chile3X", url: siteUrl },
    mainEntity: {
      "@type": "Organization",
      name: "Chile3X",
      url: siteUrl,
      email: settings.contact_email.trim() || undefined,
      sameAs: settings.contact_telegram.trim() ? [settings.contact_telegram.trim()] : undefined,
    },
  };

  return <DirectoryShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(aboutSchema) }} />
    <section className="about-hero">
      <div className="about-hero-copy">
        <p className="eyebrow">CHILE3X · TODO CHILE</p>
        <h1>Chile3X: un directorio para adultos, <em>hecho con otra mirada.</em></h1>
        <p>Chile3X reúne anuncios de escorts, agencias y arriendos en Chile dentro de una experiencia clara, territorial y destinada exclusivamente a personas mayores de edad.</p>
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
        <h2>Cobertura nacional, <em>con más orden.</em></h2>
        <p>Chile3X nace para construir un espacio nacional para personas adultas que ofrecen compañía y servicios afines, sin excluir a hombres, mujeres, personas trans, agencias ni arriendos que cumplan las <Link href="/reglas-de-publicacion">reglas de publicación</Link>.</p>
        <p>La navegación por región, ciudad y comuna, los filtros y las fichas ordenadas ayudan a encontrar información pública. El contacto y cualquier acuerdo ocurren directamente entre las personas: Chile3X no presta los servicios anunciados ni participa en pagos o citas.</p>
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
        <p>La meta es consolidar un directorio útil por su cobertura, diseño, soporte y criterios de publicación. Cada función nueva se incorpora con controles de acceso, documentación y revisión de su impacto antes de abrirla a la comunidad.</p>
      </div>
      <div className="about-roadmap-list">
        <article><strong>Disponible en Telegram</strong><h3>Comunidad y Miembros</h3><p>El espacio público reúne ayuda, sugerencias y próximas funciones. Las cuentas verificadas pueden vincular Telegram para solicitar acceso al área privada de Miembros.</p>{settings.contact_telegram.trim() && <a className="text-link" href={settings.contact_telegram.trim()} target="_blank" rel="noreferrer">Abrir comunidad <span aria-hidden="true">→</span></a>}</article>
        <article><strong>Actualizaciones del sitio</strong><h3>Novedades sincronizadas</h3><p>Las mejoras y avisos importantes pueden publicarse desde la administración o Telegram y quedan disponibles en una página pública separada del blog editorial.</p><Link className="text-link" href="/novedades">Ver Novedades <span aria-hidden="true">→</span></Link></article>
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
