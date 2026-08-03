import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryFilters } from "@/app/directorio/DirectoryFilters";
import { DirectoryShell, ProfileGrid } from "@/app/directorio/_components";
import { filterPublicProfiles, getPublicProfiles, readDirectoryFilters, type DirectoryQuery } from "@/lib/directory";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Agencias de escorts en Chile", description: "Encuentra agencias de escorts en Chile por ciudad. Cada asociación con una escort requiere su aprobación antes de mostrarse en Chile3X.", alternates: { canonical: "/agencias" }, openGraph: { title: "Agencias de escorts en Chile", description: "Agencias publicadas por ciudad en Chile3X.", url: "/agencias", locale: "es_CL", type: "website" } };
export const dynamic = "force-dynamic";

export default async function AgenciesPage({ searchParams }: { searchParams: Promise<DirectoryQuery> }) {
  const filters = readDirectoryFilters(await searchParams, { type: "agency" });
  const viewer = await getCurrentUser();
  const profiles = filterPublicProfiles(await getPublicProfiles({ viewerId: viewer?.id }), filters);
  return <DirectoryShell><section className="directory-hero"><p className="eyebrow">DIRECTORIO DE AGENCIAS</p><h1>Agencias de escorts en <em>Chile.</em></h1><p>Una agencia puede invitar a una escort, pero solo se muestra como integrante cuando ella acepta la solicitud desde su cuenta.</p></section><section className="directory-content"><DirectoryFilters action="/agencias" filters={filters} showEscortFilters={false} /><div className="directory-results-heading"><div><p className="eyebrow">AGENCIAS</p><h2>{profiles.length} agencia{profiles.length === 1 ? "" : "s"} visible{profiles.length === 1 ? "" : "s"}</h2></div></div><ProfileGrid profiles={profiles} emptyMessage="Todavía no hay agencias visibles con esos filtros." /><section className="directory-seo-summary"><p className="eyebrow">COBERTURA NACIONAL</p><h2>Agencias de escorts por ciudad</h2><p>Revisa agencias publicadas en Chile3X y sus perfiles asociados. La relación entre una agencia y cada escort se muestra únicamente después de la aceptación de la propia persona.</p><Link href="/escorts">Ver escorts en Chile</Link></section></section></DirectoryShell>;
}
