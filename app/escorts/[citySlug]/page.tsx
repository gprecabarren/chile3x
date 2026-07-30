import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryShell, ProfileGrid, SeoContent } from "@/app/directorio/_components";
import { StoryRail } from "@/app/historias/StoryRail";
import { filterPublicProfiles, getCityInfo, getCityPath, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";
import { getActiveStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

type CityPageProps = { params: Promise<{ citySlug: string }>; searchParams: Promise<DirectoryQuery> };

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) return {};
  return {
    title: `Escorts en ${city.city} | Directorio Chile3X`,
    description: `Perfiles de escorts, agencias y arriendos en ${city.city}. Filtra por categoría, nacionalidad, atributos y servicios.`,
    alternates: { canonical: `/escorts/${city.citySlug}` },
  };
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { citySlug } = await params;
  const city = getCityInfo(citySlug);
  if (!city) notFound();
  const filters = readDirectoryFilters(await searchParams, { region: city.region, city: city.city });
  const [publicProfiles, stories] = await Promise.all([getPublicProfiles(), getActiveStories({ city: city.city })]);
  const profiles = filterPublicProfiles(publicProfiles, filters);
  const basePath = getCityPath(city.city);
  const categories = [
    ["Todos", basePath], ["VIP", `${basePath}?tier=vip`], ["Premium", `${basePath}?tier=premium`], ["Gold", `${basePath}?tier=gold`],
    ["MILF", `${basePath}?tag=milf`], ["Hombres", `${basePath}?tag=hombres`], ["TRANS", `${basePath}?tag=trans`], ["Masajes", `${basePath}?tag=masajes`],
    ["Agencias", `${basePath}?tipo=agency`], ["Arriendos", `${basePath}?tipo=rental`],
  ] as const;
  const schema = { "@context": "https://schema.org", "@type": "ItemList", name: `Perfiles adultos en ${city.city}`, numberOfItems: profiles.length, itemListElement: profiles.map((profile, index) => ({ "@type": "ListItem", position: index + 1, url: `/perfil/${profile.slug}`, name: profile.displayName })) };

  return (
    <DirectoryShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="city-hero"><p className="eyebrow">{city.region.toUpperCase()}</p><h1>Escorts en <em>{city.city}</em></h1><p>Perfiles, agencias y arriendos disponibles en {city.city}. Navega por categoría o afina la búsqueda con filtros avanzados.</p></section>
      <section className="directory-content city-content">
        <nav className="city-category-links" aria-label={`Categorías en ${city.city}`}>{categories.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</nav>
        <DirectoryFilters action={basePath} filters={filters} pinnedCity={city.city} pinnedRegion={city.region} showType />
        {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y Hombres son categorías incompatibles. Selecciona solo una para buscar.</p>}
        <StoryRail stories={stories} city={city.city} />
        <div className="directory-results-heading"><div><p className="eyebrow">{city.city.toUpperCase()}</p><h2>{profiles.length} publicación{profiles.length === 1 ? "" : "es"} visible{profiles.length === 1 ? "" : "s"}</h2></div><p>Esta página mantiene la ciudad fija; los filtros no mezclan resultados de otros territorios.</p></div>
        <ProfileGrid profiles={profiles} emptyMessage={`Aún no hay publicaciones que coincidan con los filtros en ${city.city}.`} />
        <SeoContent city={city.city} count={profiles.length} />
      </section>
    </DirectoryShell>
  );
}
