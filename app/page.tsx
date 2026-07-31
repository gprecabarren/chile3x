import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FloatingWhatsappButton, PortalContactLinks, PublicFooter, ProfileGrid } from "./directorio/_components";
import { StoryRail } from "./historias/StoryRail";
import { cityTotal, regions } from "./locations";
import { getCityEscortCounts, getFeaturedProfiles } from "@/lib/directory";
import { getActiveStories } from "@/lib/stories";

export const metadata: Metadata = {
  title: "Escorts en Chile",
  description:
    "Encuentra escorts en Chile por ciudad, región, categoría y servicios. Chile3X es un directorio para adultos con perfiles revisados.",
};

const features = [
  ["Perfiles revisados", "Cada publicación pasa por moderación antes de hacerse visible."],
  ["Cobertura territorial", "La navegación considera región y las ciudades iniciales definidas para el lanzamiento."],
  ["Contacto directo", "El portal muestra información; el acuerdo es directamente con el anunciante."],
];

const directorySchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Ciudades iniciales cubiertas por Chile3X",
  numberOfItems: cityTotal,
  itemListElement: regions.map((region, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: [region.title, region.cities.join(", ")].join(": "),
  })),
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Chile3X",
      url: "https://chile3x.cl",
      description: "Directorio para adultos con escorts, agencias y arriendos en Chile.",
    },
    {
      "@type": "WebSite",
      name: "Chile3X",
      url: "https://chile3x.cl",
      inLanguage: "es-CL",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://chile3x.cl/escorts?nombre={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stories, cityEscortCounts, featuredProfiles] = await Promise.all([getActiveStories(), getCityEscortCounts(), getFeaturedProfiles(6)]);
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directorySchema) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />

      <div className="age-strip">
        <span>+18</span>
        Este sitio está destinado exclusivamente a personas mayores de edad.
        <a href="#reglas">Conocer reglas</a>
      </div>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Chile3X, inicio">
          <Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} priority unoptimized />
        </Link>
        <nav className="public-navigation" aria-label="Navegación principal">
          <div className="public-navigation-group public-navigation-directory" aria-label="Directorio">
            <a href="#cobertura">Regiones y ciudades</a>
            <Link href="/escorts">Escorts</Link>
            <Link href="/agencias">Agencias</Link>
            <Link href="/arriendos">Arriendos</Link>
          </div>
          <div className="public-navigation-group public-navigation-site" aria-label="Información y cuenta">
            <Link href="/quienes-somos">Quiénes somos</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contacto">Contacto</Link>
            <a href="/ingresar">Mi cuenta</a>
          </div>
        </nav>
        <PortalContactLinks placement="header" />
        <a className="button button-outline" href="/registro">Publicar perfil</a>
      </header>

      <section className="hero" id="explorar">
        <div className="hero-copy">
          <p className="eyebrow">DIRECTORIO DE ESCORTS · TODO CHILE</p>
          <h1>Escorts en Chile, <em>en un mismo lugar.</em></h1>
          <p className="hero-text">
            Directorio de escorts, agencias y arriendos para adultos. Explora perfiles por región, ciudad, categoría y servicios.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/escorts">Explorar perfiles</Link>
            <a className="text-link" href="/registro">Quiero anunciarme <span>→</span></a>
          </div>
          <form className="home-search" action="/escorts" method="get" role="search">
            <label htmlFor="home-profile-search">Buscar escort por nombre</label>
            <div><input id="home-profile-search" name="nombre" type="search" minLength={2} maxLength={80} placeholder="Ej. Tomás, Valentina..." /><button type="submit">Buscar</button></div>
          </form>
          <div className="trust-row">
            <span><b>✓</b> Moderación manual</span>
            <span><b>✓</b> Cobertura nacional</span>
            <span><b>✓</b> Adultos +18</span>
          </div>
        </div>
        <aside className="hero-card" aria-label="Cobertura territorial de Chile3X">
          <p className="card-kicker">COBERTURA INICIAL</p>
          <h2>Encuentra por territorio.</h2>
          <div className="coverage-stat">
            <strong>16</strong>
            <span>regiones de Chile</span>
          </div>
          <div className="coverage-stat">
            <strong>{cityTotal}</strong>
            <span>ciudades y comunas iniciales</span>
          </div>
          <p className="hero-card-note">Desde Arica y Parinacota hasta Magallanes y la Antártica Chilena.</p>
          <a className="button button-primary card-action" href="#cobertura">Explorar cobertura</a>
        </aside>
      </section>

      <section className="home-photo-banner" aria-label="Chile3X, directorio adulto en Chile">
        <Image src="/chile3x-hero-banner.jpg" alt="" fill sizes="100vw" unoptimized />
        <div><p className="eyebrow">CHILE3X</p><h2>Un espacio adulto, <em>privado y claro.</em></h2><p>Encuentra publicaciones revisadas y contacta directamente a cada anunciante.</p><Link className="button button-outline" href="/escorts">Ver directorio nacional</Link></div>
      </section>

      <StoryRail stories={stories} />

      <section className="section directory-section" id="cobertura">
        <div className="section-heading directory-heading">
          <div>
            <p className="eyebrow">COBERTURA TERRITORIAL</p>
            <h2>Todas las regiones,<br /><em>ciudades iniciales.</em></h2>
          </div>
          <p>
            Recorre Chile de norte a sur. Este directorio muestra las {cityTotal} ciudades y comunas iniciales definidas para el lanzamiento, agrupadas por región.
          </p>
        </div>

        <nav className="region-index" aria-label="Índice de regiones">
          {regions.map((region, index) => (
            <a href={`#${region.id}`} key={region.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {region.shortTitle}
            </a>
          ))}
        </nav>

        <div className="regional-grid">
          {regions.map((region, index) => (
            <section className="region-card" id={region.id} key={region.id}>
              <div className="region-card-heading">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{region.title}</h3>
                  <p>{region.cities.length === 1 ? "1 ciudad" : `${region.cities.length} ciudades`}</p>
                </div>
              </div>
              <ul className="commune-list" aria-label={`Ciudades de ${region.title}`}>
                {region.cities.map((city) => <li key={city}><Link href={`/escorts/${city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}>{city} <span className="city-count">({cityEscortCounts.get(city) ?? 0})</span></Link></li>)}
              </ul>
              {region.coverageNote && <p className="region-coverage-note">{region.coverageNote}</p>}
            </section>
          ))}
        </div>
        <p className="directory-note">La disponibilidad de perfiles se activará progresivamente por territorio tras la revisión de cada publicación.</p>
      </section>

      <section className="section listings-section">
        <div className="listings-intro">
          <p className="eyebrow">ESCORTS DESTACADAS</p>
          <h2>Lo más visto <em>del directorio.</em></h2>
          <p>Se priorizan las escorts con más visualizaciones únicas recientes. El equipo puede destacar avisos revisados de forma manual cuando sea necesario.</p>
        </div>
        {featuredProfiles.length ? <ProfileGrid profiles={featuredProfiles} emptyMessage="Aún no hay escorts destacadas." /> : <p className="demo-note">Las escorts destacadas aparecerán aquí cuando existan perfiles publicados y visualizaciones registradas.</p>}
      </section>

      <section className="section process-section" id="como-funciona">
        <div className="process-poster">
          <p>CHILE3X</p>
          <strong>Privado.<br />Visible.<br /><i>Tuyo.</i></strong>
          <span>DIRECTORIO ADULTO · +18</span>
        </div>
        <div className="process-copy">
          <p className="eyebrow">HECHO PARA CRECER CON ORDEN</p>
          <h2>Más control para quien publica.</h2>
          <div className="feature-list">
            {features.map(([title, description], index) => (
              <div className="feature" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="announce-section" id="anunciate">
        <div>
          <p className="eyebrow">PRÓXIMAMENTE</p>
          <h2>¿Quieres aparecer en Chile3X?</h2>
          <p>La apertura inicial será con revisión manual y publicaciones de cortesía para construir una comunidad segura.</p>
        </div>
        <a className="button button-light" href="/registro">Crear cuenta</a>
      </section>

      <PublicFooter />
      <FloatingWhatsappButton />
    </main>
  );
}
