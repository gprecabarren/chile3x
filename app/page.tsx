import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cityTotal, regions } from "./locations";

export const metadata: Metadata = {
  title: "Perfiles adultos por región y ciudad",
  description:
    "Explora Chile3X por región y ciudad. Directorio para adultos con perfiles, agencias y arriendos en todo Chile.",
};

const profiles = [
  { name: "Ámbar", slug: "ambar-providencia-demo", location: "Providencia, Metropolitana", tags: ["VIP", "Comprobada"], tone: "amber" },
  { name: "Valentina", slug: "valentina-vina-del-mar-demo", location: "Viña del Mar, Valparaíso", tags: ["Premium", "MILF"], tone: "violet" },
  { name: "Paola", slug: "paola-concepcion-demo", location: "Concepción, Biobío", tags: ["VIP", "TRANS"], tone: "rose" },
  { name: "Luna", slug: "luna-concepcion-demo", location: "Concepción, Biobío", tags: ["Masajes", "Comprobada"], tone: "blue" },
];

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

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directorySchema) }}
      />

      <div className="age-strip">
        <span>+18</span>
        Este sitio está destinado exclusivamente a personas mayores de edad.
        <a href="#reglas">Conocer reglas</a>
      </div>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Chile3X, inicio">
          <Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} priority />
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#cobertura">Regiones y ciudades</a>
          <Link href="/escorts">Escorts</Link>
          <Link href="/agencias">Agencias</Link>
          <Link href="/arriendos">Arriendos</Link>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#anunciate">Anúnciate</a>
          <a href="/ingresar">Mi cuenta</a>
        </nav>
        <a className="button button-outline" href="/registro">Publicar perfil</a>
      </header>

      <section className="hero" id="explorar">
        <div className="hero-copy">
          <p className="eyebrow">DIRECTORIO PARA ADULTOS · TODO CHILE</p>
          <h1>Chile completo, <em>en un mismo lugar.</em></h1>
          <p className="hero-text">
            Perfiles, agencias y arriendos en un espacio privado, claro y moderado. Comienza por tu región o ciudad.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/escorts">Explorar perfiles</Link>
            <a className="text-link" href="/registro">Quiero anunciarme <span>→</span></a>
          </div>
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
                {region.cities.map((city) => <li key={city}><Link href={`/escorts/${city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}>{city}</Link></li>)}
              </ul>
              {region.coverageNote && <p className="region-coverage-note">{region.coverageNote}</p>}
            </section>
          ))}
        </div>
        <p className="directory-note">La disponibilidad de perfiles se activará progresivamente por territorio tras la revisión de cada publicación.</p>
      </section>

      <section className="section listings-section">
        <div className="listings-intro">
          <p className="eyebrow">PUBLICACIONES DESTACADAS</p>
          <h2>Una vitrina más <em>confiable.</em></h2>
          <p>Las fichas públicas mostrarán información validada, etiquetas claras, fotos y videos previamente moderados.</p>
        </div>
        <div className="listing-grid">
          {profiles.map((profile) => (
            <article className="listing-card" key={profile.name}>
              <Link href={`/perfil/${profile.slug}`} className={`profile-visual ${profile.tone}`}>
                <span className="profile-initial">{profile.name.slice(0, 1)}</span>
                <span className="featured-label">DEMO</span>
              </Link>
              <div className="listing-content">
                <div className="listing-title">
                  <div>
                    <h3><Link href={`/perfil/${profile.slug}`}>{profile.name}</Link></h3>
                    <p>{profile.location}</p>
                  </div>
                  <button type="button" aria-label={`Guardar a ${profile.name}`}>♡</button>
                </div>
                <div className="tag-row">
                  {profile.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="demo-note">Perfiles ficticios de demostración: sirven para revisar las tarjetas, filtros y páginas públicas antes de recibir anuncios reales.</p>
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

      <footer id="reglas">
        <Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} />
        <p>Chile3X es un directorio para personas adultas. No interviene en acuerdos entre usuarios y anunciantes.</p>
        <span>© {new Date().getFullYear()} Chile3X · Solo mayores de 18 años</span>
      </footer>
    </main>
  );
}
