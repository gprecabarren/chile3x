import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryPagination } from "@/app/directorio/DirectoryPagination";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { getPublicProfilePage, readDirectoryFilters, readDirectoryPage, type DirectoryQuery } from "@/lib/directory";
import { getCurrentUser } from "@/lib/auth";
import { directoryPageMetadata, publicPageMetadata } from "@/lib/seo";
import { getCityBySlug, getPreferredCitySlug } from "@/app/locations";

const baseMetadata: Metadata = publicPageMetadata({ title: "Agencias de escorts en Chile", description: "Encuentra agencias de escorts en Chile por ciudad. Cada asociación con una escort requiere su aprobación antes de mostrarse en Chile3X.", path: "/agencias", socialTitle: "Agencias de escorts en Chile | Chile3X", socialDescription: "Agencias publicadas por ciudad en Chile3X." });
export async function generateMetadata({ searchParams }: { searchParams: Promise<DirectoryQuery> }): Promise<Metadata> {
  const query = await searchParams;
  return directoryPageMetadata(baseMetadata, "/agencias", query, readDirectoryPage(query));
}
export const dynamic = "force-dynamic";

export default async function AgenciesPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const query = await searchParams;
  const filters = readDirectoryFilters(query, { type: "agency" });
  const viewer = await getCurrentUser();
  const preferredCity = getCityBySlug(getPreferredCitySlug(await cookies()))?.city;
  const { profiles, page, hasNext, outOfRange } = await getPublicProfilePage(filters, { viewerId: viewer?.id, preferredCity, page: readDirectoryPage(query) });
  if (outOfRange) notFound();
  return <DirectoryShell kind="agency" selectedCity={filters.city ?? preferredCity}>
    <section className="directory-hero"><p className="eyebrow">DIRECTORIO DE AGENCIAS</p><h1>Agencias de escorts en <em>Chile.</em></h1><p>Una agencia puede invitar a una escort, pero solo se muestra como integrante cuando ella acepta la solicitud desde su cuenta.</p></section>
    <section className="directory-content">
      <DirectoryFilters key={JSON.stringify(filters)} action="/agencias" filters={filters} showEscortFilters={false} />
      <div id="resultados" className="directory-results-heading"><div><p className="eyebrow">AGENCIAS</p><h2>{profiles.length} agencia{profiles.length === 1 ? "" : "s"}{hasNext || page > 1 ? " en esta página" : ` visible${profiles.length === 1 ? "" : "s"}`}</h2></div></div>
      <ProfileGrid profiles={profiles} emptyMessage="Todavía no hay agencias visibles con esos filtros." />
      <DirectoryPagination path="/agencias" query={query} page={page} hasNext={hasNext} />
      <section className="directory-seo-summary"><p className="eyebrow">COBERTURA NACIONAL</p><h2>Agencias de escorts por ciudad</h2><p>Revisa agencias publicadas en Chile3X y sus perfiles asociados. La relación entre una agencia y cada escort se muestra únicamente después de la aceptación de la propia persona.</p><Link href="/escorts">Ver escorts en Chile</Link></section>
    </section>
  </DirectoryShell>;
}
