import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageSamples, listPrivateSamples } from "@/lib/private-samples";
import { SAMPLE_PROVENANCES, SAMPLE_PROVENANCE_LABELS, SAMPLE_STATUSES, SAMPLE_STATUS_LABELS, sampleListStatus } from "@/lib/private-sample-policy";
import { adminAuditDate, adminAuditInstant } from "@/lib/admin-audit-date";
import { privatePageMetadata } from "@/lib/seo";
import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { adminWhatsappHref } from "@/lib/admin-contact";
import { ReviewScope } from "@/app/admin/ReviewScope";
import { AdminShell, AdminPageHeading } from "../_components";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Muestras privadas", description: "Presentaciones privadas de anuncios, sin crear cuentas ni publicaciones públicas.", path: "/admin/muestras" });

const notices: Record<string, string> = {
  trashed: "La muestra fue enviada a la papelera.",
  restored: "La muestra fue restaurada.",
  deleted: "La muestra fue eliminada definitivamente.",
  contact_marked: "Contacto registrado. La muestra quedará después de los contactos pendientes.",
  contact_cleared: "Se quitó la marca de contacto. La muestra vuelve a los pendientes.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; provenance?: string; sample_status?: string; status?: string; view?: string; contact?: string; notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/muestras");
  if (!canManageSamples(admin)) redirect("/admin/acceso-denegado?reason=permission");
  const query = await searchParams;
  const q = (typeof query.q === "string" ? query.q : "").trim().slice(0, 100);
  const provenance = SAMPLE_PROVENANCES.find(value => value === query.provenance) ?? "";
  const requestedStatus = query.sample_status ?? query.status;
  const view = query.view === "trash" || requestedStatus === "trashed" ? "trash" : "active";
  const status = view === "trash" ? "trashed" : SAMPLE_STATUSES.find(value => value === requestedStatus && value !== "trashed") ?? "";
  const contact = query.contact === "pending" || query.contact === "contacted" ? query.contact : "all";
  const rows = await listPrivateSamples({ q, provenance, status, view, contact });
  // eslint-disable-next-line react-hooks/purity -- Request-time expiry in a dynamic server page.
  const now = Date.now();
  const filterQuery = new URLSearchParams();
  if (q) filterQuery.set("q", q);
  if (provenance) filterQuery.set("provenance", provenance);
  if (contact !== "all") filterQuery.set("contact", contact);
  const viewHref = (target: "active" | "trash") => {
    const values = new URLSearchParams(filterQuery);
    if (target === "trash") values.set("view", "trash");
    return `/admin/muestras${values.size ? `?${values}` : ""}`;
  };
  const returnQuery = new URLSearchParams(filterQuery);
  if (view === "trash") returnQuery.set("view", "trash");
  else if (status) returnQuery.set("sample_status", status);
  const returnTo = `/admin/muestras${returnQuery.size ? `?${returnQuery}` : ""}`;
  const filtered = Boolean(q || provenance || contact !== "all" || (status && status !== "trashed"));

  return <AdminShell user={admin}><div className="admin-content samples-admin-content">
    <AdminPageHeading eyebrow="PRESENTACIONES PARA ANUNCIANTES" title="Muestras privadas" description="Prepara y administra presentaciones privadas, sin crear cuentas ni anuncios en el directorio." backHref="/admin">
      <ActionAnchor className="button button-primary" href="/admin/muestras/nueva">Crear muestra privada</ActionAnchor>
    </AdminPageHeading>
    <p className="samples-help">Cada muestra tiene un plazo de 7 días. Al vencer pasa a la papelera; desde allí puedes restaurarla o eliminarla definitivamente. Compartir una presentación no publica un anuncio.</p>
    {query.notice && notices[query.notice] && <p className="admin-success" role="status">{notices[query.notice]}</p>}
    <nav className="sample-view-tabs" aria-label="Ubicación de las muestras">
      <ActionAnchor className="button button-outline" href={viewHref("active")} aria-current={view === "active" ? "page" : undefined}>Muestras</ActionAnchor>
      <ActionAnchor className="button button-outline" href={viewHref("trash")} aria-current={view === "trash" ? "page" : undefined}>Papelera</ActionAnchor>
    </nav>
    <form className="sample-filters" method="get" role="search">
      {view === "trash" && <input type="hidden" name="view" value="trash" />}
      <label>Nombre o usuario de la muestra<input name="q" type="search" maxLength={100} defaultValue={q} placeholder="Buscar por nombre o @usuario" /></label>
      <label>Procedencia<select name="provenance" defaultValue={provenance}><option value="">Todas las procedencias</option>{SAMPLE_PROVENANCES.map(value => <option key={value} value={value}>{SAMPLE_PROVENANCE_LABELS[value]}</option>)}</select></label>
      <label>Estado<select name="sample_status" defaultValue={status} disabled={view === "trash"}>{view === "trash" ? <option value="trashed">En papelera</option> : <><option value="">Todos los estados</option>{SAMPLE_STATUSES.filter(value => value !== "trashed").map(value => <option key={value} value={value}>{SAMPLE_STATUS_LABELS[value]}</option>)}</>}</select></label>
      <label>Seguimiento de contacto<select name="contact" defaultValue={contact}><option value="all">Todos los contactos</option><option value="pending">Pendientes de contactar</option><option value="contacted">Ya contactados</option></select></label>
      <div className="sample-filter-actions"><ActionButton className="button button-primary" type="submit">Aplicar filtros</ActionButton>{filtered && <ActionAnchor className="button button-outline" href={view === "trash" ? "/admin/muestras?view=trash" : "/admin/muestras"}>Limpiar filtros</ActionAnchor>}</div>
    </form>
    <p className="sample-results-count" role="status">{rows.length} muestra{rows.length === 1 ? "" : "s"}{view === "trash" ? " en papelera" : ""}{filtered ? " con estos filtros" : ""}. Los contactos pendientes aparecen primero.{rows.length === 100 && " Se muestran hasta 100 resultados."}</p>
    <section className="samples-list" aria-label={view === "trash" ? "Muestras en papelera" : "Muestras privadas"}>
      {rows.map(row => {
        const rowStatus = sampleListStatus(row, now);
        const trashed = rowStatus === "trashed";
        const editorHref = row.migratedProfileId ? `/admin/anuncios-publicaciones/${encodeURIComponent(row.migratedProfileId)}/editar` : `/admin/muestras/${encodeURIComponent(row.id)}`;
        const deadline = adminAuditDate(new Date(row.trashedAt ?? row.expiresAt).toISOString());
        const whatsappHref = adminWhatsappHref(row.contactWhatsapp, row.displayName);
        return <ReviewScope key={row.id} as="article" className={`sample-list-card${row.contactedAt ? " is-contacted" : ""}`} resource={`sample:${row.id}`} revision={row.revision}>
          <header className="sample-row-heading"><div><h2>{row.displayName}</h2><p className="sample-row-location">{[row.age ? `${row.age} años` : "Edad sin definir", row.gender, row.city || "Ciudad sin definir"].filter(Boolean).join(" · ")}</p><p className="sample-row-handle">{row.handle ? `@${row.handle}` : "Sin usuario asignado"}</p></div><span className={`sample-status is-${rowStatus}`}>{SAMPLE_STATUS_LABELS[rowStatus]}</span></header>
          <dl className="sample-row-metadata">
            <div><dt>Procedencia</dt><dd>{SAMPLE_PROVENANCE_LABELS[row.provenance]}</dd></div>
            <div><dt>Creación</dt><dd><time dateTime={adminAuditInstant(row.createdAt)}>{adminAuditDate(row.createdAt)}</time></dd></div>
            <div><dt>Última actualización</dt><dd><time dateTime={adminAuditInstant(row.updatedAt)}>{adminAuditDate(row.updatedAt)}</time></dd></div>
            <div><dt>{trashed ? "En papelera desde" : row.migratedAt ? "Conversión" : "Vence"}</dt><dd>{!trashed && row.migratedAt ? adminAuditDate(row.migratedAt) : deadline}</dd></div>
          </dl>
          <div className={`sample-contact-status${row.contactedAt ? " is-contacted" : ""}`}>
            <span><ActionIcon name={row.contactedAt ? "check" : "chat"} /><strong>{row.contactedAt ? "Contactado" : "Pendiente de contactar"}</strong></span>
            <p>{row.contactedAt ? <><time dateTime={adminAuditInstant(row.contactedAt)}>{adminAuditDate(row.contactedAt)}</time>{row.contactedByLogin ? ` · ${row.contactedByLogin.startsWith("@") ? row.contactedByLogin : `@${row.contactedByLogin}`}` : " · Administrador registrado"}</> : "Abrir WhatsApp no cambia este estado. Marca el contacto cuando el equipo haya hablado con esta persona."}</p>
          </div>
          <div className="sample-row-actions">
            {!trashed && <ActionAnchor className="button button-primary" href={editorHref}>{row.migratedAt ? "Revisar anuncio real" : "Administrar muestra"}</ActionAnchor>}
            {!trashed && whatsappHref && <ActionAnchor className="button contact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</ActionAnchor>}
            {!trashed && !row.migratedAt && <form action={`/api/admin/muestras/${encodeURIComponent(row.id)}`} method="post">
              <input type="hidden" name="sample_action" value={row.contactedAt ? "contact_clear" : "contact_mark"} />
              <input type="hidden" name="review_key" value={`sample:${row.id}`} /><input type="hidden" name="review_revision" value={row.revision} />
              <input type="hidden" name="return_to" value={returnTo} />
              <ActionButton className="button button-outline sample-contact-toggle" type="submit" aria-pressed={Boolean(row.contactedAt)}><ActionIcon name={row.contactedAt ? "refresh" : "check"} />{row.contactedAt ? "Quitar marca de contacto" : "Marcar como contactado"}</ActionButton>
            </form>}
            <form action={`/api/admin/muestras/${encodeURIComponent(row.id)}`} method="post">
              <input type="hidden" name="sample_action" value={trashed ? "restore" : "trash"} />
              <input type="hidden" name="review_key" value={`sample:${row.id}`} /><input type="hidden" name="review_revision" value={row.revision} />
              <input type="hidden" name="return_to" value={returnTo} />
              <ActionButton className="button button-outline" type="submit"><ActionIcon name={trashed ? "refresh" : "trash"} />{trashed ? "Restaurar muestra" : "Enviar a papelera"}</ActionButton>
            </form>
            {trashed && <ActionAnchor className="button button-outline" href={`/admin/muestras/${encodeURIComponent(row.id)}`}>Revisar muestra en papelera</ActionAnchor>}
          </div>
        </ReviewScope>;
      })}
      {!rows.length && <div className="samples-empty"><h2>{view === "trash" ? "La papelera está vacía" : "No hay muestras para mostrar"}</h2><p>{filtered ? "Prueba otro nombre, procedencia, estado o seguimiento de contacto." : view === "trash" ? "Las muestras que envíes a la papelera o que venzan aparecerán aquí." : "Crea una muestra privada para comenzar."}</p></div>}
    </section>
  </div></AdminShell>;
}
