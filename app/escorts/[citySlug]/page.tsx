import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { CityProfileSections, DirectoryShell, SeoContent } from "@/app/directorio/_components";
import { StoryRail } from "@/app/historias/StoryRail";
import { filterPublicProfiles, getCityInfo, getCityPath, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";
import { getActiveStories } from "@/lib/stories";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type CityPageProps = { params: Promise<{ citySlug: string }>; searchParams: Promise<DirectoryQuery> };

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) return {};
  return {
    title: `Escorts en ${city.city}`,
    description: `Encuentra escorts en ${city.city}, ${city.region}. Explora perfiles, agencias y arriendos para adultos con filtros por categoría, atributos y servicios.`,
    alternates: { canonical: `/escorts/${city.citySlug}` },
    openGraph: { title: `Escorts en ${city.city}`, description: `Directorio de escorts en ${city.city}, Chile.`, url: `/escorts/${city.citySlug}`, locale: "es_CL", type: "website" },
  };
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) notFound();
  const filters = readDirectoryFilters(await searchParams, { region: city.region, city: city.city });
  const [publicProfiles, stories, settings] = await Promise.all([getPublicProfiles(), getActiveStories({ city: city.city }), getSiteSettings()]);
  const profiles = filterPublicProfiles(publicProfiles, filters);
  const basePath = getCityPath(city.city);
  const canonicalProfiles = filterPublicProfiles(publicProfiles, readDirectoryFilters({}, { region: city.region, city: city.city }));
  const siteUrl = siteBaseUrl(settings.site_url);
  const pageUrl = `${siteUrl}${basePath}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `Escorts en ${city.city}`, description: `Directorio de escorts en ${city.city}, ${city.region}.`, url: pageUrl, inLanguage: "es-CL", mainEntity: { "@type": "ItemList", numberOfItems: canonicalProfiles.length, itemListElement: canonicalProfiles.map((profile, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteUrl}/perfil/${profile.slug}`, name: profile.displayName })) } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Chile3X", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Escorts en Chile", item: `${siteUrl}/escorts` }, { "@type": "ListItem", position: 3, name: `Escorts en ${city.city}`, item: pageUrl }] },
    ],
  };

  return (
    <DirectoryShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="city-hero"><p className="eyebrow">DIRECTORIO DE ESCORTS · {city.region.toUpperCase()}</p><h1>Escorts en <em>{city.city}</em></h1><p>Perfiles de escorts, agencias y arriendos disponibles en {city.city}. Navega por categoría o afina la búsqueda con filtros avanzados.</p></section>
      <section className="directory-content city-content">
        <DirectoryFilters action={basePath} filters={filters} pinnedCity={city.city} pinnedRegion={city.region} showType />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y Hombres son categorías incompatibles. Selecciona solo una para buscar.</p>}
        <StoryRail stories={stories} city={city.city} />
        <div className="directory-results-heading"><div><p className="eyebrow">{city.city.toUpperCase()}</p><h2>{profiles.length} publicación{profiles.length === 1 ? "" : "es"} visible{profiles.length === 1 ? "" : "s"}</h2></div></div>
        <CityProfileSections city={city.city} profiles={profiles} />
        <SeoContent city={city.city} region={city.region} count={profiles.length} />
      </section>
    </DirectoryShell>
  );
}
