import { getSiteSettings } from "@/lib/site-settings";
import { currentRevision } from "@/lib/collaboration";
import { HOME_LAYOUTS, homeLayoutLabels, readHomeLayout } from "@/lib/home-layout-policy";
import { HOME_TESTING_PATH } from "@/lib/admin-testing-policy";
import { ReviewScope } from "../ReviewScope";
import { ActionAnchor, ActionButton } from "@/app/ActionButton";
export async function HomeLayoutSettingsPanel({ saved }: { saved?: string }) {
  const [values, revision] = await Promise.all([getSiteSettings(), currentRevision("settings:site")]);
  const active = readHomeLayout(values.home_layout);

  return <section className="admin-testing-panel admin-home-settings" aria-labelledby="testers-home-heading">
    <h2 id="testers-home-heading">Diseños del home</h2>
    <p className="admin-testing-description">Previsualiza las dos plantillas sin publicar. El diseño público solo cambia cuando guardas.</p>
    {saved === "1" && <p className="admin-success" role="status">Diseño guardado. Recarga el sitio público para ver la opción activa.</p>}
    <ReviewScope resource="settings:site" revision={revision ?? 0}>
      <form action="/api/admin/settings" method="post" className="admin-settings-form admin-home-layout-form">
        <input type="hidden" name="return_to" value={HOME_TESTING_PATH} />
        <input type="hidden" name="review_key" value="settings:site" />
        <input type="hidden" name="review_revision" value={revision ?? 0} />
        <fieldset><legend>Elige un único diseño público</legend><p className="admin-home-help">Activo ahora: <strong>{homeLayoutLabels[active]}</strong>. Seleccionar una tarjeta no cambia el sitio hasta pulsar Guardar diseño.</p>
          <div className="admin-home-layout-options">{HOME_LAYOUTS.map(layout => <article key={layout} className="admin-home-layout-option">
            <label htmlFor={`home-layout-${layout}`}><input id={`home-layout-${layout}`} type="radio" name="home_layout" value={layout} defaultChecked={active === layout} required /><span><strong>{homeLayoutLabels[layout]}</strong><small>{layout === "classic" ? "Conserva la presentación, el selector y la distribución actuales." : "Muestra las ciudades en el orden regional habitual, sin títulos de regiones, y conserva las demás secciones debajo."}</small></span>{active === layout && <span className="admin-home-active">En uso</span>}</label>
            <div className={`admin-home-wireframe is-${layout}`} aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
            <ActionAnchor href={`/admin/vista-previa-inicio/${layout}`} className="button button-outline" target="_blank" rel="noopener noreferrer">Previsualizar {layout === "classic" ? "actual" : "alternativo"}</ActionAnchor>
          </article>)}</div>
        </fieldset>
        <p className="admin-home-help">Solo una plantilla se publica en /. La vista previa de la otra requiere permisos administrativos y lleva protección contra indexación; no crea una segunda página pública. El cambio es manual, no un reparto A/B de visitantes, y puedes volver atrás cuando quieras.</p>
        <div className="admin-home-save"><ActionButton className="button button-primary" type="submit">Guardar diseño</ActionButton><span>Puedes volver al diseño anterior desde esta misma pantalla.</span></div>
      </form>
    </ReviewScope>
  </section>;
}
