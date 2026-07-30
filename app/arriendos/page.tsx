import type { Metadata } from "next";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { filterPublicProfiles, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";

export const metadata: Metadata = { title: "Arriendos | Chile3X", description: "Arriendos publicados por ciudad en Chile3X.", alternates: { canonical: "/arriendos" } };
export const dynamic = "force-dynamic";

export default async function RentalsPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const filters = readDirectoryFilters(await searchParams, { type: "rental" });
  const profiles = filterPublicProfiles(await getPublicProfiles(), filters);
  return <DirectoryShell><section className="directory-hero"><p className="eyebrow">DIRECTORIO DE ARRIENDOS</p><h1>Arriendos por <em>ciudad.</em></h1><p>Explora opciones publicadas con ubicación referencial, características y servicios incluidos.</p></section><section className="directory-content"><DirectoryFilters action="/arriendos" filters={filters} showEscortFilters={false} /><div className="directory-results-heading"><div><p className="eyebrow">ARRIENDOS</p><h2>{profiles.length} arriendo{profiles.length === 1 ? "" : "s"} visible{profiles.length === 1 ? "" : "s"}</h2></div></div><ProfileGrid profiles={profiles} emptyMessage="Todavía no hay arriendos visibles con esos filtros." /></section></DirectoryShell>;
}
