import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getCityPath, getProfileDisplayTags, type PublicProfile } from "@/lib/directory";

const typeLabel = {
  escort: "Escort",
  agency: "Agencia",
  rental: "Arriendo",
};

const visualTone = ["rose", "violet", "blue", "amber", "teal", "plum"];

function toneFor(value: string) {
  return visualTone[value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % visualTone.length];
}

export function PublicHeader() {
  return (
    <>
      <div className="age-strip"><span>+18</span>Este sitio está destinado exclusivamente a personas mayores de edad.</div>
      <header className="site-header public-header">
        <Link className="brand" href="/" aria-label="Chile3X, inicio"><Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} priority /></Link>
        <nav aria-label="Navegación principal">
          <Link href="/escorts">Escorts</Link>
          <Link href="/agencias">Agencias</Link>
          <Link href="/arriendos">Arriendos</Link>
          <Link href="/ingresar">Mi cuenta</Link>
        </nav>
        <Link className="button button-outline" href="/registro">Publicar perfil</Link>
      </header>
    </>
  );
}

export function DirectoryShell({ children }: { children: ReactNode }) {
  return <main className="directory-root"><PublicHeader />{children}<PublicFooter /></main>;
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <p>Chile3X es un directorio para personas adultas. Los acuerdos ocurren directamente entre visitantes y anunciantes.</p>
      <div><Link href="/escorts">Escorts</Link><Link href="/agencias">Agencias</Link><Link href="/arriendos">Arriendos</Link><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><Link href="/reglas-de-publicacion">Reglas</Link></div>
    </footer>
  );
}

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  const tags = getProfileDisplayTags(profile);
  const age = profile.details.metadata.age;
  const subtitle = [age ? `${age} años` : null, profile.comuna ?? profile.details.referenceLocation].filter(Boolean).join(" · ");

  return (
    <article className="public-profile-card">
      <Link href={`/perfil/${profile.slug}`} className={`public-profile-visual ${toneFor(profile.slug)}`} aria-label={`Ver perfil de ${profile.displayName}`}>
        <span className="public-profile-initial">{profile.displayName.slice(0, 1)}</span>
        <span className="public-type-label">{typeLabel[profile.type]}</span>
        {profile.isDemo && <span className="demo-label">DEMO</span>}
        {profile.isFeatured && <span className="featured-label">DESTACADA</span>}
      </Link>
      <div className="public-profile-content">
        <div className="public-profile-title">
          <div>
            <h2><Link href={`/perfil/${profile.slug}`}>{profile.displayName}</Link></h2>
            <p><Link href={getCityPath(profile.city)}>{profile.city}</Link>{subtitle && ` · ${subtitle}`}</p>
          </div>
          {profile.verificationStatus === "reviewed" && profile.type === "escort" && <span className="verified-sticker" title="Perfil comprobado">✓</span>}
        </div>
        <p className="public-profile-description">{profile.shortDescription}</p>
        <div className="public-tag-row">{tags.map((tag) => <span key={tag} className={`public-tag ${tag.toLowerCase().replaceAll(" ", "-")}`}>{tag}</span>)}</div>
        <div className="public-profile-meta"><span>{profile.region}</span>{profile.details.priceAmount !== null && <strong>Desde ${profile.details.priceAmount.toLocaleString("es-CL")} {profile.details.currency}</strong>}</div>
      </div>
    </article>
  );
}

export function ProfileGrid({ profiles, emptyMessage = "No hay perfiles que coincidan con estos filtros todavía." }: { profiles: PublicProfile[]; emptyMessage?: string }) {
  if (!profiles.length) {
    return <section className="directory-empty"><h2>Sin resultados</h2><p>{emptyMessage}</p></section>;
  }
  return <div className="public-profile-grid">{profiles.map((profile) => <ProfileCard key={profile.id} profile={profile} />)}</div>;
}

export function SeoContent({ city, count }: { city: string; count: number }) {
  return (
    <section className="seo-content">
      <p className="eyebrow">GUÍA LOCAL</p>
      <h2>Directorio adulto en {city}</h2>
      <p>Explora perfiles, agencias y arriendos disponibles en {city}. Cada publicación visible fue revisada antes de entrar al directorio.</p>
      <p>{count ? `Actualmente hay ${count} perfil${count === 1 ? "" : "es"} visible${count === 1 ? "" : "s"} en esta ciudad.` : "La disponibilidad se irá ampliando con nuevas publicaciones revisadas."}</p>
    </section>
  );
}
