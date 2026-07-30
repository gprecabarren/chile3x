import type { Metadata } from "next";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { filterPublicProfiles, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";

export const metadata: Metadata = { title: "Agencias | Chile3X", description: "Agencias publicadas en Chile3X por ciudad. Cada asociación con una escort requiere su aprobación.", alternates: { canonical: "/agencias" } };
export const dynamic = "force-dynamic";

export default async function AgenciesPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const filters = readDirectoryFilters(await searchParams, { type: "agency" });
  const profiles = filterPublicProfiles(await getPublicProfiles(), filters);
  return <DirectoryShell><section className="directory-hero"><p className="eyebrow">DIRECTORIO DE AGENCIAS</p><h1>Agencias con <em>asociaciones consentidas.</em></h1><p>Una agencia puede invitar a una escort, pero solo se muestra como integrante cuando ella acepta la solicitud desde su cuenta.</p></section><section className="directory-content"><DirectoryFilters action="/agencias" filters={filters} showEscortFilters={false} /><div className="directory-results-heading"><div><p className="eyebrow">AGENCIAS</p><h2>{profiles.length} agencia{profiles.length === 1 ? "" : "s"} visible{profiles.length === 1 ? "" : "s"}</h2></div></div><ProfileGrid profiles={profiles} emptyMessage="Todavía no hay agencias visibles con esos filtros." /></section></DirectoryShell>;
}
