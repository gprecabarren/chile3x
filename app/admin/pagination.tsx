import Link from "next/link";

export function readAdminPage(value: string | undefined) {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function pageHref(pathname: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function pageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((left, right) => left - right);
}

export function AdminPagination({
  pathname,
  params,
  currentPage,
  totalItems,
  pageSize,
  label = "Resultados",
}: {
  pathname: string;
  params: URLSearchParams;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const pages = pageNumbers(currentPage, totalPages);
  return <nav className="admin-pagination" aria-label={`Paginación de ${label.toLocaleLowerCase("es-CL")}`}>
    <span>{label}: página {currentPage} de {totalPages}</span>
    <div>
      {currentPage > 1 && <Link className="button button-outline" href={pageHref(pathname, params, currentPage - 1)}>Anterior</Link>}
      {pages.map((page, index) => <span className="admin-pagination-number" key={page}>
        {index > 0 && pages[index - 1] !== page - 1 && <i aria-hidden="true">…</i>}
        {page === currentPage
          ? <b aria-current="page">{page}</b>
          : <Link href={pageHref(pathname, params, page)}>{page}</Link>}
      </span>)}
      {currentPage < totalPages && <Link className="button button-outline" href={pageHref(pathname, params, currentPage + 1)}>Siguiente</Link>}
    </div>
  </nav>;
}
