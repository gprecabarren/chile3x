import { and, desc, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { cityDirectory, regions } from "@/app/locations";
import { getDb } from "@/db";
import { privateSampleIntakes } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminAuditDate, adminAuditInstant } from "@/lib/admin-audit-date";
import { chileDayBoundary } from "@/lib/chile-date-boundary";
import { intakeListHref, readIntakeFilters } from "@/lib/private-sample-intake-filters";
import { SAMPLE_INTAKES_ADMIN_PATH } from "@/lib/private-sample-policy";
import { canManageSamples } from "@/lib/private-samples";
import { privatePageMetadata } from "@/lib/seo";
import { AdminShell, AdminPageHeading } from "../../_components";
import { CopyIntakeLink } from "./CopyIntakeLink";
import "./intake-list.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({
  title: "Fichas formulario",
  description: "Administración privada de fichas enviadas.",
  path: SAMPLE_INTAKES_ADMIN_PATH,
});
const pageSize = 30;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/api/auth/github/start?return_to=${SAMPLE_INTAKES_ADMIN_PATH}`);
  if (!canManageSamples(admin)) redirect("/admin/acceso-denegado?reason=permission");

  const filters = readIntakeFilters(await searchParams);
  const { page, q, cities, status, from, to } = filters;
  const { id, displayName, city, accountEmail, createdAt, processedAt, sampleId } = privateSampleIntakes;
  const conditions: SQL[] = [];
  if (q) {
    // SQLite lower() folds ASCII only, so also normalize accented Spanish letters.
    let name = sql`lower(${displayName})`;
    for (const letter of "áéíóúüñ") {
      const base = letter === "ñ" ? letter : letter.normalize("NFD")[0];
      name = sql`replace(replace(${name}, ${letter}, ${base}), ${letter.toUpperCase()}, ${base})`;
    }
    const term = q.toLocaleLowerCase("es-CL").normalize("NFD").replace(/[\u0300-\u0302\u0308]/g, "").normalize("NFC");
    conditions.push(sql`instr(${name}, ${term}) > 0`);
  }
  if (cities.length) conditions.push(inArray(city, cities));
  if (status) conditions.push(status === "pending" ? isNull(processedAt) : isNotNull(processedAt));
  if (from) conditions.push(sql`datetime(${createdAt}) >= datetime(${chileDayBoundary(from)})`);
  if (to) conditions.push(sql`datetime(${createdAt}) <= datetime(${chileDayBoundary(to, true)})`);
  const hasFilters = conditions.length > 0;
  const reversedDates = Boolean(from && to && from > to);
  const rows = reversedDates ? [] : await (await getDb()).select({ id, displayName, city, accountEmail, createdAt, processedAt, sampleId })
    .from(privateSampleIntakes).where(and(...conditions)).orderBy(desc(createdAt), desc(id)).limit(pageSize + 1).offset((page - 1) * pageSize);

  return <AdminShell user={admin}><div className="admin-content samples-admin-content intake-admin">
    <AdminPageHeading eyebrow="MUESTRAS" title="Fichas formulario" description="Comparte el formulario, revisa las fichas enviadas y prepara muestras privadas." backHref="/admin/muestras">
      <div className="sample-heading-actions">
        <CopyIntakeLink />
        <ActionAnchor className="button button-outline" href="/ficha-escort" target="_blank" rel="noopener noreferrer">Abrir formulario</ActionAnchor>
      </div>
    </AdminPageHeading>
    <form className="sample-filters" action={SAMPLE_INTAKES_ADMIN_PATH} method="get" role="search" aria-labelledby="intake-filter-title">
      <header className="sample-filters-heading"><h2 id="intake-filter-title">Buscar fichas</h2></header>
      <div className="sample-filter-grid">
        <label>Nombre visible<input type="search" name="q" maxLength={80} defaultValue={q} placeholder="Buscar por nombre" /></label>
        <label>Ubicación<select name="lugar" aria-label="Ubicación" defaultValue={filters.place}>
          <option value="">Todas las ubicaciones</option>
          {regions.filter(region => region.cities.length > 0).map(region => <optgroup key={region.id} label={region.displayTitle}>
            <option value={region.id}>Toda la región de {region.shortTitle}</option>
            {cityDirectory.filter(item => item.regionSlug === region.id).map(item => <option key={item.citySlug} value={item.citySlug}>{item.city}</option>)}
          </optgroup>)}
        </select></label>
        <label>Estado<select name="estado" aria-label="Estado" defaultValue={status}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente de gestionar</option>
          <option value="processed">Gestionada</option>
        </select></label>
      </div>
      <div className="sample-filter-grid intake-date-filters">
        <label>Recibida desde<input type="date" name="desde" defaultValue={from} /></label>
        <label>Recibida hasta<input type="date" name="hasta" defaultValue={to} /></label>
      </div>
      <div className="sample-filter-actions">
        <ActionButton className="button button-primary" type="submit">Aplicar filtros</ActionButton>
        {hasFilters && <ActionAnchor className="button button-outline" href={SAMPLE_INTAKES_ADMIN_PATH}>Limpiar filtros</ActionAnchor>}
      </div>
      {reversedDates && <p className="admin-notice" role="alert">La fecha «Recibida hasta» debe ser igual o posterior a «Recibida desde».</p>}
    </form>
    {!reversedDates && <section className="samples-list" aria-label="Resultados de fichas">
      {rows.slice(0, pageSize).map(row => <article key={row.id} className="sample-list-card">
        <header className="sample-row-heading">
          <div><h2>{row.displayName}</h2><p>{row.city} · <time dateTime={adminAuditInstant(row.createdAt)}>{adminAuditDate(row.createdAt)}</time></p></div>
          <span className={`sample-status ${row.processedAt ? "is-active" : "is-unshared"}`}>{row.processedAt ? "Gestionada" : "Pendiente de gestionar"}</span>
        </header>
        {row.accountEmail && <details className="sample-intake-email"><summary>Correo para la cuenta</summary><p>{row.accountEmail}</p></details>}
        <div className="sample-row-actions">
          {row.sampleId ? <ActionAnchor className="button button-outline" href={`/admin/muestras/${row.sampleId}`}>Abrir muestra</ActionAnchor>
            : !row.processedAt ? <ActionAnchor className="button button-primary" href={`/admin/muestras/nueva?ficha=${row.id}`}>Preparar muestra</ActionAnchor>
            : <p>La muestra vinculada fue eliminada.</p>}
          {row.processedAt && <p>Gestionada el <time dateTime={adminAuditInstant(row.processedAt)}>{adminAuditDate(row.processedAt)}</time></p>}
        </div>
      </article>)}
      {!rows.length && <div className="samples-empty">
        <h2>{page > 1 ? "No hay fichas en esta página" : hasFilters ? "No hay fichas que coincidan con los filtros" : "Todavía no hay fichas"}</h2>
        <p>{page > 1 ? "Puedes volver a la primera página." : hasFilters ? "Prueba con otro nombre, ubicación, estado o fecha." : "Las fichas aparecerán aquí cuando se envíe el formulario."}</p>
      </div>}
    </section>}
    {!reversedDates && (page > 1 || rows.length > pageSize) && <nav className="sample-heading-actions sample-intake-pagination" aria-label="Páginas de fichas">
      {page > 1 && <ActionAnchor className="button button-outline" href={intakeListHref(filters, rows.length ? page - 1 : 1)}>{rows.length ? "Anterior" : "Primera página"}</ActionAnchor>}
      <span>Página {page}</span>
      {rows.length > pageSize && <ActionAnchor className="button button-outline" href={intakeListHref(filters, page + 1)}>Siguiente</ActionAnchor>}
    </nav>}
  </div></AdminShell>;
}
