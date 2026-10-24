import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { currentRevision } from "@/lib/collaboration";
import { getSiteSettings } from "@/lib/site-settings";
import { THEME_TESTING_PATH } from "@/lib/admin-testing-policy";
import { readVisualTheme, VISUAL_THEMES, visualThemeLabels } from "@/lib/site-theme-policy";
import { ReviewScope } from "../ReviewScope";

export async function VisualThemeSettingsPanel({ saved }: { saved?: string }) {
  const [settings, revision] = await Promise.all([getSiteSettings(), currentRevision("settings:site")]);
  const active = readVisualTheme(settings.visual_theme);

  return <section className="admin-testing-panel admin-home-settings" aria-labelledby="testing-theme-heading">
    <h2 id="testing-theme-heading">Tema visual del sitio</h2>
    <p className="admin-testing-description">Cambia la apariencia del sitio público, Mi cuenta y Administración. Funciona con cualquiera de los dos diseños del home.</p>
    {saved === "1" && <p className="admin-success" role="status">Tema guardado. Las páginas nuevas usan la apariencia elegida; recarga las pestañas que ya estaban abiertas.</p>}
    <ReviewScope resource="settings:site" revision={revision ?? 0}>
      <form action="/api/admin/settings" method="post" className="admin-settings-form admin-home-layout-form">
        <input type="hidden" name="return_to" value={THEME_TESTING_PATH} />
        <input type="hidden" name="review_key" value="settings:site" />
        <input type="hidden" name="review_revision" value={revision ?? 0} />
        <fieldset><legend>Elige una apariencia</legend>
          <p className="admin-home-help">Activa ahora: <strong>{visualThemeLabels[active]}</strong>. Seleccionar una opción no publica el cambio hasta guardar.</p>
          <div className="admin-home-layout-options">{VISUAL_THEMES.map(theme => <article className="admin-home-layout-option" key={theme}>
            <label htmlFor={`visual-theme-${theme}`}><input id={`visual-theme-${theme}`} type="radio" name="visual_theme" value={theme} defaultChecked={active === theme} required /><span><strong>{visualThemeLabels[theme]}</strong><small>{theme === "classic" ? "Conserva los colores y superficies actuales del sitio." : "Cristal oscuro, botones con reflejo suave, selectores definidos y paneles con profundidad. Sin animaciones pesadas."}</small></span>{active === theme && <span className="admin-home-active">En uso</span>}</label>
            <div className={`theme-swatch is-${theme}`} aria-hidden="true"><span>Elegir ciudad <b>⌄</b></span><div><i>Ver anuncios</i><i>Publicar</i></div></div>
            <ActionAnchor className="button button-outline" href={`/admin/vista-previa-tema/${theme}`} target="_blank" rel="noopener noreferrer">Previsualizar {theme === "classic" ? "actual" : "Liquid Glass"}</ActionAnchor>
          </article>)}</div>
        </fieldset>
        <p className="admin-home-help">El cambio es global y reversible. Solo se carga el CSS exclusivo del tema activo; ambos comparten la estructura base. La caché se separa por apariencia. No cambia enlaces, textos, permisos, SEO ni el diseño del home seleccionado.</p>
        <div className="admin-home-save"><ActionButton type="submit" className="button button-primary">Guardar tema visual</ActionButton><span>La vista previa es privada y no cambia la apariencia pública.</span></div>
      </form>
    </ReviewScope>
  </section>;
}
