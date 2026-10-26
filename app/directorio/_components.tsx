import { PortalContactIcon } from "@/app/PortalContactIcon";
import { ActionButton } from "@/app/ActionButton";
import Link from "@/app/NavigationLink";
import Image from "next/image";
import { publicProfileAge } from "@/lib/profile-age";
import { isContentOnly, sellsContent, publicProfileTypeLabel, profileMatchesDirectoryCategory } from "@/lib/profile-content-category";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getCurrentAdmin, getCurrentUser, getSessionCookieName, getUserSessionCookieName, type AccountUser } from "@/lib/auth";
import { getCityPath, getProfileDisplayTags, type PublicProfile } from "@/lib/directory";
import { profilePublicPath, readProfilePrices, type Tier } from "@/lib/profile";
import { getPortalContacts } from "@/lib/site-contacts";
import { publicWhatsappContacts, WHATSAPP_TEXT_LIMITS, type WhatsappPlacement } from "@/lib/portal-whatsapp";
import { FloatingWhatsappMenu } from "@/app/FloatingWhatsappMenu";
import type { AdvertiserWhatsapp } from "@/app/FloatingWhatsappMenu";
import { PortalWhatsappLink } from "@/app/PortalWhatsappLink";
import { getSiteSettings } from "@/lib/site-settings";
import { formatRegionName, getRegionByTitle } from "@/app/locations";
import { PublicMobileMenu } from "./PublicMobileMenu";
import { ADMIN_ACCESS_LABELS } from "@/lib/admin-permissions";
import { PresenceHeartbeat } from "@/app/PresenceHeartbeat";
import { ProfileOnlineBadge } from "@/app/ProfileOnlineBadge";
import { DirectoryCityBar } from "./DirectoryCityBar";
import { countUnreadMessages } from "@/lib/internal-messages";
import { MessageNotifications, PendingReviewsNotice, UnreadMessagesNotice } from "@/app/MessageNotifications";
import { countPendingReceivedReviews } from "@/lib/profile-interactions";
import { PublicNavigationLink as NavLink } from "./PublicNavigationLink";

const visualTone = ["rose", "violet", "blue", "amber", "teal", "plum"];
const priceFormatter = new Intl.NumberFormat("es-CL");
const oadBadgeImage = "data:image/jpeg;base64,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";

const angelisNetBadgeImage = "/assets/angelisnet-logo-vpd6ls.webp";
const laEstokadaBadgeImage = "https://www.laestokada.cl/foro/uploads/monthly_2019_08/LogoWeb.png.610d962af3641fb72ff0fc47e84fb4ac.png";

function toneFor(value: string) {
  return visualTone[value.split("").reduce((total, character) => total + character.charCodeAt(0), 0) % visualTone.length];
}

type PublicHeaderProps = {
  coverageHref?: string;
};

function publicSessionLabel(user: AccountUser) {
  return user.role === "admin" ? user.displayName?.trim() || "Administración" : user.email;
}

export async function PublicHeader({ coverageHref = "/#cobertura" }: PublicHeaderProps = {}) {
  const cookieStore = await cookies();
  const settings = await getSiteSettings();
  const hasPotentialUserSession = Boolean(cookieStore.get(getUserSessionCookieName())?.value);
  const hasPotentialAdminSession = Boolean(cookieStore.get(getSessionCookieName())?.value);
  // Las consultas solo ocurren si existe una cookie. Así la cabecera puede
  // mostrar datos reales a la persona conectada sin añadir consultas a cada
  // visita pública anónima.
  const [currentUser, currentAdmin] = await Promise.all([
    hasPotentialUserSession ? getCurrentUser() : Promise.resolve(null),
    hasPotentialAdminSession ? getCurrentAdmin() : Promise.resolve(null),
  ]);
  const hasUserSession = Boolean(currentUser);
  const [unreadMessages, pendingReviews] = currentUser ? await Promise.all([countUnreadMessages(currentUser.id), countPendingReceivedReviews(currentUser.id)]) : [0, 0];
  const hasAdminSession = Boolean(currentAdmin);
  const sessionUser = currentUser ?? currentAdmin;
  const sessionAccountHref = currentUser ? "/mi-cuenta" : currentAdmin ? "/admin" : "/ingresar";
  const sessionAccountLabel = currentUser ? "Mi cuenta" : currentAdmin ? "Administración" : "Iniciar sesión";
  const hasAnySession = hasUserSession || hasAdminSession;
  const sessionPrimary = currentAdmin
    ? `@${currentAdmin.githubLogin} · ${ADMIN_ACCESS_LABELS[currentAdmin.accessLevel]}`
    : sessionUser ? publicSessionLabel(sessionUser) : "";
  const sessionSecondary = currentAdmin
    ? "Panel administrativo"
    : sessionUser ? "Panel de usuario" : "";

  return (
    <>
      <div className="age-strip"><span>+18</span>Este sitio está destinado exclusivamente a personas mayores de edad.</div>
      <header className={`site-header public-header${hasAnySession ? " has-session" : ""}`}>
        <Link className="brand" href="/" aria-label="Chile3X, inicio"><Image src="/assets/chile3x-logo-primary-320-20260923.webp" alt="Chile3X" width={320} height={112} priority unoptimized /></Link>
        <div className="public-navigation-stack">
          <nav className="public-navigation" aria-label="Navegación principal">
            <div className="public-navigation-group public-navigation-directory" aria-label="Directorio">
              <NavLink href="/#cobertura">Regiones y ciudades</NavLink>
              <NavLink href="/escorts">Escorts</NavLink>
              <NavLink href="/agencias">Agencias</NavLink>
              <NavLink href="/arriendos">Arriendos</NavLink>
            </div>
            <div className="public-navigation-group public-navigation-site" aria-label="Información y cuenta">
              <NavLink href="/quienes-somos">Quiénes somos</NavLink>
              <NavLink href="/noticias">Noticias</NavLink>
              <NavLink href="/novedades">Novedades</NavLink>
              <NavLink href="/faq">FAQ</NavLink>
              <NavLink href="/contacto">Contacto</NavLink>
              <NavLink className={!hasAnySession ? "public-login-link" : undefined} href={sessionAccountHref}>{sessionAccountLabel}</NavLink>
            </div>
          </nav>
          <PortalContactLinks placement="header" />
        </div>
        {sessionUser && <Link className="public-account-summary" href={sessionAccountHref} aria-label={`Abrir ${sessionAccountLabel.toLowerCase()}`}>
          <span>{currentUser ? "SESIÓN ACTIVA" : "SESIÓN ADMINISTRATIVA"}</span>
          <strong>{sessionPrimary}</strong>
          <small>{sessionSecondary}</small>
        </Link>}
        {(hasUserSession || hasAdminSession) && <div className="public-session-actions" aria-label="Sesiones activas">
          {hasUserSession && <form action="/api/auth/session/logout" method="post"><ActionButton type="submit">Cerrar sesión</ActionButton></form>}
          {hasAdminSession && <form action="/api/auth/logout" method="post"><ActionButton className="public-admin-logout" type="submit">Cerrar sesión administrador</ActionButton></form>}
        </div>}
        <PublicMobileMenu
          hasUserSession={hasUserSession}
          hasAdminSession={hasAdminSession}
          showSponsors={settings.sponsors_enabled === "enabled"}
          session={sessionUser ? {
            label: sessionPrimary,
            username: sessionUser.username,
            email: sessionUser.email,
            accountHref: sessionAccountHref,
            accountLabel: sessionAccountLabel,
            isAdmin: !currentUser && Boolean(currentAdmin),
            detail: sessionSecondary,
          } : null}
        />
        <nav className="mobile-public-quick-links" aria-label="Accesos rápidos">
          <NavLink className="mobile-directory-regions" href={coverageHref}><span className="mobile-quick-label-full">Regiones y ciudades</span><span className="mobile-quick-label-short">Regiones</span></NavLink>
          <NavLink href="/escorts">Escorts</NavLink>
          <NavLink className="mobile-directory-secondary" href="/agencias">Agencias</NavLink>
          <NavLink className="mobile-directory-secondary" href="/arriendos">Arriendos</NavLink>
          <NavLink href={sessionAccountHref}>{sessionAccountLabel}</NavLink>
        </nav>
        <div className={`public-header-actions${hasAnySession ? " is-signed-in" : ""}`} aria-label="Acciones de cuenta">
          {!hasAnySession && <Link className="button button-outline" href="/registro">Registrarse</Link>}
          {hasUserSession && !hasAdminSession && <Link className="button button-outline header-stories-action" href="/mi-cuenta/historias">Subir historias</Link>}
          <Link className="button button-primary" href="/ingresar?return_to=/mi-cuenta/nuevo-perfil" prefetch={false}>Publicar anuncio</Link>
        </div>
      </header>
      {currentUser && <PresenceHeartbeat />}
      {currentUser && <MessageNotifications initialUnread={unreadMessages} initialPendingReviews={pendingReviews}><UnreadMessagesNotice variant="public" /><PendingReviewsNotice variant="public" /></MessageNotifications>}
    </>
  );
}

export function DirectoryShell({ children, selectedCity, kind = "escort", advertiserWhatsapp }: { children: ReactNode; selectedCity?: string; kind?: "escort" | "agency" | "rental" | "content"; advertiserWhatsapp?: AdvertiserWhatsapp }) {
  return <PortalWhatsappScope advertiser={advertiserWhatsapp}><main className="directory-root"><PublicHeader /><DirectoryCityBar selectedCity={selectedCity} kind={kind} />{children}<PublicFooter /></main></PortalWhatsappScope>;
}

export async function PublicFooter() {
  const settings = await getSiteSettings();
  const showSponsors = settings.sponsors_enabled === "enabled";
  return (
    <footer className="public-footer">
      <div className="public-footer-brand"><Link className="public-footer-logo" href="/" aria-label="Chile3X, inicio"><Image src="/assets/chile3x-logo-primary-320-20260923.webp" alt="Chile3X" width={320} height={112} unoptimized /></Link><p>Directorio de escorts y damas de compañía para adultos. Los acuerdos ocurren directamente entre visitantes y anunciantes.</p></div>
      <div className="public-footer-navigation">
        <div><strong>DIRECTORIO</strong><Link href="/escorts">Escorts</Link><Link href="/agencias">Agencias</Link><Link href="/arriendos">Arriendos</Link><Link href="/venta-contenido">Venta de contenido</Link></div>
        <div><strong>INFORMACIÓN</strong><Link href="/quienes-somos">Quiénes somos</Link><Link href="/noticias">Noticias</Link><Link href="/novedades">Novedades</Link><Link href="/faq">Preguntas frecuentes</Link><Link href="/contacto">Contacto</Link>{showSponsors && <Link href="/patrocinadores">Sitios asociados</Link>}<Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><Link href="/reglas-de-publicacion">Reglas de publicación</Link></div>
      </div>
      <div className="public-footer-extras">
        <div><strong>SÍGUENOS</strong><PortalContactLinks placement="footer" /></div>
        <div className="public-footer-partners"><strong>DIRECTORIOS ASOCIADOS</strong><div className="public-footer-partner-badges"><OadBadge /><AngelisNetBadge /><LaEstokadaBadge /></div></div>
      </div>
      <div className="public-footer-bottom"><span>© {new Date().getFullYear()} Chile3X · Solo mayores de 18 años</span><span className="public-footer-meta"><span>Chile · Directorio para adultos</span><a className="footer-admin-access" href="/admin" rel="nofollow">Acceso administrador</a></span></div>
    </footer>
  );
}

export async function PortalContactLinks({ placement }: { placement: Extract<WhatsappPlacement, "header" | "footer" | "contact" | "about"> }) {
  const contacts = getPortalContacts(await getSiteSettings());
  if (contacts.length === 0) return null;
  return <div className={`portal-contact-links portal-contact-links-${placement}`} aria-label="Canales oficiales de Chile3X">{contacts.map((contact) => contact.key === "whatsapp"
    ? <PortalWhatsappLink key={contact.key} placement={placement} openHelpPanel={placement === "header" || placement === "footer"} className="portal-contact-link portal-contact-whatsapp" href={contact.href} target="_blank" rel="noopener noreferrer" aria-label={placement === "header" || placement === "footer" ? "Contactos del equipo por WhatsApp" : contact.label} title={placement === "header" || placement === "footer" ? "Contactos del equipo por WhatsApp" : contact.label}><PortalContactIcon kind="whatsapp" /><span className="sr-only">{contact.label}</span></PortalWhatsappLink>
    : <a key={contact.key} className={`portal-contact-link portal-contact-${contact.key}`} href={contact.href} target={contact.external ? "_blank" : undefined} rel={contact.external ? "noreferrer" : undefined} aria-label={contact.label} title={contact.label}><PortalContactIcon kind={contact.key} /><span className="sr-only">{contact.label}</span></a>)}</div>;
}

export { PortalContactIcon } from "@/app/PortalContactIcon";

export async function PortalWhatsappScope({ children, advertiser, showFloating = true }: { children: ReactNode; advertiser?: AdvertiserWhatsapp; showFloating?: boolean }) {
  const settings = await getSiteSettings();
  const contacts = publicWhatsappContacts(settings);
  return <FloatingWhatsappMenu contacts={contacts} title={settings.whatsapp_panel_title.slice(0, WHATSAPP_TEXT_LIMITS.title)} description={settings.whatsapp_panel_description.slice(0, WHATSAPP_TEXT_LIMITS.explanation)} buttonLabel={settings.whatsapp_button_label}
    advertiser={advertiser} showFloating={showFloating && settings.whatsapp_panel_enabled === "enabled"} icon={<PortalContactIcon kind="whatsapp" />}>
    {children}
  </FloatingWhatsappMenu>;
}

export function OadBadge() {
  return <a className="oad-badge" href="https://openadultdirectory.com/escorts/" target="_blank" rel="noreferrer" aria-label="Ver Chile3X en Open Adult Directory">
    {/* La insignia se mantiene sin optimización para no generar transformaciones ni cobros de imágenes. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={oadBadgeImage} alt="Listed on Open Adult Directory" width="98" height="43" />
  </a>;
}

export function AngelisNetBadge() {
  return <a className="angelisnet-badge" href="https://www.angelisnet.com/es/" target="_blank" rel="nofollow sponsored noreferrer" aria-label="Visitar AngelisNET">
    {/* Copia local optimizada de la insignia oficial para evitar una descarga externa en cada visita. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={angelisNetBadgeImage} alt="Adult Live Sex Cams - AngelisNET" width="236" height="42" loading="lazy" />
  </a>;
}

export function LaEstokadaBadge() {
  return <a className="laestokada-badge" href="https://www.laestokada.cl/foro/" target="_blank" rel="noreferrer" aria-label="Visitar el foro La EstoKada">
    {/* El logo oficial se sirve desde La EstoKada para conservar la insignia vigente. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={laEstokadaBadgeImage} alt="Foro La EstoKada" width="128" height="31" loading="lazy" />
  </a>;
}

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  const tags = getProfileDisplayTags(profile);
  const tierTag = profile.type === "escort" && !isContentOnly(profile) ? tags[0] ?? "Bronze" : null;
  const detailTags = profile.type === "escort" ? tierTag ? tags.slice(1) : tags : [];
  const age = publicProfileAge(profile.type,profile.details.metadata);
  const subtitle = profile.comuna ?? profile.details.referenceLocation;
  const mainPrice = isContentOnly(profile) ? undefined : readProfilePrices(profile.details)[0];
  const coverImage = profile.media.find((media) => media.mediaType === "image" && media.isProfilePhoto) ?? profile.media.find((media) => media.mediaType === "image");
  const profileHref = profilePublicPath(profile);

  return (
    <article className="public-profile-card">
      <Link href={profileHref} className={`public-profile-visual ${toneFor(profile.slug)}${coverImage ? " has-image" : ""}`} aria-label={`Ver perfil de ${profile.displayName}`}>
        {coverImage ? <Image className="public-profile-image" src={coverImage.url} alt={coverImage.altText ?? `Foto de ${profile.displayName}`} fill unoptimized sizes="(max-width: 360px) 100vw, (max-width: 720px) 50vw, (max-width: 1040px) 33vw, 25vw" style={{ objectFit: "scale-down" }} /> : <span className="public-profile-initial">{profile.displayName.slice(0, 1)}</span>}
        <span className="public-card-primary-badges">{tierTag && <span className={`public-card-tier-badge ${tierTag.toLowerCase()}`}>{tierTag}</span>}{!isContentOnly(profile) && <span className="public-type-label">{publicProfileTypeLabel(profile)}</span>}</span>
        {(detailTags.length > 0 || profile.isFeatured) && <span className="public-card-secondary-badges">{profile.isFeatured && <span className="featured-label">DESTACADA</span>}{detailTags.length > 0 && <span className="public-card-detail-badges" aria-label={`Etiquetas: ${detailTags.join(", ")}`}>{detailTags.map((tag) => <span key={tag} className={`public-card-badge ${tag.toLowerCase().replaceAll(" ", "-")}`}>{tag}</span>)}</span>}</span>}
      </Link>
      <div className="public-profile-content">
        <div className="public-profile-title">
          <div>
            <h3><Link href={profileHref}>{profile.displayName}</Link>{profile.verificationStatus === "reviewed" && profile.type === "escort" && <span className="verified-sticker" title="Perfil comprobado" aria-label="Perfil comprobado">✓</span>}</h3>
            {profile.isPublic && !profile.isDemo && <ProfileOnlineBadge profileId={profile.id} initialOnline={profile.isOnline} />}
            {profile.handle && <small className="public-profile-handle">@{profile.handle}</small>}
            {profile.isDemo && <small className="profile-test-caption">Ficha de prueba · sin servicio real</small>}
            <p><Link href={getCityPath(profile.city)}>{profile.city}</Link>{age!==null&&<span className="public-card-age" aria-label={`${age} años`}>, {age}</span>}{subtitle && ` · ${subtitle}`}</p>
          </div>
        </div>
        <div className="public-profile-meta"><span>{formatRegionName(profile.region)}</span>{mainPrice && <strong>{mainPrice.label} · ${priceFormatter.format(mainPrice.amount)} {mainPrice.currency}</strong>}</div>
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
  selectedCategory?: string;
  paginated?: boolean;
  contentDirectory?: boolean;
};

function CityProfileSection({ id, title, description, profiles, tier }: { id: string; title: string; description: string; profiles: PublicProfile[]; tier?: Tier }) {
  return <details id={id} className={`city-profile-section${tier ? ` tier-${tier}` : ""}`} open>
    <summary>
      <span><strong>{title}</strong><small>{description}</small></span>
      <b>{profiles.length}</b>
    </summary>
    <div className="city-profile-section-content">
      {profiles.length > 0 ? <ProfileGrid profiles={profiles} /> : <p>No hay publicaciones visibles en esta sección todavía.</p>}
    </div>
  </details>;
}

export function CityProfileSections({ city, profiles, selectedCategory, paginated = false, contentDirectory = false }: CityProfileSectionsProps) {
  const escorts = profiles.filter((profile) => profile.type === "escort" && (contentDirectory ? sellsContent(profile) : !isContentOnly(profile)));
  const sections: { id: string; title: string; description: string; profiles: PublicProfile[]; tier?: Tier }[] = [
    { id: "vip", title: "VIP", description: "Perfiles de élite con máxima visibilidad.", profiles: escorts.filter((profile) => profile.tier === "vip"), tier: "vip" },
    { id: "premium", title: "Premium", description: "Perfiles con visibilidad intermedia y presentación destacada.", profiles: escorts.filter((profile) => profile.tier === "premium"), tier: "premium" },
    { id: "bronze", title: "Bronze", description: "Perfiles con visibilidad estándar en el directorio.", profiles: escorts.filter((profile) => profile.tier === "bronze"), tier: "bronze" },
    { id: "masajes", title: "Masajes", description: "Escorts con la etiqueta Masajes; también aparecen en su categoría de visibilidad", profiles: escorts.filter((profile) => profile.tags.includes("masajes")) },
    { id: "contenido", title: "Venta de contenido", description: "Contenido por contacto directo o en otras plataformas", profiles: profiles.filter((profile) => profileMatchesDirectoryCategory(profile, "contenido")) },
    { id: "agency", title: "Agencias", description: "Agencias visibles en la ciudad", profiles: profiles.filter((profile) => profile.type === "agency") },
    { id: "rental", title: "Arriendos", description: "Arriendos visibles en la ciudad", profiles: profiles.filter((profile) => profile.type === "rental") },
  ];

  return <section className="city-profile-sections" aria-label={`Publicaciones en ${city}`}>
    {paginated && <p className="city-section-page-note">Los recuentos corresponden a esta página. Selecciona una categoría en los filtros para consultar todos sus resultados.</p>}
    {(selectedCategory ? sections.filter((section) => section.id === selectedCategory) : sections.slice(0, 3)).map(({ id, title, description, profiles: sectionProfiles, tier }) => <CityProfileSection key={id} id={id} title={title} description={description} profiles={sectionProfiles} tier={tier} />)}
    {!selectedCategory && !contentDirectory && <><div className="city-section-divider"><h3>También en {city}</h3><span aria-hidden="true" /></div>
    {sections.slice(3).map(({ id, title, description, profiles: sectionProfiles, tier }) => <CityProfileSection key={id} id={id} title={title} description={description} profiles={sectionProfiles} tier={tier} />)}</>}
  </section>;
}

export function SeoContent({ city, region, count }: { city: string; region: string; count: number }) {
  const regionInfo = getRegionByTitle(region);
  const nearbyCities = regionInfo?.cities.filter((item) => item !== city) ?? [];
  const regionName = formatRegionName(region);
  const regionalContext: Record<string, string> = {
    tarapaca: "Esta guía conecta la búsqueda local de Iquique con la cobertura disponible en el norte de Chile.",
    antofagasta: "La cobertura de Antofagasta y Calama permite revisar opciones dentro de una misma región sin mezclar resultados de otras zonas.",
    atacama: "En Atacama puedes continuar la búsqueda entre Caldera, Copiapó y Vallenar desde enlaces territoriales directos.",
    coquimbo: "La navegación de Coquimbo relaciona La Serena y Ovalle para comparar publicaciones visibles dentro de la región.",
    valparaiso: "En Valparaíso la guía separa Los Andes, Quillota, Valparaíso y Viña del Mar para mantener una intención local clara.",
    ohiggins: "La cobertura de O’Higgins enlaza Rancagua y San Fernando sin reemplazar la búsqueda específica de cada ciudad.",
    maule: "En el Maule puedes pasar entre Curicó, Linares y Talca manteniendo filtros y páginas locales independientes.",
    biobio: "Puedes explorar Concepción y Los Ángeles por separado dentro del Biobío. La ciudad y el sector que aparecen en cada ficha son los declarados por la persona anunciante; comprueba esos datos antes de contactarla.",
    "la-araucania": "En La Araucanía puedes comparar la disponibilidad publicada en Pucón y Temuco desde sus páginas propias.",
    "los-lagos": "La cobertura de Los Lagos organiza Castro, Osorno y Puerto Montt como destinos locales separados.",
    aysen: "La cobertura de Aysén se incorporará cuando existan ciudades y publicaciones habilitadas para esa región.",
    "magallanes-y-antartica-chilena": "Punta Arenas cuenta con una ruta propia dentro de la cobertura del extremo sur de Chile.",
    "metropolitana-de-santiago": "En la Región Metropolitana cada comuna cubierta dispone de una página independiente para evitar mezclar búsquedas locales.",
    "los-rios": "Valdivia dispone de una guía local propia dentro de la cobertura de la Región de Los Ríos.",
    "arica-y-parinacota": "Arica cuenta con una entrada local diferenciada para las búsquedas del extremo norte del país.",
    nuble: "Chillán dispone de una guía específica dentro de la cobertura de la Región de Ñuble.",
  };
  return (
    <section className="seo-content seo-local-guide">
      <header className="seo-guide-heading"><div><p className="eyebrow">GUÍA LOCAL</p><h2>Escorts y damas de compañía en {city}</h2></div><p>Esta página reúne publicaciones asociadas específicamente a {city}, {regionName}. Puedes revisar fotografías, categorías y datos entregados por cada anunciante antes de usar sus canales de contacto directo. Chile3X no participa en pagos ni acuerdos privados.</p></header>
      <div className="seo-guide-grid">
        <article><h3>Ubicación y cobertura en {regionInfo?.shortTitle ?? regionName}</h3><p>{regionalContext[regionInfo?.id ?? ""] ?? `La ruta de ${city} forma parte de la cobertura territorial de Chile3X y mantiene sus resultados separados de otras ciudades.`}</p></article>
        <article><h3>Cómo explorar publicaciones en {city}</h3><p>{count > 0 ? `Esta página muestra ${count} ${count === 1 ? "publicación visible" : "publicaciones visibles"}. ` : "Si no hay publicaciones visibles, puedes consultar otras ciudades de la región desde los enlaces de esta guía. "}Usa los filtros para acotar por categoría, atributos o servicios y abre cada perfil para consultar su información aprobada. En las preguntas frecuentes y las reglas encontrarás cómo funciona la moderación.</p></article>
        <article><h3>Escorts y damas de compañía: información antes de contactar</h3><p>Compara la descripción, las fotografías, los servicios informados y los horarios de cada anuncio. Revisa las tarifas cuando estén publicadas y confirma directamente con la persona anunciante su disponibilidad y ubicación. Los datos son declarados por su titular; una categoría o etiqueta no sustituye esa información.</p></article>
        <article><h3>¿Venta de contenido significa que la persona es escort?</h3><p>No. Venta de contenido reúne tanto escorts que también venden material digital como personas que únicamente venden contenido y no son escorts. Estas últimas no aparecen en VIP, Premium, Bronze ni Masajes. La etiqueta no implica que la compra se realice en Chile3X; el canal y las condiciones se consultan directamente a la persona anunciante.</p></article>
      </div>
      <nav className="seo-content-links" aria-label={`Información y ciudades relacionadas con ${city}`}>
        <Link href="/escorts">Directorio de escorts en Chile</Link>
        {nearbyCities.map((nearbyCity) => <Link href={getCityPath(nearbyCity)} key={nearbyCity}>Escorts en {nearbyCity}</Link>)}
        <Link href="/faq">Preguntas frecuentes</Link>
        <Link href="/reglas-de-publicacion">Reglas de publicación</Link>
        <Link href="/noticias">Noticias y guías</Link>
        <Link href="/noticias/como-funciona-chile3x-crear-cuenta-publicar-anuncio">Cómo crear una cuenta y publicar un anuncio</Link>
      </nav>
    </section>
  );
}
