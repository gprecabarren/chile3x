import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import Image from "next/image";
import Link from "@/app/NavigationLink";
import { PortalWhatsappScope, PublicFooter, PublicHeader, ProfileGrid } from "./directorio/_components";
import { StoryRail } from "./historias/StoryRail";
import { cityDirectory, cityTotal, getCityBySlug, getPreferredCitySlug, regions } from "./locations";
import { RegionJumpSelect } from "./RegionJumpSelect";
import { HomeLocationSummary } from "./HomeLocationSummary";
import "./home-discovery.css";
import { getCityEscortCounts, getFeaturedProfiles, prioritizeProfilesByCity } from "@/lib/directory";
import { getActiveStories } from "@/lib/stories";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { safeJsonLd } from "@/lib/json-ld";
import { cookies } from "next/headers";

import { HomeCityDirectory } from "./HomeCityDirectory";
import type { HomeLayout } from "@/lib/home-layout-policy";
import {getSiteSettings} from "@/lib/site-settings";
import {parseHomeTexts} from "@/lib/home-content-policy";
import "./home-layouts.css";


const directorySchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Escorts y damas de compañía por ciudad en Chile",
  numberOfItems: cityTotal,
  itemListElement: cityDirectory.map((city, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://chile3x.cl/escorts/${city.citySlug}`,
    name: `Escorts y damas de compañía en ${city.city}`,
  })),
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://chile3x.cl/#organization",
      name: "Chile3X",
      url: "https://chile3x.cl",
      logo: { "@type": "ImageObject", url: "https://chile3x.cl/favicon-512.png", width: 512, height: 512 },
      description: "Directorio para adultos con escorts, damas de compañía, agencias y arriendos en Chile.",
    },
    {
      "@type": "WebSite",
      "@id": "https://chile3x.cl/#website",
      name: "Chile3X",
      url: "https://chile3x.cl",
      inLanguage: "es-CL",
      publisher: { "@id": "https://chile3x.cl/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://chile3x.cl/escorts?nombre={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export async function HomeContent({ layout, preview = false }: { layout: HomeLayout; preview?: boolean }) {
  const compact = layout === "compact";
  const preferredCity = getCityBySlug(getPreferredCitySlug(await cookies()));
  const nearbyCities = preferredCity ? cityDirectory
    .filter((item) => item.regionSlug === preferredCity.regionSlug && item.citySlug !== preferredCity.citySlug)
    .slice(0, 3) : [];
  const [viewer, admin, settings] = await Promise.all([getCurrentUser(), getCurrentAdmin(), getSiteSettings()]);
  const copy=parseHomeTexts(settings[`home_content_${layout}`],layout);
  const features=[[copy.feature1Title,copy.feature1Text],[copy.feature2Title,copy.feature2Text],[copy.feature3Title,copy.feature3Text]];
  const publishHref = viewer ? "/mi-cuenta/nuevo-perfil" : admin ? "/admin/anuncios-publicaciones" : "/registro";
  const [featuredProfileRows, stories, cityEscortCounts] = await Promise.all([
    getFeaturedProfiles(6, viewer?.id),
    getActiveStories({ viewerId: viewer?.id }),
    compact ? Promise.resolve(new Map<string, number>()) : getCityEscortCounts(),
  ]);
  const featuredProfiles = prioritizeProfilesByCity(featuredProfileRows, preferredCity?.city);
  return (
    <PortalWhatsappScope><main className={`home-layout home-layout--${layout}`} data-home-layout={layout}>
      {!preview && <><script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(directorySchema) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }} /></>}

      <PublicHeader coverageHref="#cobertura" />

      <section className="hero" id="explorar">
        {!compact && <picture className="hero-backdrop">
          <source media="(max-width: 620px)" srcSet="/assets/hero-night-silhouette-mobile-20261007.webp" width={512} height={768} />
          {/* Decorative artwork uses a device-specific crop, never a CSS stretch. */}
          <img src="/assets/hero-night-silhouette-desktop-20261007.webp" alt="" aria-hidden="true" width={1600} height={640} fetchPriority="low" decoding="async" />
        </picture>}
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title} <em>{copy.titleAccent}</em></h1>
          <p className="hero-text">
            {copy.intro}
          </p>
          {!compact && <div className="hero-actions">
            <Link className="button button-primary" href="/escorts">{copy.mainButton}</Link>
            <ActionAnchor className="button button-outline home-coverage-action" href="#cobertura">{copy.coverageButton}</ActionAnchor>
            <a className="text-link" href={publishHref}>{copy.secondaryButton} <span>→</span></a>
          </div>}
          {!compact && <div className="trust-row">
            <span><b>✓</b> Moderación manual</span>
            <span><b>✓</b> Cobertura nacional</span>
            <span><b>✓</b> Adultos +18</span>
          </div>}
        </div>
      </section>

      {compact ? <HomeCityDirectory texts={copy} /> : <section className="home-discovery-controls" aria-label="Ubicación y regiones">
        <HomeLocationSummary initialCityName={preferredCity?.city} nearbyCities={nearbyCities}>
          <RegionJumpSelect regions={regions} />
        </HomeLocationSummary>
      </section>}

      <section className="section listings-section">
        <div className="listings-intro">
          <p className="eyebrow">{copy.featuredEyebrow}</p>
          <h2>{copy.featuredTitle} <em>{copy.featuredAccent}</em></h2>
          {(viewer || admin) && <p>Se priorizan las escorts con más visualizaciones únicas recientes. El equipo puede destacar avisos revisados de forma manual cuando sea necesario.</p>}
        </div>
        {featuredProfiles.length ? <ProfileGrid profiles={featuredProfiles} emptyMessage="Aún no hay perfiles destacados." /> : (viewer || admin) ? <p className="demo-note">Los perfiles destacados aparecerán aquí cuando existan publicaciones y visualizaciones registradas.</p> : null}
      </section>

      <StoryRail stories={stories} />

      <section className="section directory-section" id={compact ? undefined : "cobertura"}>
        {!compact && <><div className="section-heading directory-heading">
          <div>
            <p className="eyebrow">{copy.regionsEyebrow}</p>
            <h2>{copy.regionsTitle}<br /><em>{copy.regionsAccent}</em></h2>
          </div>
        </div>

        <div className="regional-grid">
          {regions.map((region) => (
            <section className="region-card" id={region.id} key={region.id}>
              <div className="region-card-heading">
                <span>{region.numeral}</span>
                <div>
                  <h3>{region.displayTitle}</h3>
                  <p>{region.cities.length === 1 ? "1 ciudad" : `${region.cities.length} ciudades`}</p>
                </div>
              </div>
              <ul className="commune-list" aria-label={`Ciudades de ${region.displayTitle}`}>
                {region.cities.map((city) => <li key={city}><Link href={`/escorts/${city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`}>{city} <span className="city-count">({cityEscortCounts.get(city) ?? 0})</span></Link></li>)}
              </ul>
              <StoryRail stories={stories.filter(story => story.region === region.title)} city={region.shortTitle} compactRegion />
            </section>
          ))}
        </div>
        <p className="directory-note">{copy.coverageNote}</p></>}
        <form className="home-search home-search-after-coverage" action="/escorts" method="get" role="search">
          <label htmlFor="home-profile-search">{copy.searchLabel}</label>
          <div><input id="home-profile-search" name="nombre" type="search" minLength={2} maxLength={80} placeholder={copy.searchPlaceholder} /><ActionButton type="submit">{copy.searchButton}</ActionButton></div>
        </form>
      </section>

      <section className="home-photo-banner" aria-label="Chile3X, directorio adulto en Chile">
        <Image src="/assets/chile3x-hero-banner-20260923.webp" alt="" fill sizes="100vw" unoptimized />
        <div><p className="eyebrow">CHILE3X</p><h2>{copy.bannerTitle} <em>{copy.bannerAccent}</em></h2><p>{copy.bannerText}</p><Link className="button button-outline" href="/escorts">{copy.bannerButton}</Link></div>
      </section>

      <section className="section process-section" id="como-funciona">
        <div className="process-poster">
          <p>CHILE3X</p>
          <strong>{copy.poster1}<br />{copy.poster2}<br /><i>{copy.poster3}</i></strong>
          <span>DIRECTORIO ADULTO · +18</span>
        </div>
        <div className="process-copy">
          <p className="eyebrow">{copy.processEyebrow}</p>
          <h2>{copy.processTitle}</h2>
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
          <p className="eyebrow">{copy.ctaEyebrow}</p>
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaText}</p>
        </div>
        <ActionAnchor className="button button-light" href={publishHref}>{viewer ? "Publicar anuncio" : admin ? "Administrar anuncios" : copy.ctaButton}</ActionAnchor>
      </section>

      <PublicFooter />
    </main></PortalWhatsappScope>
  );
}
