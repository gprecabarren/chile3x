import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageSamples, listPrivateSamples, listPrivateSampleCreators } from "@/lib/private-samples";
import { boundedSampleFilter, sampleCreatorLabel } from "@/lib/private-sample-filters";
import { SAMPLE_PROVENANCES, SAMPLE_PROVENANCE_LABELS, SAMPLE_STATUSES, SAMPLE_STATUS_LABELS, sampleListStatus } from "@/lib/private-sample-policy";
import { adminAuditDate, adminAuditInstant } from "@/lib/admin-audit-date";
import { privatePageMetadata } from "@/lib/seo";
import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { adminWhatsappHref } from "@/lib/admin-contact";
import { ReviewScope } from "@/app/admin/ReviewScope";
import { regions } from "@/app/locations";
import { escortGenders } from "@/lib/profile";
import { SampleFilters } from "./SampleFilters";
import { CopySampleLink, SampleLinkStatus } from "./CopySampleLink";
import { SampleDeleteAction } from "./SampleDeleteAction";
import { AdminShell, AdminPageHeading } from "../_components";
import "./samples-list.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Muestras privadas", description: "Presentaciones privadas de anuncios, sin crear cuentas ni publicaciones públicas.", path: "/admin/muestras" });

const notices: Record<string, string> = {
  trashed: "La muestra fue enviada a la papelera.",
  restored: "La muestra fue restaurada.",
  deleted: "La muestra fue eliminada definitivamente.",
  contact_marked: "Contacto registrado. La muestra quedará después de los contactos pendientes.",
  contact_cleared: "Se quitó la marca de contacto. La muestra vuelve a los pendientes.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; phone?: string; region?: string; city?: string; gender?: string; provenance?: string; sample_status?: string; status?: string; view?: string; contact?: string; notice?: string; creator?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/muestras");
  if (!canManageSamples(admin)) redirect("/admin/acceso-denegado?reason=permission");
  const query = await searchParams;
  const q = (typeof query.q === "string" ? query.q : "").trim().slice(0, 100);
  const phone = (typeof query.phone === "string" ? query.phone : "").trim().slice(0, 40);
  const selectedRegion = regions.find(item => item.title === query.region);
  const region = selectedRegion?.title ?? "";
  const cityOptions = selectedRegion ? selectedRegion.cities : regions.flatMap(item => item.cities);
  const city = cityOptions.find(value => value === query.city) ?? "";
  const gender = escortGenders.find(value => value === query.gender) ?? "";
  const provenance = SAMPLE_PROVENANCES.find(value => value === query.provenance) ?? "";
  const requestedStatus = query.sample_status ?? query.status;
  const view = query.view === "trash" || requestedStatus === "trashed" ? "trash" : "active";
  const status = view === "trash" ? "trashed" : SAMPLE_STATUSES.find(value => value === requestedStatus && value !== "trashed") ?? "";
  const contact = query.contact === "pending" || query.contact === "contacted" ? query.contact : "all";
  const creator = boundedSampleFilter(query.creator, 120);
  const [rows, creators] = await Promise.all([listPrivateSamples({ q, phone, region, city, gender, provenance, status, view, contact, creator }), listPrivateSampleCreators()]);
  // eslint-disable-next-line react-hooks/purity -- Request-time expiry in a dynamic server page.
  const now = Date.now();
  const filterQuery = new URLSearchParams();
  if (q) filterQuery.set("q", q);
  if (phone) filterQuery.set("phone", phone);
  if (region) filterQuery.set("region", region);
  if (city) filterQuery.set("city", city);
  if (gender) filterQuery.set("gender", gender);
  if (provenance) filterQuery.set("provenance", provenance);
  if (status && status !== "trashed") filterQuery.set("sample_status", status);
  if (contact !== "all") filterQuery.set("contact", contact);
  if (creator) filterQuery.set("creator", creator);
  const viewHref = (target: "active" | "trash") => {
    const values = new URLSearchParams(filterQuery);
    if (target === "trash") { values.set("view", "trash"); values.delete("sample_status"); }
    return `/admin/muestras${values.size ? `?${values}` : ""}`;
  };
  const returnQuery = new URLSearchParams(filterQuery);
  if (view === "trash") returnQuery.set("view", "trash");
  else if (status) returnQuery.set("sample_status", status);
  const returnTo = `/admin/muestras${returnQuery.size ? `?${returnQuery}` : ""}`;
  const filterLabels: Record<string, string> = {
    q: `Búsqueda: ${q}`,
    phone: `Teléfono: ${phone}`,
    region: `Región: ${selectedRegion?.shortTitle ?? region}`,
    city: `Ciudad: ${city}`,
    gender: `Género: ${gender}`,
    provenance: `Procedencia: ${provenance ? SAMPLE_PROVENANCE_LABELS[provenance] : ""}`,
    sample_status: `Estado: ${status && status !== "trashed" ? SAMPLE_STATUS_LABELS[status] : ""}`,
    contact: contact === "pending" ? "Pendientes de contactar" : "Ya contactados",
    creator: `Creador: ${sampleCreatorLabel(creators.find(item => item.id === creator)?.login)}`,
  };
  const applied = [...filterQuery.keys()].map(key => {
    const values = new URLSearchParams(returnQuery);
    values.delete(key);
    if (key === "region") values.delete("city");
    return { label: filterLabels[key], removeHref: `/admin/muestras${values.size ? `?${values}` : ""}` };
  });
  const filtered = applied.length > 0;

  return <AdminShell user={admin}><div className="admin-content samples-admin-content">
    <AdminPageHeading eyebrow="PRESENTACIONES PARA ANUNCIANTES" title={view === "trash" ? "Papelera de muestras" : "Muestras privadas"} description={view === "trash" ? "Muestras retiradas o vencidas. Puedes restaurarlas durante 30 días o eliminarlas definitivamente." : "Prepara y administra presentaciones privadas, sin crear cuentas ni anuncios en el directorio."} backHref={view === "trash" ? viewHref("active") : "/admin"}>
      <div className="sample-heading-actions"><ActionAnchor className="button button-primary" href="/admin/muestras/nueva">Crear muestra privada</ActionAnchor>{view !== "trash" && <ActionAnchor className="button button-outline" href={viewHref("trash")}><ActionIcon name="trash" />Ver papelera</ActionAnchor>}</div>
    </AdminPageHeading>
    <p className="samples-help">Cada muestra tiene un plazo de 7 días. Al vencer pasa a la papelera; desde allí puedes restaurarla o eliminarla definitivamente. Compartir una presentación no publica un anuncio.</p>
    {query.notice && notices[query.notice] && <p className="admin-success" role="status">{notices[query.notice]}</p>}
    <SampleFilters initial={{ q, phone, region, city, gender, provenance, status, contact, view, creator }} creators={creators} applied={applied} clearHref={view === "trash" ? "/admin/muestras?view=trash" : "/admin/muestras"} />
    <p className="sample-results-count" role="status">{rows.length} muestra{rows.length === 1 ? "" : "s"}{view === "trash" ? " en papelera" : ""}{filtered ? " con estos filtros" : ""}. Los contactos pendientes aparecen primero.{rows.length === 100 && " Se muestran hasta 100 resultados."}</p>
    <section className="samples-list" aria-label={view === "trash" ? "Muestras en papelera" : "Muestras privadas"}>
      {rows.map(row => {
        const rowStatus = sampleListStatus(row, now);
        const trashed = rowStatus === "trashed";
        const editorHref = row.migratedProfileId ? `/admin/anuncios-publicaciones/${encodeURIComponent(row.migratedProfileId)}/editar` : `/admin/muestras/${encodeURIComponent(row.id)}`;
        const deadline = adminAuditDate(new Date(row.trashedAt ?? row.expiresAt).toISOString());
        const whatsappHref = adminWhatsappHref(row.contactWhatsapp, row.displayName);
        return <ReviewScope key={row.id} as="article" className={`sample-list-card${row.contactedAt ? " is-contacted" : ""}`} resource={`sample:${row.id}`} revision={row.revision}>
          <header className="sample-row-heading"><div><h2>{row.displayName}</h2><p className="sample-row-location">{[row.age ? `${row.age} años` : "Edad sin definir", row.gender, row.city || "Ciudad sin definir"].filter(Boolean).join(" · ")}</p><p className="sample-row-handle">{row.handle ? `@${row.handle}` : "Sin usuario asignado"}</p><p className="sample-row-creator">Creada por <strong>{sampleCreatorLabel(row.creatorLogin)}</strong></p></div><SampleLinkStatus id={row.id} status={rowStatus} label={SAMPLE_STATUS_LABELS[rowStatus]} /></header>
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
            {!trashed && (!row.migratedAt || whatsappHref) && <div className="sample-share-actions">{!row.migratedAt && <CopySampleLink id={row.id} revision={row.revision} shared={Boolean(row.shared)} legacyLink={row.legacyLink} />}{whatsappHref && <ActionAnchor className="button contact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</ActionAnchor>}</div>}
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
            {trashed && <SampleDeleteAction id={row.id} revision={row.revision} displayName={row.displayName} returnTo={returnTo} />}
          </div>
        </ReviewScope>;
      })}
      {!rows.length && <div className="samples-empty"><h2>{view === "trash" ? "La papelera está vacía" : "No hay muestras para mostrar"}</h2><p>{filtered ? "Prueba otro nombre, teléfono, ubicación o estado de contacto. También puedes quitar los filtros aplicados." : view === "trash" ? "Las muestras que envíes a la papelera o que venzan aparecerán aquí." : "Crea una muestra privada para comenzar."}</p></div>}
    </section>
  </div></AdminShell>;
}
