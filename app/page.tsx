import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Encuentra perfiles en todo Chile",
  description:
    "Chile3X reúne perfiles, agencias y arriendos para adultos en todas las regiones de Chile.",
};

const zones = [
  { region: "Norte", cities: "Arica · Iquique · Antofagasta · La Serena", count: "124 perfiles" },
  { region: "Centro", cities: "Valparaíso · Viña del Mar · Rancagua · Talca", count: "198 perfiles" },
  { region: "Metropolitana", cities: "Santiago · Providencia · Las Condes · Maipú", count: "362 perfiles" },
  { region: "Sur", cities: "Concepción · Temuco · Valdivia · Puerto Montt", count: "146 perfiles" },
];

const profiles = [
  { name: "Ámbar", location: "Providencia, RM", tags: ["VIP", "Verificada"], tone: "amber" },
  { name: "Isidora", location: "Viña del Mar, V", tags: ["Premium", "Video"], tone: "violet" },
  { name: "Luna", location: "Concepción, VIII", tags: ["VIP", "Disponible"], tone: "rose" },
  { name: "Valentina", location: "Antofagasta, II", tags: ["Premium", "Verificada"], tone: "blue" },
];

const features = [
  ["Perfiles revisados", "Cada publicación pasa por moderación antes de hacerse visible."],
  ["Todo Chile", "Navegación por región, ciudad, comuna y filtros combinables."],
  ["Contacto directo", "El portal muestra información; el acuerdo es directamente con el anunciante."],
];

export default function Home() {
  return (
    <main>
      <div className="age-strip">
        <span>+18</span>
        Este sitio está destinado exclusivamente a personas mayores de edad.
        <a href="#reglas">Conocer reglas</a>
      </div>

      <header className="site-header">
        <Link className="brand" href="/" aria-label="Chile3X, inicio">
          <Image src="/chile3x-logo-dark.jpeg" alt="Chile3X" width={1025} height={576} priority />
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#explorar">Explorar</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#anunciate">Anúnciate</a>
        </nav>
        <a className="button button-outline" href="#anunciate">Publicar perfil</a>
      </header>

      <section className="hero" id="explorar">
        <div className="hero-copy">
          <p className="eyebrow">DIRECTORIO PARA ADULTOS · TODO CHILE</p>
          <h1>Encuentra lo que buscas, <em>cerca de ti.</em></h1>
          <p className="hero-text">
            Perfiles, agencias y arriendos en un espacio privado, claro y moderado.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#zonas">Ver perfiles por ciudad</a>
            <a className="text-link" href="#anunciate">Quiero anunciarme <span>→</span></a>
          </div>
          <div className="trust-row">
            <span><b>✓</b> Perfiles moderados</span>
            <span><b>✓</b> Disponible 24/7</span>
            <span><b>✓</b> Adultos +18</span>
          </div>
        </div>
        <div className="hero-card" aria-label="Filtros de búsqueda de ejemplo">
          <p className="card-kicker">EXPLORA EN CHILE</p>
          <h2>Busca a tu manera</h2>
          <label>
            Ubicación
            <button className="select-preview" type="button">Todo Chile <span>⌄</span></button>
          </label>
          <label>
            Tipo de aviso
            <button className="select-preview" type="button">Todos los perfiles <span>⌄</span></button>
          </label>
          <div className="filter-chips">
            <button type="button">Verificadas</button>
            <button type="button">Con video</button>
            <button type="button">VIP</button>
          </div>
          <button className="button button-primary card-action" type="button">Buscar perfiles</button>
        </div>
      </section>

      <section className="section zones-section" id="zonas">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ELIGE TU ZONA</p>
            <h2>Chile completo,<br />a un paso.</h2>
          </div>
          <p>Comienza por una región o ciudad. La búsqueda avanzada llegará desde la primera versión.</p>
        </div>
        <div className="zone-grid">
          {zones.map((zone, index) => (
            <a className="zone-card" href="#anunciate" key={zone.region}>
              <span className="zone-number">0{index + 1}</span>
              <div>
                <h3>{zone.region}</h3>
                <p>{zone.cities}</p>
              </div>
              <small>{zone.count} <b>→</b></small>
            </a>
          ))}
        </div>
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
                <span>0{index + 1}</span>
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
        <Image src="/chile3x-logo-dark.jpeg" alt="Chile3X" width={1025} height={576} />
        <p>Chile3X es un directorio para personas adultas. No interviene en acuerdos entre usuarios y anunciantes.</p>
        <span>© {new Date().getFullYear()} Chile3X · Solo mayores de 18 años</span>
      </footer>
    </main>
  );
}
