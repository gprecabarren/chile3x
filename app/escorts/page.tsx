import type { Metadata } from "next";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryPagination } from "@/app/directorio/DirectoryPagination";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { DIRECTORY_PAGE_SIZE, getPublicProfilePage, readDirectoryFilters, readDirectoryPage, type DirectoryQuery } from "@/lib/directory";
import { cityDirectory, getCityBySlug, getPreferredCitySlug } from "@/app/locations";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { getActiveStories } from "@/lib/stories";
import { StoryRail } from "@/app/historias/StoryRail";
import { getCurrentUser } from "@/lib/auth";
import { safeJsonLd } from "@/lib/json-ld";
import { profilePublicPath } from "@/lib/profile";
import { directoryPageMetadata, publicPageMetadata } from "@/lib/seo";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

const baseMetadata: Metadata = publicPageMetadata({
  title: "Escorts y damas de compañía en Chile",
  description: "Encuentra escorts y damas de compañía en Chile por ciudad, categoría y servicios. Explora perfiles revisados en el directorio nacional Chile3X.",
  path: "/escorts",
  socialTitle: "Escorts y damas de compañía en Chile | Chile3X",
  socialDescription: "Directorio nacional de escorts y damas de compañía por ciudad, categoría y servicios.",
});

export async function generateMetadata({ searchParams }: { searchParams: Promise<DirectoryQuery> }): Promise<Metadata> {
  const query = await searchParams;
  return directoryPageMetadata(baseMetadata, "/escorts", query, readDirectoryPage(query));
}

export const dynamic = "force-dynamic";

export default async function EscortsPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const query = await searchParams;
  const filters = readDirectoryFilters(query, { type: "escort" });
  const nearbyCityValue = Array.isArray(query.cerca) ? query.cerca[0] : query.cerca;
  const preferredCity = getCityBySlug(getPreferredCitySlug(await cookies()))?.city;
  const nearbyCity = cityDirectory.some((item) => item.city === nearbyCityValue) ? nearbyCityValue : preferredCity;
  const [viewer, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const { profiles, page, hasNext, outOfRange } = await getPublicProfilePage(filters, { viewerId: viewer?.id, preferredCity: nearbyCity, page: readDirectoryPage(query) });
  if (outOfRange) notFound();
  const stories = await getActiveStories({ profileIds: profiles.map((profile) => profile.id) });
  const siteUrl = siteBaseUrl(settings.site_url);
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Escorts y damas de compañía en Chile", description: "Directorio nacional de escorts y damas de compañía por ciudad, categoría y servicios.", url: `${siteUrl}/escorts`, inLanguage: "es-CL", mainEntity: { "@type": "ItemList", numberOfItems: profiles.length, itemListElement: profiles.map((profile, index) => ({ "@type": "ListItem", position: (page - 1) * DIRECTORY_PAGE_SIZE + index + 1, name: profile.displayName, url: `${siteUrl}${profilePublicPath(profile)}` })) } };

  return (
    <DirectoryShell selectedCity={filters.city ?? nearbyCity}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <section className="directory-hero">
        <p className="eyebrow">DIRECTORIO NACIONAL</p>
        <h1>Escorts y damas de compañía <em>en todo Chile.</em></h1>
        <p>Explora perfiles revisados por ciudad, categoría, atributos y servicios. Los filtros combinan sus condiciones para entregar resultados precisos.</p>
      </section>
      <section className="directory-content">
        <DirectoryFilters key={JSON.stringify(filters)} action="/escorts" filters={filters} />
        <StoryRail stories={stories} withActivity />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y TRANS no se pueden combinar. Selecciona solo una para buscar.</p>}
        <div id="resultados" className="directory-results-heading"><div><p className="eyebrow">RESULTADOS</p><h2>{profiles.length} perfil{profiles.length === 1 ? "" : "es"}{hasNext || page > 1 ? " en esta página" : ` encontrado${profiles.length === 1 ? "" : "s"}`}</h2></div><p>{nearbyCity ? `Mostramos primero los perfiles de ${nearbyCity}; puedes cambiar la ciudad desde los filtros.` : "Las etiquetas y servicios se muestran según la información aprobada de cada perfil."}</p></div>
        <ProfileGrid profiles={profiles} />
        <DirectoryPagination path="/escorts" query={query} page={page} hasNext={hasNext} />
      </section>
    </DirectoryShell>
  );
}
