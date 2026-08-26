import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { CityProfileSections, DirectoryShell, SeoContent } from "@/app/directorio/_components";
import { StoryRail } from "@/app/historias/StoryRail";
import { filterPublicProfiles, getCityInfo, getCityPath, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";
import { getActiveStories } from "@/lib/stories";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { getCurrentUser } from "@/lib/auth";
import { safeJsonLd } from "@/lib/json-ld";
import { profilePublicPath } from "@/lib/profile";
import { publicPageMetadata } from "@/lib/seo";
import { formatRegionName } from "@/app/locations";

export const dynamic = "force-dynamic";

type CityPageProps = { params: Promise<{ citySlug: string }>; searchParams: Promise<DirectoryQuery> };

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) return {};
  return publicPageMetadata({
    title: `Escorts en ${city.city}`,
    description: `Encuentra escorts en ${city.city}, ${city.regionDisplay}. Explora perfiles, agencias y arriendos para adultos con filtros por categoría, atributos y servicios.`,
    path: `/escorts/${city.citySlug}`,
    socialTitle: `Escorts en ${city.city} | Chile3X`,
    socialDescription: `Directorio de escorts en ${city.city}, Chile.`,
  });
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) notFound();
  const filters = readDirectoryFilters(await searchParams, { region: city.region, city: city.city });
  const [viewer, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const publicProfiles = await getPublicProfiles({ viewerId: viewer?.id, city: city.city });
  const profiles = filterPublicProfiles(publicProfiles, filters);
  const stories = await getActiveStories({ profileIds: profiles.map((profile) => profile.id) });
  const basePath = getCityPath(city.city);
  const canonicalProfiles = filterPublicProfiles(publicProfiles, readDirectoryFilters({}, { region: city.region, city: city.city }));
  const siteUrl = siteBaseUrl(settings.site_url);
  const pageUrl = `${siteUrl}${basePath}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `Escorts en ${city.city}`, description: `Directorio de escorts en ${city.city}, ${city.regionDisplay}.`, url: pageUrl, inLanguage: "es-CL", mainEntity: { "@type": "ItemList", numberOfItems: canonicalProfiles.length, itemListElement: canonicalProfiles.map((profile, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteUrl}${profilePublicPath(profile)}`, name: profile.displayName })) } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Chile3X", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Escorts en Chile", item: `${siteUrl}/escorts` }, { "@type": "ListItem", position: 3, name: `Escorts en ${city.city}`, item: pageUrl }] },
    ],
  };

  return (
    <DirectoryShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <section className="city-hero"><p className="eyebrow">DIRECTORIO DE ESCORTS · {city.regionDisplay.toUpperCase()}</p><h1>Escorts en <em>{city.city}</em></h1><p>Perfiles de escorts, agencias y arriendos disponibles en {city.city}. Navega por categoría o afina la búsqueda con filtros avanzados.</p></section>
      <section className="directory-content city-content">
        <DirectoryFilters action={basePath} filters={filters} pinnedCity={city.city} pinnedRegion={city.region} showType />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y Hombres son categorías incompatibles. Selecciona solo una para buscar.</p>}
        <StoryRail stories={stories} city={city.city} withActivity />
        <div className="directory-results-heading"><div><p className="eyebrow">{city.city.toUpperCase()}</p><h2>{profiles.length} publicación{profiles.length === 1 ? "" : "es"} visible{profiles.length === 1 ? "" : "s"}</h2></div></div>
        <CityProfileSections city={city.city} profiles={profiles} />
        <SeoContent city={city.city} region={formatRegionName(city.region)} count={profiles.length} />
      </section>
    </DirectoryShell>
  );
}
