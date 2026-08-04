import type { Metadata } from "next";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { NearbyDirectoryButton } from "@/app/directorio/NearbyDirectoryButton";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { filterPublicProfiles, getPublicProfiles, prioritizeProfilesByCity, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";
import { cityDirectory } from "@/app/locations";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { getActiveStories } from "@/lib/stories";
import { StoryRail } from "@/app/historias/StoryRail";
import { getCurrentUser } from "@/lib/auth";
import { safeJsonLd } from "@/lib/json-ld";
import { profilePublicPath } from "@/lib/profile";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Escorts en Chile",
  description: "Encuentra escorts en Chile por ciudad, categoría y servicios. Explora perfiles publicados y filtrados en el directorio nacional Chile3X.",
  path: "/escorts",
  socialTitle: "Escorts en Chile | Chile3X",
  socialDescription: "Directorio nacional de escorts por ciudad, categoría y servicios.",
});

export const dynamic = "force-dynamic";

export default async function EscortsPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const query = await searchParams;
  const filters = readDirectoryFilters(query, { type: "escort" });
  const nearbyCityValue = Array.isArray(query.cerca) ? query.cerca[0] : query.cerca;
  const nearbyCity = cityDirectory.some((item) => item.city === nearbyCityValue) ? nearbyCityValue : undefined;
  const [viewer, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const allProfiles = await getPublicProfiles({ viewerId: viewer?.id });
  const profiles = prioritizeProfilesByCity(filterPublicProfiles(allProfiles, filters), nearbyCity);
  const stories = await getActiveStories({ profileIds: profiles.map((profile) => profile.id) });
  const canonicalProfiles = filterPublicProfiles(allProfiles, readDirectoryFilters({}, { type: "escort" }));
  const siteUrl = siteBaseUrl(settings.site_url);
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Escorts en Chile", description: "Directorio nacional de escorts por ciudad, categoría y servicios.", url: `${siteUrl}/escorts`, inLanguage: "es-CL", mainEntity: { "@type": "ItemList", numberOfItems: canonicalProfiles.length, itemListElement: canonicalProfiles.map((profile, index) => ({ "@type": "ListItem", position: index + 1, name: profile.displayName, url: `${siteUrl}${profilePublicPath(profile)}` })) } };

  return (
    <DirectoryShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <section className="directory-hero">
        <p className="eyebrow">DIRECTORIO NACIONAL</p>
        <h1>Escorts en <em>todo Chile.</em></h1>
        <p>Explora perfiles publicados por ciudad, categoría, atributos y servicios. Los filtros combinan sus condiciones para entregar resultados precisos.</p>
        <NearbyDirectoryButton />
      </section>
      <section className="directory-content">
        <DirectoryFilters action="/escorts" filters={filters} />
        <StoryRail stories={stories} withActivity />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y Hombres son categorías incompatibles. Selecciona solo una para buscar.</p>}
        <div className="directory-results-heading"><div><p className="eyebrow">RESULTADOS</p><h2>{profiles.length} perfil{profiles.length === 1 ? "" : "es"} encontrado{profiles.length === 1 ? "" : "s"}</h2></div><p>{nearbyCity ? `Mostramos primero los perfiles de ${nearbyCity}; puedes cambiar la ciudad desde los filtros.` : "Las etiquetas y servicios se muestran según la información aprobada de cada perfil."}</p></div>
        <ProfileGrid profiles={profiles} />
      </section>
    </DirectoryShell>
  );
}
