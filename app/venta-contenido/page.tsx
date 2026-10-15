import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryPagination } from "@/app/directorio/DirectoryPagination";
import { CityProfileSections, DirectoryShell } from "@/app/directorio/_components";
import { DIRECTORY_PAGE_SIZE, getPublicProfilePage, readDirectoryFilters, readDirectoryPage, type DirectoryQuery } from "@/lib/directory";
import { readDirectoryOrderSeed } from "@/lib/directory-order";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { directoryPageMetadata, publicPageMetadata } from "@/lib/seo";
import { safeJsonLd } from "@/lib/json-ld";
import { profilePublicPath } from "@/lib/profile";

const baseMetadata = publicPageMetadata({
  title: "Venta de contenido para adultos en Chile",
  description: "Encuentra perfiles que venden contenido para adultos en Chile. Filtra por ciudad y categoría VIP, Premium o Bronze y consulta sus canales de contacto directo.",
  path: "/venta-contenido",
});

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<DirectoryQuery> }): Promise<Metadata> {
  const query = await searchParams;
  return directoryPageMetadata(baseMetadata, "/venta-contenido", query, readDirectoryPage(query));
}

export default async function ContentSalesPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const query = await searchParams;
  const filters = readDirectoryFilters(query, { contentDirectory: true });
  const [viewer, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const { profiles, page, hasNext, outOfRange, orderSeed } = await getPublicProfilePage(filters, { viewerId: viewer?.id, page: readDirectoryPage(query), orderSeed: readDirectoryOrderSeed(query.orden) });
  if (outOfRange) notFound();
  const siteUrl = siteBaseUrl(settings.site_url);
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", name: "Venta de contenido para adultos en Chile", description: "Perfiles con venta de contenido declarada, por ubicación y categoría de visibilidad.", url: `${siteUrl}/venta-contenido`, inLanguage: "es-CL", mainEntity: { "@type": "ItemList", numberOfItems: profiles.length, itemListElement: profiles.map((profile, index) => ({ "@type": "ListItem", position: (page - 1) * DIRECTORY_PAGE_SIZE + index + 1, name: profile.displayName, url: `${siteUrl}${profilePublicPath(profile)}` })) } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Chile3X", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Venta de contenido", item: `${siteUrl}/venta-contenido` }] },
  ] };
  return <DirectoryShell selectedCity={filters.city} kind="content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
    <section className="directory-hero"><p className="eyebrow">CONTENIDO DIGITAL · MAYORES DE 18 AÑOS</p><h1>Venta de contenido <em>en Chile.</em></h1><p>Explora perfiles que ofrecen contenido digital por contacto directo, Arsmate, OnlyFans u otros canales declarados. Incluye personas dedicadas exclusivamente al contenido y escorts que también lo venden.</p></section>
    <section className="directory-content">
      <DirectoryFilters key={JSON.stringify(filters)} action="/venta-contenido" filters={filters} contentDirectory showServices={false} />
      {filters.invalidCombination && <p className="filter-warning" role="alert">MILF y TRANS no se pueden combinar en una misma búsqueda.</p>}
      <div id="resultados" className="directory-results-heading"><div><p className="eyebrow">VENTA DE CONTENIDO · {filters.city ?? "CHILE"}</p><h2>{profiles.length} perfil{profiles.length === 1 ? "" : "es"}{hasNext || page > 1 ? " en esta página" : " disponibles"}</h2></div><p>La condición Venta de contenido está siempre activa. Los perfiles se distribuyen en VIP, Premium y Bronze y rotan dentro de los resultados.</p></div>
      <CityProfileSections profiles={profiles} city={filters.city ?? "Chile"} selectedCategory={filters.category} contentDirectory paginated={hasNext || page > 1} />
      <DirectoryPagination path="/venta-contenido" query={query} page={page} hasNext={hasNext} orderSeed={orderSeed} />
    </section>
    <section className="seo-content"><p className="eyebrow">GUÍA DE CONTENIDO DIGITAL</p><h2>Cómo encontrar personas que venden contenido en Chile</h2><p>La etiqueta Venta de contenido es declarada por cada anunciante y no depende de tener una galería privada en Chile3X. Puedes buscar una ciudad o región y revisar los medios de contacto publicados para conocer la oferta, condiciones y disponibilidad de cada persona.</p><h3>Contenido exclusivo y contacto directo</h3><p>Algunas personas utilizan plataformas externas como Arsmate u OnlyFans; otras acuerdan el acceso directamente. Chile3X no procesa pagos ni garantiza los acuerdos privados. Consulta previamente las condiciones y respeta la privacidad y los derechos sobre el contenido.</p><h3>Contenido digital no significa atención presencial</h3><p>Los perfiles que indican Solo vendo contenido no ofrecen servicios de escort por esa declaración. Aquí pueden aparecer en su nivel de visibilidad, pero mantienen esa modalidad diferenciada y no se incorporan a las categorías de escorts presenciales de otras páginas.</p></section>
  </DirectoryShell>;
}
