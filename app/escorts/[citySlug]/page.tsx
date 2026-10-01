import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryPagination } from "@/app/directorio/DirectoryPagination";
import { CityProfileSections, DirectoryShell, SeoContent } from "@/app/directorio/_components";
import { StoryRail } from "@/app/historias/StoryRail";
import { DIRECTORY_PAGE_SIZE, getCityInfo, getCityPath, getPublicProfilePage, readDirectoryFilters, readDirectoryPage, type DirectoryQuery } from "@/lib/directory";
import { getActiveStories } from "@/lib/stories";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { getCurrentUser } from "@/lib/auth";
import { safeJsonLd } from "@/lib/json-ld";
import { profilePublicPath } from "@/lib/profile";
import { directoryPageMetadata, publicPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type CityPageProps = { params: Promise<{ citySlug: string }>; searchParams: Promise<DirectoryQuery> };

export async function generateMetadata({ params, searchParams }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) return {};
  const base = publicPageMetadata({
    title: `Escorts en ${city.city}: damas de compañía`,
    description: `¿Buscas una escort en ${city.city}? Explora escorts y damas de compañía en ${city.regionDisplay}, con perfiles revisados y filtros por servicios.`,
    path: `/escorts/${city.citySlug}`,
    socialTitle: `Escorts y damas de compañía en ${city.city} | Chile3X`,
    socialDescription: `Directorio de escorts y damas de compañía en ${city.city}, Chile.`,
  });
  const query = await searchParams;
  return directoryPageMetadata(base, `/escorts/${city.citySlug}`, query, readDirectoryPage(query));
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) notFound();
  const query = await searchParams;
  const filters = readDirectoryFilters(query, { region: city.region, city: city.city });
  const [viewer, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const { profiles, page, hasNext, outOfRange } = await getPublicProfilePage(filters, { viewerId: viewer?.id, page: readDirectoryPage(query) });
  if (outOfRange) notFound();
  const stories = await getActiveStories({ profileIds: profiles.map((profile) => profile.id) });
  const basePath = getCityPath(city.city);
  const siteUrl = siteBaseUrl(settings.site_url);
  const pageUrl = `${siteUrl}${basePath}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `Escorts y damas de compañía en ${city.city}`, description: `Directorio de escorts y damas de compañía en ${city.city}, ${city.regionDisplay}.`, url: pageUrl, inLanguage: "es-CL", mainEntity: { "@type": "ItemList", numberOfItems: profiles.length, itemListElement: profiles.map((profile, index) => ({ "@type": "ListItem", position: (page - 1) * DIRECTORY_PAGE_SIZE + index + 1, url: `${siteUrl}${profilePublicPath(profile)}`, name: profile.displayName })) } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Chile3X", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Escorts en Chile", item: `${siteUrl}/escorts` }, { "@type": "ListItem", position: 3, name: `Escorts en ${city.city}`, item: pageUrl }] },
    ],
  };

  return (
    <DirectoryShell selectedCity={city.city}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <section className="city-hero"><p className="eyebrow">DIRECTORIO ADULTO · {city.regionDisplay.toUpperCase()}</p><h1>Escorts y damas de compañía en <em>{city.city}</em></h1><p>Encuentra una escort en {city.city} y revisa perfiles, agencias y arriendos disponibles. Navega por categoría o afina la búsqueda con filtros avanzados.</p></section>
      <section className="directory-content city-content">
        <DirectoryFilters key={JSON.stringify(filters)} action={basePath} filters={filters} pinnedCity={city.city} pinnedRegion={city.region} showType />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y TRANS no se pueden combinar. Selecciona solo una para buscar.</p>}
        <StoryRail stories={stories} city={city.city} withActivity />
        <div id="resultados" className="directory-results-heading"><div><p className="eyebrow">{city.city.toUpperCase()}</p><h2>{profiles.length} {profiles.length === 1 ? "publicación" : "publicaciones"} {hasNext || page > 1 ? "en esta página" : profiles.length === 1 ? "visible" : "visibles"}</h2></div></div>
        <CityProfileSections city={city.city} profiles={profiles} selectedCategory={filters.category} paginated={hasNext || page > 1} />
        <DirectoryPagination path={basePath} query={query} page={page} hasNext={hasNext} />
        <SeoContent city={city.city} region={city.region} count={profiles.length} />
      </section>
    </DirectoryShell>
  );
}
