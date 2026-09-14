import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell, PortalContactIcon, PortalContactLinks } from "@/app/directorio/_components";
import { getPortalContacts, getPortalTelegramLink, getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { safeJsonLd } from "@/lib/json-ld";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...publicPageMetadata({
  title: "Chile3X: nuevo directorio para adultos en Chile",
  description: "Conoce Chile3X, un directorio chileno emergente para mayores de 18 años: publicaciones gratis durante el lanzamiento, cobertura nacional y revisión manual.",
  path: "/quienes-somos",
  socialTitle: "Chile3X: un nuevo directorio para adultos en Chile",
  socialDescription: "Un proyecto chileno emergente con publicación gratuita durante su lanzamiento, cobertura nacional, revisión manual y contacto directo.",
  }),
  title: { absolute: "Chile3X: nuevo directorio para adultos en Chile" },
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
  const telegramHref = getPortalTelegramLink(settings.contact_telegram);
  const siteUrl = siteBaseUrl(settings.site_url);
  const publicContacts = getPortalContacts(settings);
  const socialProfiles = publicContacts
    .filter((contact) => contact.external && contact.key !== "whatsapp")
    .map((contact) => contact.href);
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const pageId = `${siteUrl}/quienes-somos#page`;
  const breadcrumbId = `${siteUrl}/quienes-somos#breadcrumb`;
  const aboutSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": pageId,
        url: `${siteUrl}/quienes-somos`,
        name: "Chile3X: nuevo directorio para adultos en Chile",
        headline: "Chile3X, un nuevo directorio para adultos en Chile",
        description: "Presentación, propuesta, funcionamiento y próximos pasos de Chile3X, un directorio chileno emergente para mayores de 18 años.",
        inLanguage: "es-CL",
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        breadcrumb: { "@id": breadcrumbId },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/chile3x-hero-banner.jpg`,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: "Chile3X",
        inLanguage: "es-CL",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Chile3X",
        alternateName: "Chile 3X",
        url: siteUrl,
        description: "Directorio chileno emergente para personas adultas, con cobertura nacional, revisión manual de publicaciones y contacto directo entre anunciantes y visitantes.",
        areaServed: { "@type": "Country", name: "Chile" },
        logo: { "@type": "ImageObject", url: `${siteUrl}/chile3x-logo-primary.jpeg` },
        email: settings.contact_email.trim() || undefined,
        sameAs: socialProfiles.length ? socialProfiles : undefined,
        contactPoint: settings.contact_email.trim() || settings.contact_whatsapp.trim() ? {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: settings.contact_email.trim() || undefined,
          telephone: settings.contact_whatsapp.trim() ? formatChileanPhone(settings.contact_whatsapp) : undefined,
          areaServed: "CL",
          availableLanguage: "Spanish",
        } : undefined,
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Quiénes somos", item: `${siteUrl}/quienes-somos` },
        ],
      },
    ],
  };

  return <DirectoryShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(aboutSchema) }} />

    <section className="about-hero">
      <div className="about-hero-copy">
        <p className="eyebrow">DIRECTORIO EMERGENTE · TODO CHILE</p>
        <h1>Chile3X: un nuevo directorio para adultos en Chile, <em>hecho para crecer distinto.</em></h1>
        <p>Somos un sitio chileno nuevo para mayores de 18 años. Reunimos anuncios de escorts, damas de compañía, agencias y arriendos en una experiencia nacional, clara y de contacto directo.</p>
        <p className="about-launch-note"><strong>Etapa de lanzamiento:</strong> crear una cuenta y publicar es gratis, sin tarjeta ni cobros automáticos.</p>
        <div className="about-hero-actions">
          <Link className="button button-primary" href="/registro">Publicar gratis</Link>
          <Link className="button button-outline" href="/escorts">Conocer el directorio</Link>
        </div>
      </div>
      <aside className="about-hero-panel" aria-label="Chile3X en cifras y principios">
        <p>CHILE3X HOY</p>
        <dl>
          <div><dt>Nuevo</dt><dd>Un proyecto emergente que está comenzando y mejorando con su comunidad.</dd></div>
          <div><dt>16</dt><dd>Regiones consideradas desde el diseño del directorio.</dd></div>
          <div><dt>$0</dt><dd>Publicación actual durante la etapa de lanzamiento.</dd></div>
          <div><dt>Manual</dt><dd>Revisión previa de cada anuncio enviado.</dd></div>
        </dl>
      </aside>
    </section>

    <section className="about-intro">
      <p className="eyebrow">UN PROYECTO CHILENO EMERGENTE</p>
      <div>
        <h2>Estamos comenzando, y queremos <em>hacerlo bien.</em></h2>
        <p>Chile3X es una propuesta nueva dentro de los directorios para adultos en Chile. Estamos en una etapa inicial, incorporando publicaciones y perfeccionando la plataforma con la experiencia de anunciantes y visitantes. Queremos que quienes llegan hoy puedan participar de su crecimiento y encontrar un espacio sencillo para dar a conocer sus anuncios.</p>
        <p>La plataforma incluye distintas identidades y tipos de publicación que cumplan las <Link href="/reglas-de-publicacion">reglas de publicación</Link>. La información se organiza por región, ciudad y comuna; el contacto y cualquier acuerdo ocurren directamente entre las personas. Chile3X no presta los servicios anunciados, no intermedia citas y no recibe pagos por acuerdos privados.</p>
      </div>
    </section>

    <section className="about-differences" aria-labelledby="about-differences-title">
      <header>
        <p className="eyebrow">NUESTRA FORMA DE HACERLO</p>
        <h2 id="about-differences-title">Qué distingue a Chile3X de otros directorios para adultos</h2>
        <p>Nuestra propuesta combina publicación gratuita durante el lanzamiento, alcance nacional y herramientas para que cada anunciante gestione su presencia. Estos son los pilares de esa experiencia.</p>
      </header>
      <div className="about-differences-grid">
        <article><span>01</span><h3>Todo Chile desde el diseño</h3><p>La navegación contempla las 16 regiones, con ciudades y comunas para dar visibilidad fuera de los centros habituales.</p></article>
        <article><span>02</span><h3>Contacto directo</h3><p>Chile3X funciona como directorio: no cobra comisiones por citas, no gestiona reservas y no interviene en acuerdos privados.</p></article>
        <article><span>03</span><h3>Revisión y reglas visibles</h3><p>Cada anuncio enviado pasa por revisión manual. Además, publicamos criterios claros y ofrecemos mecanismos para reportar contenido.</p></article>
        <article><span>04</span><h3>Control para cada anunciante</h3><p>Las agencias pueden organizar anuncios, pero una cuenta vinculada conserva control y debe aceptar la asociación correspondiente.</p></article>
      </div>
    </section>

    <section className="about-free" aria-labelledby="about-free-title">
      <div>
        <p className="eyebrow">LANZAMIENTO GRATUITO</p>
        <h2 id="about-free-title">Publicar en Chile3X es gratis durante esta etapa.</h2>
        <p>Actualmente todas las categorías de anuncios pueden prepararse y publicarse sin pagar. No pedimos tarjeta, no existen suscripciones automáticas activas y el sitio no procesa pagos ni ventas de contenido.</p>
        <p>Hasta que Chile3X comunique un cambio, los flujos actuales siguen sin generar cobros. Si en el futuro se habilitan planes opcionales o periodos destacados, informaremos el precio, la duración y las condiciones antes de cualquier contratación.</p>
        <div className="about-free-actions">
          <Link className="button button-light" href="/registro">Crear mi cuenta</Link>
          <Link className="text-link" href="/terminos#pagos-futuros">Leer condiciones sobre funciones futuras <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <aside aria-label="Costo actual de publicación"><strong>$0</strong><span>para publicar durante el lanzamiento</span><small>Sin tarjeta ni renovación automática.</small></aside>
    </section>

    <section className="about-how" aria-labelledby="about-how-title">
      <header>
        <p className="eyebrow">CÓMO FUNCIONA</p>
        <h2 id="about-how-title">Del registro a una publicación visible</h2>
      </header>
      <ol>
        <li><span>1</span><div><h3>Crea tu cuenta</h3><p>Regístrate con correo o Google y completa los datos necesarios para administrar tus anuncios.</p></div></li>
        <li><span>2</span><div><h3>Elige el tipo de anuncio</h3><p>Prepara una publicación de Escort, Agencia o Arriendo con su ubicación, descripción y medios de contacto.</p></div></li>
        <li><span>3</span><div><h3>Envíala a revisión</h3><p>El equipo comprueba que la ficha cumpla las reglas antes de incorporarla al directorio público.</p></div></li>
        <li><span>4</span><div><h3>Administra lo publicado</h3><p>Desde tu panel puedes actualizar información, ocultar y volver a mostrar anuncios y gestionar las vinculaciones disponibles.</p></div></li>
      </ol>
      <nav aria-label="Categorías del directorio">
        <Link href="/escorts">Ver escorts</Link>
        <Link href="/agencias">Ver agencias</Link>
        <Link href="/arriendos">Ver arriendos</Link>
      </nav>
    </section>

    <section className="about-trust" aria-labelledby="about-trust-title">
      <div>
        <p className="eyebrow">CLARIDAD Y RESPONSABILIDAD</p>
        <h2 id="about-trust-title">Un directorio para mayores de 18 años, con límites claros.</h2>
      </div>
      <div>
        <p>La revisión manual ayuda a aplicar las reglas, pero no constituye una certificación ni reemplaza la precaución personal. Cada visitante y anunciante debe proteger sus datos, verificar con quién se comunica y evitar pagos o acuerdos inseguros.</p>
        <p>Explicamos qué aceptamos, cómo tratamos los datos y cuál es el rol de la plataforma para que nadie tenga que adivinarlo.</p>
        <div className="about-trust-links"><Link href="/reglas-de-publicacion">Reglas de publicación</Link><Link href="/terminos">Términos y condiciones</Link><Link href="/privacidad">Privacidad</Link><Link href="/faq">Preguntas frecuentes</Link></div>
      </div>
    </section>

    <section className="about-roadmap" aria-labelledby="about-roadmap-title">
      <div>
        <p className="eyebrow">PRÓXIMOS PASOS</p>
        <h2 id="about-roadmap-title">Lo que queremos <em>seguir construyendo.</em></h2>
        <p>Esta hoja de ruta expresa la dirección del proyecto. Las funciones pueden cambiar según sus pruebas, requisitos técnicos y necesidades de la comunidad, y no representan una fecha de lanzamiento garantizada. Los cambios confirmados se publicarán en <Link href="/novedades">Novedades</Link>.</p>
      </div>
      <div className="about-roadmap-list">
        <article><strong>Agencias</strong><h3>Más herramientas de gestión</h3><p>Seguiremos mejorando la relación entre agencias, cuentas vinculadas y anuncios para que cada autorización sea comprensible y controlable.</p></article>
        <article><strong>Acceso</strong><h3>Inicio de sesión con Apple</h3><p>Estamos preparando una alternativa para ingresar y registrarse con una cuenta Apple. Anunciaremos su disponibilidad cuando esté habilitada; por ahora puedes usar correo o Google.</p></article>
        <article><strong>Promoción opcional</strong><h3>Más formas de destacar</h3><p>Evaluamos periodos destacados y otras herramientas promocionales, siempre con condiciones claras antes de habilitar un cobro.</p></article>
        <article><strong>Comunidad</strong><h3>Cobertura y avisos útiles</h3><p>Queremos ampliar la presencia regional, escuchar sugerencias y mantener avisos de estado, seguridad y mejoras a través del sitio y Telegram.</p></article>
      </div>
    </section>

    <section className="about-available" aria-labelledby="about-available-title">
      <div>
        <p className="eyebrow">YA DISPONIBLE</p>
        <h2 id="about-available-title">Sigue el proyecto mientras crece</h2>
      </div>
      <div className="about-available-links">
        <Link href="/novedades"><strong>Novedades</strong><span>Actualizaciones, mantenimiento y cambios confirmados.</span><b aria-hidden="true">→</b></Link>
        {telegramHref && <a href={telegramHref} target="_blank" rel="noreferrer"><strong>Comunidad en Telegram</strong><span>Ayuda, sugerencias y comunicación de la plataforma.</span><b aria-hidden="true">→</b></a>}
        {settings.sponsors_enabled === "enabled" && <Link href="/patrocinadores"><strong>Sitios asociados</strong><span>Conoce proyectos y plataformas presentes en el directorio.</span><b aria-hidden="true">→</b></Link>}
      </div>
    </section>

    <section className="about-contact">
      <div>
        <p className="eyebrow">SÉ PARTE DEL COMIENZO</p>
        <h2>Chile3X está empezando. Tu experiencia puede ayudarnos a mejorarlo.</h2>
        <p>Crea una cuenta gratuita para preparar tu publicación o escríbenos por los canales oficiales si tienes una pregunta, detectas un problema o quieres proponer una mejora.</p>
        <div className="about-contact-actions"><Link className="button button-primary" href="/registro">Registrarme gratis</Link><Link className="button button-outline" href="/contacto">Contactar al equipo</Link></div>
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
