import Link from "next/link";
import type { DirectoryQuery } from "@/lib/directory";

export function DirectoryPagination({ path, query, page, hasNext }: { path: string; query: DirectoryQuery; page: number; hasNext: boolean }) {
  if (page === 1 && !hasNext) return null;
  function href(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "pagina" || !value) continue;
      for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
    }
    if (target > 1) params.set("pagina", String(target));
    const search = params.toString();
    return `${path}${search ? `?${search}` : ""}#resultados`;
  }
  return <nav className="directory-pagination" aria-label="Páginas de resultados">
    {page > 1 && <Link href={href(page - 1)} rel="prev">← Anterior</Link>}
    <span>Página {page}</span>
    {hasNext && <Link href={href(page + 1)} rel="next">Siguiente →</Link>}
  </nav>;
}
