import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getSiteSettings } from "@/lib/site-settings";
import { listAdminSponsorGroups } from "@/lib/sponsors";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  enabled: "La página de Sitios asociados está publicada.",
  disabled: "La página quedó oculta para visitantes y buscadores.",
  "group-created": "El grupo fue creado.",
  "group-updated": "El grupo fue actualizado.",
  "group-deleted": "El grupo fue eliminado.",
  "card-created": "El sitio asociado fue creado.",
  "card-updated": "El sitio asociado fue actualizado.",
  "card-deleted": "El sitio asociado fue eliminado.",
};

const errors: Record<string, string> = {
  group: "Revisa el nombre y la descripción del grupo.",
  "confirm-group": "Marca la confirmación antes de eliminar el grupo.",
  "group-not-empty": "Primero elimina o mueve las tarjetas que pertenecen a ese grupo.",
  "group-missing": "El grupo seleccionado ya no existe.",
  card: "Revisa los textos y asegúrate de usar un enlace https:// válido.",
  background: "Cada tarjeta necesita una imagen principal JPEG, PNG o WebP de hasta 5 MB.",
  upload: "No fue posible guardar las imágenes. Intenta nuevamente.",
  "confirm-card": "Marca la confirmación antes de eliminar el sitio asociado.",
};

function GroupOptions({ groups }: { groups: Awaited<ReturnType<typeof listAdminSponsorGroups>> }) {
  return <>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</>;
}

export default async function AdminSponsorsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/patrocinadores");
  if (!adminHasCapability(admin, "settings.manage")) redirect("/admin/acceso-denegado?reason=permission");
  const [groups, settings, query] = await Promise.all([listAdminSponsorGroups(), getSiteSettings(), searchParams]);
  const enabled = settings.sponsors_enabled === "enabled";

  return <AdminShell user={admin}><div className="admin-content admin-sponsors">
    <AdminPageHeading eyebrow="ALIANZAS Y DIFUSIÓN" title="Sitios asociados" description="Administra la página pública, sus grupos, enlaces, imágenes y orden de lectura en computador y celular." backHref="/admin">
      <Link className="button button-outline" href="/patrocinadores" target="_blank" prefetch={false}>Previsualizar página</Link>
    </AdminPageHeading>
    {query.notice && notices[query.notice] && <p className="admin-success">{notices[query.notice]}</p>}
    {query.error && errors[query.error] && <p className="form-alert">{errors[query.error]}</p>}

    <section className="admin-sponsor-visibility">
      <div><p className="eyebrow">VISIBILIDAD PÚBLICA</p><h2>{enabled ? "Página publicada" : "Página oculta"}</h2><span>{enabled ? "Aparece en el footer, el menú móvil y el sitemap." : "Solo las cuentas administradoras pueden previsualizarla; los buscadores reciben noindex y los visitantes, 404."}</span></div>
      <form action="/api/admin/patrocinadores/visibilidad" method="post">
        <input type="hidden" name="sponsors_enabled" value={enabled ? "disabled" : "enabled"} />
        <button className={`button ${enabled ? "button-outline" : "button-primary"}`} type="submit">{enabled ? "Ocultar página" : "Publicar página"}</button>
      </form>
    </section>

    <section className="admin-sponsor-create-layout">
      <form className="admin-settings-form admin-sponsor-create-group" action="/api/admin/patrocinadores/grupos" method="post">
        <div><p className="eyebrow">NUEVO GRUPO</p><h2>Crear una sección</h2><small>El orden vertical define qué grupo aparece primero en la página.</small></div>
        <label>Nombre<input name="name" required maxLength={80} placeholder="Santiago" /></label>
        <label>URL amigable<input name="slug" maxLength={72} placeholder="se genera automáticamente" /></label>
        <label>Descripción<textarea name="description" maxLength={240} rows={3} placeholder="Sitios asociados en Santiago y alrededores." /></label>
        <label>Orden vertical<input name="sort_order" type="number" min={-9999} max={9999} defaultValue={groups.length * 10} /></label>
        <label className="check-label"><input name="is_active" type="checkbox" defaultChecked /> Grupo visible</label>
        <button className="button button-primary">Crear grupo</button>
      </form>

      <form className="admin-settings-form admin-sponsor-create-card" action="/api/admin/patrocinadores" method="post" encType="multipart/form-data">
        <div><p className="eyebrow">NUEVO SITIO</p><h2>Crear una tarjeta</h2><small>La imagen principal es obligatoria. El logo es opcional.</small></div>
        <label>Grupo<select name="group_id" required defaultValue=""><option value="" disabled>Selecciona un grupo</option><GroupOptions groups={groups} /></select></label>
        <label>Nombre<input name="name" required maxLength={100} /></label>
        <label>Título visible (opcional)<input name="headline" maxLength={100} placeholder="Puede quedar vacío" /></label>
        <label>Subtítulo (opcional)<input name="subtitle" maxLength={160} placeholder="Puede quedar vacío" /></label>
        <label>Enlace de destino<input name="destination_url" type="url" required maxLength={500} placeholder="https://..." /></label>
        <label>Texto del botón<input name="cta_label" list="sponsor-cta-options" required maxLength={40} defaultValue="Conocer más" /></label>
        <label>Descripción accesible de la imagen<input name="image_alt" required maxLength={180} placeholder="Fachada o identidad visual de…" /></label>
        <label>Diseño<select name="display_mode" defaultValue="overlay"><option value="overlay">Texto sobre imagen</option><option value="image">Imagen protagonista</option><option value="brand">Logo o banner centrado</option></select></label>
        <label>Orden en el grupo<input name="sort_order" type="number" min={-9999} max={9999} defaultValue={0} /></label>
        <label>Imagen principal<input name="background" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
        <label>Logo opcional<input name="logo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="check-label"><input name="is_active" type="checkbox" defaultChecked /> Tarjeta visible</label>
        <label className="check-label"><input name="is_sponsored" type="checkbox" /> Enlace pagado o patrocinado</label>
        <small>Marca “patrocinado” cuando exista pago o compensación; el enlace recibirá la señal SEO correspondiente.</small>
        <button className="button button-primary" disabled={!groups.length}>Crear tarjeta</button>
      </form>
    </section>

    <section className="admin-sponsor-groups" aria-labelledby="sponsor-groups-title">
      <div className="admin-sponsor-section-heading"><p className="eyebrow">ORDEN Y CONTENIDO</p><h2 id="sponsor-groups-title">Grupos actuales</h2><span>Usa números como 10, 20 y 30 para dejar espacio entre posiciones. Un número menor aparece antes.</span></div>
      {!groups.length && <div className="admin-empty"><h2>Aún no hay grupos</h2><p>Crea el primero para poder añadir sitios asociados.</p></div>}
      {groups.map((group) => <details className="admin-sponsor-group" key={group.id} open>
        <summary><span><strong>{group.name}</strong><small>{group.sponsors.length} tarjeta{group.sponsors.length === 1 ? "" : "s"} · orden {group.sortOrder} · {group.isActive ? "visible" : "oculto"}</small></span><b>Administrar</b></summary>
        <div className="admin-sponsor-group-body">
          <form className="admin-sponsor-group-form" action={`/api/admin/patrocinadores/grupos/${group.id}`} method="post">
            <label>Nombre<input name="name" required maxLength={80} defaultValue={group.name} /></label>
            <label>URL amigable<input name="slug" required maxLength={72} defaultValue={group.slug} /></label>
            <label className="admin-field-wide">Descripción<textarea name="description" maxLength={240} rows={2} defaultValue={group.description} /></label>
            <label>Orden vertical<input name="sort_order" type="number" min={-9999} max={9999} defaultValue={group.sortOrder} /></label>
            <label className="check-label"><input name="is_active" type="checkbox" defaultChecked={group.isActive} /> Grupo visible</label>
            <button className="button button-primary">Guardar grupo</button>
            <label className="check-label admin-danger-confirm"><input name="confirm_delete" type="checkbox" /> Confirmo que el grupo está vacío</label>
            <button className="button button-outline admin-danger-button" name="action" value="delete" formNoValidate>Eliminar grupo</button>
          </form>
          <div className="admin-sponsor-card-list">
            {group.sponsors.map((card) => <form className="admin-sponsor-card-editor" action={`/api/admin/patrocinadores/${card.id}`} method="post" encType="multipart/form-data" key={card.id}>
              <div className="admin-sponsor-card-preview">
                <Image src={`/patrocinadores/media/${card.id}/background`} alt={card.imageAlt} width={760} height={520} unoptimized style={{ objectFit: card.displayMode === "brand" ? "contain" : "cover" }} />
                {card.logoR2Key && <Image className="admin-sponsor-logo-preview" src={`/patrocinadores/media/${card.id}/logo`} alt={`Logo de ${card.name}`} width={240} height={120} unoptimized />}
                <span>{card.isActive ? "Visible" : "Oculta"}</span>
              </div>
              <div className="admin-sponsor-card-fields">
                <label>Grupo<select name="group_id" defaultValue={card.groupId}><GroupOptions groups={groups} /></select></label>
                <label>Nombre<input name="name" required maxLength={100} defaultValue={card.name} /></label>
                <label>Título visible (opcional)<input name="headline" maxLength={100} defaultValue={card.headline} placeholder="Puede quedar vacío" /></label>
                <label>Subtítulo (opcional)<input name="subtitle" maxLength={160} defaultValue={card.subtitle} /></label>
                <label>Enlace<input name="destination_url" type="url" required maxLength={500} defaultValue={card.destinationUrl} /></label>
                <label>Botón<input name="cta_label" list="sponsor-cta-options" required maxLength={40} defaultValue={card.ctaLabel} /></label>
                <label>Texto alternativo<input name="image_alt" required maxLength={180} defaultValue={card.imageAlt} /></label>
                <label>Diseño<select name="display_mode" defaultValue={card.displayMode}><option value="overlay">Texto sobre imagen</option><option value="image">Imagen protagonista</option><option value="brand">Logo o banner centrado</option></select></label>
                <label>Orden horizontal<input name="sort_order" type="number" min={-9999} max={9999} defaultValue={card.sortOrder} /></label>
                <label>Nueva imagen principal<input name="background" type="file" accept="image/jpeg,image/png,image/webp" /></label>
                <label>Nuevo logo<input name="logo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
                <label className="check-label"><input name="remove_logo" type="checkbox" /> Quitar logo actual</label>
                <label className="check-label"><input name="is_active" type="checkbox" defaultChecked={card.isActive} /> Tarjeta visible</label>
                <label className="check-label"><input name="is_sponsored" type="checkbox" defaultChecked={card.isSponsored} /> Enlace pagado o patrocinado</label>
              </div>
              <div className="admin-sponsor-card-actions">
                <button className="button button-primary">Guardar tarjeta</button>
                <a className="button button-outline" href={card.destinationUrl} target="_blank" rel="noreferrer">Probar enlace</a>
                <label className="check-label admin-danger-confirm"><input name="confirm_delete" type="checkbox" /> Confirmo la eliminación permanente</label>
                <button className="button button-outline admin-danger-button" name="action" value="delete" formNoValidate>Eliminar tarjeta</button>
              </div>
            </form>)}
            {!group.sponsors.length && <p className="admin-sponsor-empty">Este grupo todavía no contiene tarjetas.</p>}
          </div>
        </div>
      </details>)}
    </section>
    <datalist id="sponsor-cta-options"><option value="Contactar" /><option value="Conocer más" /></datalist>
  </div></AdminShell>;
}
