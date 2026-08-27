import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getCityPath, getProfileDisplayTags, type PublicProfile } from "@/lib/directory";
import { profilePublicPath, readProfilePrices } from "@/lib/profile";
import { getPortalContacts, getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings } from "@/lib/site-settings";
import { formatRegionName, regions } from "@/app/locations";
import { PublicMobileMenu } from "./PublicMobileMenu";
import { GooglePreferredSourceLink } from "@/app/GooglePreferredSourceLink";

const typeLabel = {
  escort: "Escort",
  agency: "Agencia",
  rental: "Arriendo",
};

const visualTone = ["rose", "violet", "blue", "amber", "teal", "plum"];
const oadBadgeImage = "data:image/jpeg;base64,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";

const angelisNetBadgeImage = "https://static4.dditscdn.com/cob/site/lsl/206878/image/picture/logo.png?vpd6ls";
const laEstokadaBadgeImage = "https://www.laestokada.cl/foro/uploads/monthly_2019_08/LogoWeb.png.610d962af3641fb72ff0fc47e84fb4ac.png";

function toneFor(value: string) {
  return visualTone[value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % visualTone.length];
}

export async function PublicHeader() {
  return (
    <>
      <div className="age-strip"><span>+18</span>Este sitio está destinado exclusivamente a personas mayores de edad.</div>
      <header className="site-header public-header">
        <Link className="brand" href="/" aria-label="Chile3X, inicio"><Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} priority unoptimized /></Link>
        <nav className="public-navigation" aria-label="Navegación principal">
          <div className="public-navigation-group public-navigation-directory" aria-label="Directorio">
            <Link href="/#cobertura">Regiones y ciudades</Link>
            <Link href="/escorts">Escorts</Link>
            <Link href="/agencias">Agencias</Link>
            <Link href="/arriendos">Arriendos</Link>
          </div>
          <div className="public-navigation-group public-navigation-site" aria-label="Información y cuenta">
            <Link href="/quienes-somos">Quiénes somos</Link>
            <Link href="/noticias">Noticias</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contacto">Contacto</Link>
            <Link href="/ingresar">Mi cuenta</Link>
          </div>
        </nav>
        <PortalContactLinks placement="header" />
        <PublicMobileMenu coverageHref="/#cobertura" />
        <Link className="button button-outline" href="/registro">Publicar perfil</Link>
      </header>
    </>
  );
}

export function DirectoryShell({ children }: { children: ReactNode }) {
  return <main className="directory-root"><PublicHeader />{children}<PublicFooter /><FloatingWhatsappButton /></main>;
}

export async function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-brand"><Link className="public-footer-logo" href="/" aria-label="Chile3X, inicio"><Image src="/chile3x-logo-primary.jpeg" alt="Chile3X" width={800} height={225} unoptimized /></Link><p>Directorio para adultos. Los acuerdos ocurren directamente entre visitantes y anunciantes.</p></div>
      <div className="public-footer-navigation">
        <div><strong>DIRECTORIO</strong><Link href="/escorts">Escorts</Link><Link href="/agencias">Agencias</Link><Link href="/arriendos">Arriendos</Link></div>
        <div><strong>INFORMACIÓN</strong><Link href="/quienes-somos">Quiénes somos</Link><Link href="/noticias">Noticias</Link><Link href="/faq">Preguntas frecuentes</Link><Link href="/contacto">Contacto</Link><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><Link href="/reglas-de-publicacion">Reglas de publicación</Link></div>
      </div>
      <div className="public-footer-extras">
        <div><strong>SÍGUENOS</strong><PortalContactLinks placement="footer" /></div>
        <div className="public-footer-partners"><strong>DIRECTORIOS ASOCIADOS</strong><div className="public-footer-partner-badges"><OadBadge /><AngelisNetBadge /><LaEstokadaBadge /></div></div>
      </div>
      <div className="public-footer-bottom"><span>© {new Date().getFullYear()} Chile3X · Solo mayores de 18 años</span><span>Chile · Directorio para adultos</span></div>
      <div className="public-footer-preferred-source"><GooglePreferredSourceLink /></div>
    </footer>
  );
}

export async function PortalContactLinks({ placement }: { placement: "header" | "footer" }) {
  const contacts = getPortalContacts(await getSiteSettings());
  if (contacts.length === 0) return null;
  return <div className={`portal-contact-links portal-contact-links-${placement}`} aria-label="Canales oficiales de Chile3X">{contacts.map((contact) => <a key={contact.key} className={`portal-contact-link portal-contact-${contact.key}`} href={contact.href} target={contact.external ? "_blank" : undefined} rel={contact.external ? "noreferrer" : undefined} aria-label={contact.label} title={contact.label}><PortalContactIcon kind={contact.key} /><span className="sr-only">{contact.label}</span></a>)}</div>;
}

export function PortalContactIcon({ kind }: { kind: "whatsapp" | "telegram" | "instagram" | "email" | "call" | "arsmate" | "onlyfans" | "videocall" }) {
  if (kind === "whatsapp") return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 3.25a12.7 12.7 0 0 0-10.92 19.2L3.7 28.75l6.5-1.7A12.73 12.73 0 1 0 16 3.25Zm0 2.45a10.27 10.27 0 1 1-5.12 19.17l-.5-.3-3.86 1.01 1.03-3.75-.33-.53A10.27 10.27 0 0 1 16 5.7Zm-4.21 4.87c-.36 0-.73.1-1 .43-.28.34-1.08 1.05-1.08 2.56 0 1.5 1.1 2.95 1.25 3.16.15.2 2.14 3.43 5.2 4.81 2.56 1.16 3.08.93 3.64.87.56-.05 1.8-.74 2.05-1.45.25-.72.25-1.33.18-1.46-.08-.13-.28-.2-.59-.36-.3-.15-1.8-.89-2.08-.99-.28-.1-.49-.15-.7.15-.2.3-.8.99-.98 1.2-.18.2-.36.23-.67.08-.3-.16-1.3-.48-2.47-1.54-.92-.83-1.54-1.85-1.72-2.16-.18-.3-.02-.47.13-.62.14-.14.31-.36.46-.54.15-.18.2-.3.3-.51.1-.2.05-.38-.02-.54-.08-.15-.7-1.7-.96-2.32-.25-.61-.5-.53-.7-.54h-.58Z" fill="currentColor" /></svg>;
  if (kind === "telegram") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m21.15 3.37-18.3 7.06c-1.25.5-1.24 1.2-.23 1.5l4.7 1.47 1.82 5.57c.22.61.11.85.75.85.49 0 .7-.22.98-.48l2.28-2.22 4.74 3.5c.88.49 1.5.24 1.72-.82l3.12-14.68c.32-1.3-.5-1.89-1.58-1.4Zm-11.97 9.55 10.88-6.87c.55-.33 1.05-.15.64.21l-9.33 8.42-.36 3.82-1.93-5.58Z" fill="currentColor" /></svg>;
  if (kind === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.7" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor" /></svg>;
  if (kind === "email") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m4.5 7 7.5 5.5L19.5 7" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
  if (kind === "call") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.1 3.8 9.8 3c.65-.2 1.31.16 1.53.8l1.04 3.09c.19.57.02 1.2-.44 1.59l-1.38 1.16a13.9 13.9 0 0 0 3.83 3.83l1.16-1.38c.39-.46 1.02-.63 1.59-.44l3.09 1.04c.64.22 1 .88.8 1.53l-.8 2.7c-.2.66-.8 1.1-1.49 1.08C10.4 18.71 5.29 13.6 4.02 5.3c-.1-.68.32-1.3.99-1.5Z" fill="currentColor" /></svg>;
  if (kind === "videocall") return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="6" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m16 10 5-3v10l-5-3Z" fill="currentColor" /></svg>;
  if (kind === "arsmate") return <>
    {/* El recurso se sirve desde Arsmate para conservar su marca oficial vigente. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="arsmate-brand-mark" src="https://arsmate.com/LOGO-CELESTE.png" alt="" />
  </>;
  return <span className="arsmate-icon" aria-hidden="true">OF</span>;
}

export async function FloatingWhatsappButton() {
  const settings = await getSiteSettings();
  const href = getPortalWhatsappLink(settings.contact_whatsapp);
  if (!href) return null;
  return <a className="floating-whatsapp" href={href} target="_blank" rel="noreferrer" aria-label="Escribir al WhatsApp de Chile3X" title="WhatsApp de Chile3X">
    <PortalContactIcon kind="whatsapp" />
  </a>;
}

export function OadBadge() {
  return <a className="oad-badge" href="https://openadultdirectory.com/escorts/" target="_blank" rel="noreferrer" aria-label="Ver Chile3X en Open Adult Directory">
    {/* La insignia se mantiene sin optimización para no generar transformaciones ni cobros de imágenes. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={oadBadgeImage} alt="Listed on Open Adult Directory" />
  </a>;
}

export function AngelisNetBadge() {
  return <a className="angelisnet-badge" href="https://www.angelisnet.com" target="_blank" rel="noreferrer" aria-label="Visitar AngelisNET">
    {/* El logo oficial se sirve desde AngelisNET para mantener la insignia vigente. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={angelisNetBadgeImage} alt="Adult Live Sex Cams - AngelisNET" />
  </a>;
}

export function LaEstokadaBadge() {
  return <a className="laestokada-badge" href="https://www.laestokada.cl/foro/" target="_blank" rel="noreferrer" aria-label="Visitar el foro La EstoKada">
    {/* El logo oficial se sirve desde La EstoKada para conservar la insignia vigente. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={laEstokadaBadgeImage} alt="Foro La EstoKada" loading="lazy" />
  </a>;
}

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  const tags = getProfileDisplayTags(profile);
  const tierTag = profile.type === "escort" ? tags[0] ?? "Gold" : null;
  const detailTags = profile.type === "escort" ? tags.slice(1) : [];
  const age = profile.details.metadata.age;
  const subtitle = [age ? `${age} años` : null, profile.comuna ?? profile.details.referenceLocation].filter(Boolean).join(" · ");
  const mainPrice = readProfilePrices(profile.details)[0];
  const coverImage = profile.media.find((media) => media.mediaType === "image" && media.isProfilePhoto) ?? profile.media.find((media) => media.mediaType === "image");
  const profileHref = profilePublicPath(profile);

  return (
    <article className="public-profile-card">
      <Link href={profileHref} className={`public-profile-visual ${toneFor(profile.slug)}${coverImage ? " has-image" : ""}`} aria-label={`Ver perfil de ${profile.displayName}`}>
        {coverImage ? <Image className="public-profile-image" src={coverImage.url} alt={coverImage.altText ?? `Foto de ${profile.displayName}`} fill unoptimized sizes="(max-width: 360px) 100vw, (max-width: 720px) 50vw, (max-width: 1040px) 33vw, 25vw" /> : <span className="public-profile-initial">{profile.displayName.slice(0, 1)}</span>}
        <span className="public-type-label">{typeLabel[profile.type]}</span>
        {tierTag && <span className={`public-card-tier-badge ${tierTag.toLowerCase()}`}>{tierTag}</span>}
        {detailTags.length > 0 && <span className="public-card-detail-badges" aria-label={`Etiquetas: ${detailTags.join(", ")}`}>{detailTags.map((tag) => <span key={tag} className={`public-card-badge ${tag.toLowerCase().replaceAll(" ", "-")}`}>{tag}</span>)}</span>}
        {profile.isFeatured && <span className="featured-label">DESTACADA</span>}
      </Link>
      <div className="public-profile-content">
        <div className="public-profile-title">
          <div>
            <h3><Link href={profileHref}>{profile.displayName}</Link>{profile.verificationStatus === "reviewed" && profile.type === "escort" && <span className="verified-sticker" title="Perfil comprobado" aria-label="Perfil comprobado">✓</span>}</h3>
            {profile.handle && <small className="public-profile-handle">@{profile.handle}</small>}
            <p><Link href={getCityPath(profile.city)}>{profile.city}</Link>{subtitle && ` · ${subtitle}`}</p>
          </div>
        </div>
        <p className="public-profile-description">{profile.shortDescription}</p>
        <div className="public-profile-meta"><span>{formatRegionName(profile.region)}</span>{mainPrice && <strong>{mainPrice.label} · ${mainPrice.amount.toLocaleString("es-CL")} {mainPrice.currency}</strong>}</div>
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

type CityProfileSectionsProps = {
  city: string;
  profiles: PublicProfile[];
};

function CityProfileSection({ title, description, profiles }: { title: string; description: string; profiles: PublicProfile[] }) {
  return <details className="city-profile-section" open>
    <summary>
      <span><strong>{title}</strong><small>{description}</small></span>
      <b>{profiles.length}</b>
    </summary>
    <div className="city-profile-section-content">
      {profiles.length > 0 ? <ProfileGrid profiles={profiles} /> : <p>No hay publicaciones visibles en esta sección todavía.</p>}
    </div>
  </details>;
}

export function CityProfileSections({ city, profiles }: CityProfileSectionsProps) {
  const escorts = profiles.filter((profile) => profile.type === "escort");
  const sections = [
    ["VIP", "Escorts con categoría VIP", escorts.filter((profile) => profile.tier === "vip")],
    ["Premium", "Escorts con categoría Premium", escorts.filter((profile) => profile.tier === "premium")],
    ["Gold", "Escorts con categoría Gold", escorts.filter((profile) => profile.tier === "gold")],
    ["Agencias", "Agencias visibles en la ciudad", profiles.filter((profile) => profile.type === "agency")],
    ["Masajes", "Escorts con la etiqueta Masajes; también aparecen en su categoría de visibilidad", escorts.filter((profile) => profile.tags.includes("masajes"))],
    ["Arriendos", "Arriendos visibles en la ciudad", profiles.filter((profile) => profile.type === "rental")],
  ] as const;

  return <section className="city-profile-sections" aria-label={`Publicaciones en ${city}`}>
    {sections.map(([title, description, sectionProfiles]) => <CityProfileSection key={title} title={title} description={description} profiles={sectionProfiles} />)}
  </section>;
}

export function SeoContent({ city, region, count }: { city: string; region: string; count: number }) {
  const nearbyCities = regions.find((item) => item.title === region)?.cities.filter((item) => item !== city) ?? [];
  return (
    <section className="seo-content">
      <p className="eyebrow">GUÍA LOCAL</p>
      <h2>Escorts en {city}: directorio local</h2>
      <p>Explora escorts en {city}, además de agencias y arriendos publicados para personas adultas. Cada aviso visible pasa por revisión antes de entrar al directorio de Chile3X.</p>
      <p>{count ? `Actualmente hay ${count} perfil${count === 1 ? "" : "es"} visible${count === 1 ? "" : "s"} en ${city}; utiliza los filtros para comparar categorías, atributos y servicios.` : `La disponibilidad de escorts en ${city} se irá ampliando con nuevas publicaciones revisadas.`}</p>
      <nav className="seo-content-links" aria-label={`Explorar escorts cerca de ${city}`}><Link href="/escorts">Ver escorts en Chile</Link>{nearbyCities.map((nearbyCity) => <Link href={getCityPath(nearbyCity)} key={nearbyCity}>Escorts en {nearbyCity}</Link>)}</nav>
    </section>
  );
}
