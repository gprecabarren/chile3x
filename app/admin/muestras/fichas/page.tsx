import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ActionAnchor } from "@/app/ActionButton";
import { getDb } from "@/db";
import { privateSampleIntakes } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminAuditDate } from "@/lib/admin-audit-date";
import { canManageSamples } from "@/lib/private-samples";
import { privatePageMetadata } from "@/lib/seo";
import { AdminShell, AdminPageHeading } from "../../_components";
import { CopyIntakeLink } from "./CopyIntakeLink";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Fichas recibidas", description: "Historial privado de fichas enviadas.", path: "/admin/muestras/fichas" });
const pageSize = 30;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/muestras/fichas");
  if (!canManageSamples(admin)) redirect("/admin/acceso-denegado?reason=permission");
  const { page: rawPage } = await searchParams;
  const page = /^\d{1,6}$/.test(rawPage ?? "") ? Math.max(1, Number(rawPage)) : 1;
  const { id, displayName, city, accountEmail, createdAt, processedAt, sampleId } = privateSampleIntakes;
  const rows = await (await getDb()).select({ id, displayName, city, accountEmail, createdAt, processedAt, sampleId }).from(privateSampleIntakes)
    .orderBy(desc(privateSampleIntakes.createdAt), desc(privateSampleIntakes.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
  return <AdminShell user={admin}><div className="admin-content samples-admin-content">
    <AdminPageHeading eyebrow="MUESTRAS" title="Fichas recibidas" description="Comparte el formulario con la persona anunciante. Sus datos quedan aquí para preparar una muestra privada." backHref="/admin/muestras">
      <div className="sample-heading-actions">
        <CopyIntakeLink />
        <ActionAnchor className="button button-outline" href="/ficha-escort" target="_blank" rel="noopener noreferrer">Abrir formulario</ActionAnchor>
      </div>
    </AdminPageHeading>
    <section className="samples-list" aria-label="Historial de fichas">
      {rows.slice(0, pageSize).map(row => <article key={row.id} className="sample-list-card">
        <header className="sample-row-heading"><div><h2>{row.displayName}</h2><p>{row.city} · {adminAuditDate(row.createdAt)}</p></div>
          <span className={`sample-status ${row.processedAt ? "is-active" : "is-unshared"}`}>{row.processedAt ? "Gestionada" : "Recibida"}</span>
        </header>
        {row.accountEmail && <details className="sample-intake-email"><summary>Correo para la cuenta</summary><p>{row.accountEmail}</p></details>}
        <div className="sample-heading-actions">
          {row.sampleId ? <ActionAnchor className="button button-outline" href={`/admin/muestras/${row.sampleId}`}>Abrir muestra</ActionAnchor>
            : !row.processedAt ? <ActionAnchor className="button button-primary" href={`/admin/muestras/nueva?ficha=${row.id}`}>Preparar muestra</ActionAnchor>
            : <p>La muestra vinculada fue eliminada.</p>}
          {row.processedAt && <p>Gestionada el {adminAuditDate(row.processedAt)}</p>}
        </div>
      </article>)}
      {!rows.length && <p className="samples-empty">No hay fichas en esta página.</p>}
    </section>
    {(page > 1 || rows.length > pageSize) && <nav className="sample-heading-actions sample-intake-pagination" aria-label="Páginas del historial">
      {page > 1 && <ActionAnchor className="button button-outline" href={`?page=${page - 1}`}>Anterior</ActionAnchor>}
      {rows.length > pageSize && <ActionAnchor className="button button-outline" href={`?page=${page + 1}`}>Siguiente</ActionAnchor>}
    </nav>}
  </div></AdminShell>;
}
