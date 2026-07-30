import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { communeTotal, regions } from "./locations";

export const metadata: Metadata = {
  title: "Perfiles adultos por región y comuna",
  description:
    "Explora Chile3X por región y comuna. Directorio para adultos con perfiles, agencias y arriendos en todo Chile.",
};

const profiles = [
  { name: "Ámbar", location: "Providencia, Metropolitana", tags: ["VIP", "Verificada"], tone: "amber" },
  { name: "Isidora", location: "Viña del Mar, Valparaíso", tags: ["Premium", "Video"], tone: "violet" },
  { name: "Luna", location: "Concepción, Biobío", tags: ["VIP", "Disponible"], tone: "rose" },
  { name: "Valentina", location: "Antofagasta, Antofagasta", tags: ["Premium", "Verificada"], tone: "blue" },
];

const features = [
  ["Perfiles revisados", "Cada publicación pasa por moderación antes de hacerse visible."],
  ["Cobertura territorial", "La navegación considera región, ciudad y comuna desde la primera versión."],
  ["Contacto directo", "El portal muestra información; el acuerdo es directamente con el anunciante."],
];

const directorySchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Comunidades y comunas cubiertas por Chile3X",
  numberOfItems: communeTotal,
  itemListElement: regions.map((region, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: [region.title, region.communes.join(", ")].join(": "),
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
          <a href="#cobertura">Regiones y comunas</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#anunciate">Anúnciate</a>
        </nav>
        <a className="button button-outline" href="#anunciate">Publicar perfil</a>
      </header>

      <section className="hero" id="explorar">
        <div className="hero-copy">
          <p className="eyebrow">DIRECTORIO PARA ADULTOS · TODO CHILE</p>
          <h1>Chile completo, <em>en un mismo lugar.</em></h1>
          <p className="hero-text">
            Perfiles, agencias y arriendos en un espacio privado, claro y moderado. Comienza por tu región o comuna.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#cobertura">Ver regiones y comunas</a>
            <a className="text-link" href="#anunciate">Quiero anunciarme <span>→</span></a>
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
            <strong>{communeTotal}</strong>
            <span>comunas ordenadas para explorar</span>
          </div>
          <p className="hero-card-note">Desde Arica y Parinacota hasta Magallanes y la Antártica Chilena.</p>
          <a className="button button-primary card-action" href="#cobertura">Explorar cobertura</a>
        </aside>
      </section>

      <section className="section directory-section" id="cobertura">
        <div className="section-heading directory-heading">
          <div>
            <p className="eyebrow">COBERTURA TERRITORIAL</p>
            <h2>Todas las regiones,<br /><em>todas las comunas.</em></h2>
          </div>
          <p>
            Recorre Chile de norte a sur. Este directorio muestra las {communeTotal} comunas agrupadas por región para que la búsqueda sea directa, clara y útil.
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
                  <p>{region.communes.length} comunas</p>
                </div>
              </div>
              <ul className="commune-list" aria-label={`Comunas de ${region.title}`}>
                {region.communes.map((commune) => <li key={commune}>{commune}</li>)}
              </ul>
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
              <div className={`profile-visual ${profile.tone}`}>
                <span className="profile-initial">{profile.name.slice(0, 1)}</span>
                <span className="featured-label">DESTACADA</span>
              </div>
              <div className="listing-content">
                <div className="listing-title">
                  <div>
                    <h3>{profile.name}</h3>
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
        <p className="demo-note">Vista de demostración: los perfiles y cifras se activarán tras la etapa de verificación.</p>
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
        <a className="button button-light" href="#reglas">Conocer el proceso</a>
      </section>

      <footer id="reglas">
        <Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} />
        <p>Chile3X es un directorio para personas adultas. No interviene en acuerdos entre usuarios y anunciantes.</p>
        <span>© {new Date().getFullYear()} Chile3X · Solo mayores de 18 años</span>
      </footer>
    </main>
  );
}
