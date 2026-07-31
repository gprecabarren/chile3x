import type { Metadata } from "next";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { NearbyDirectoryButton } from "@/app/directorio/NearbyDirectoryButton";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { filterPublicProfiles, getPublicProfiles, prioritizeProfilesByCity, readDirectoryFilters, shuffleProfiles, type DirectoryQuery } from "@/lib/directory";
import { cityDirectory } from "@/app/locations";

export const metadata: Metadata = {
  title: "Escorts en Chile | Filtros por ciudad y servicios",
  description: "Explora escorts publicadas en Chile3X y filtra por ciudad, categoría, nacionalidad, atributos y servicios.",
  alternates: { canonical: "/escorts" },
};

export const dynamic = "force-dynamic";

export default async function EscortsPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const query = await searchParams;
  const filters = readDirectoryFilters(query, { type: "escort" });
  const nearbyCityValue = Array.isArray(query.cerca) ? query.cerca[0] : query.cerca;
  const nearbyCity = cityDirectory.some((item) => item.city === nearbyCityValue) ? nearbyCityValue : undefined;
  const profiles = prioritizeProfilesByCity(shuffleProfiles(filterPublicProfiles(await getPublicProfiles(), filters)), nearbyCity);

  return (
    <DirectoryShell>
      <section className="directory-hero">
        <p className="eyebrow">DIRECTORIO NACIONAL</p>
        <h1>Escorts en <em>todo Chile.</em></h1>
        <p>Explora perfiles publicados por ciudad, categoría, atributos y servicios. Los filtros combinan sus condiciones para entregar resultados precisos.</p>
        <NearbyDirectoryButton />
      </section>
      <section className="directory-content">
        <DirectoryFilters action="/escorts" filters={filters} />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y Hombres son categorías incompatibles. Selecciona solo una para buscar.</p>}
        <div className="directory-results-heading"><div><p className="eyebrow">RESULTADOS</p><h2>{profiles.length} perfil{profiles.length === 1 ? "" : "es"} encontrado{profiles.length === 1 ? "" : "s"}</h2></div><p>{nearbyCity ? `Mostramos primero los perfiles de ${nearbyCity}; puedes cambiar la ciudad desde los filtros.` : "Las etiquetas y servicios se muestran según la información aprobada de cada perfil."}</p></div>
        <ProfileGrid profiles={profiles} />
      </section>
    </DirectoryShell>
  );
}
