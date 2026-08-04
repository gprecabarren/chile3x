import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { filterPublicProfiles, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";
import { getCurrentUser } from "@/lib/auth";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({ title: "Arriendos para escorts en Chile", description: "Explora arriendos para escorts en Chile por ciudad, con características y servicios incluidos publicados en Chile3X.", path: "/arriendos", socialTitle: "Arriendos para escorts en Chile | Chile3X", socialDescription: "Arriendos publicados por ciudad en Chile3X." });
export const dynamic = "force-dynamic";

export default async function RentalsPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const filters = readDirectoryFilters(await searchParams, { type: "rental" });
  const viewer = await getCurrentUser();
  const profiles = filterPublicProfiles(await getPublicProfiles({ viewerId: viewer?.id }), filters);
  return <DirectoryShell><section className="directory-hero"><p className="eyebrow">DIRECTORIO DE ARRIENDOS</p><h1>Arriendos para escorts en <em>Chile.</em></h1><p>Explora opciones publicadas por ciudad, con ubicación referencial, características y servicios incluidos.</p></section><section className="directory-content"><DirectoryFilters action="/arriendos" filters={filters} showEscortFilters={false} /><div className="directory-results-heading"><div><p className="eyebrow">ARRIENDOS</p><h2>{profiles.length} arriendo{profiles.length === 1 ? "" : "s"} visible{profiles.length === 1 ? "" : "s"}</h2></div></div><ProfileGrid profiles={profiles} emptyMessage="Todavía no hay arriendos visibles con esos filtros." /><section className="directory-seo-summary"><p className="eyebrow">DIRECTORIO POR CIUDAD</p><h2>Arriendos para escorts, con información clara</h2><p>Compara arriendos publicados en Chile3X por ciudad y revisa sus características antes de contactar directamente a quien publica. Los acuerdos se realizan fuera de la plataforma.</p><Link href="/escorts">Explorar escorts en Chile</Link></section></section></DirectoryShell>;
}
