import { ActionAnchor } from '@/app/ActionButton';
import { parseHomeTexts } from '@/lib/home-content-policy';
import { readHomeLayout } from '@/lib/home-layout-policy';
import './seo-settings-help.css';

type GuideSettings = {
  site_title: string; home_layout: string; home_content_classic: string;
  home_content_compact: string; robots_indexing: string;
};

/** Read-only explanation. Uses the values already loaded by the private page. */
export function SeoSettingsGuide({ settings, context }: { settings: GuideSettings; context: 'global' | 'home' }) {
  const layout = readHomeLayout(settings.home_layout);
  const copy = parseHomeTexts(settings[`home_content_${layout}`], layout);
  return <section className="seo-settings-guide" aria-labelledby={`seo-guide-${context}`}>
    <p className="seo-help-kicker">QUÉ CAMPO MANDA · SIN CAMBIAR NADA AL ABRIR</p>
    <h2 id={`seo-guide-${context}`}>{context === 'global' ? 'Este no es el editor del título del Home' : 'El título del Home se cambia en Inicio'}</h2>
    <p><strong>Para la página principal / manda «Inicio · dos diseños → Título SEO de esta portada».</strong> El «Título de respaldo del sitio» no lo reemplaza. No son dos títulos del Home ni se publican juntos.</p>
    <dl className="seo-help-current-values">
      <div><dt>Título de respaldo del sitio · guardado</dt><dd>{settings.site_title}</dd><dd className="seo-help-caption">Solo para páginas que no definen un título propio. Cambiarlo no cambia el título del Home.</dd></div>
      <div><dt>Título que usa el Home ahora · {layout === 'classic' ? 'diseño clásico activo' : 'diseño compacto activo'}</dt><dd>{copy.seoTitle}</dd><dd className="seo-help-caption">Este es el título configurado para la portada /. Se cambia en Inicio, no en el respaldo global.</dd></div>
    </dl>
    <p className="seo-help-caption">Estos son valores guardados al cargar la página, no los cambios que estés escribiendo sin guardar. Aunque ambos textos coincidan, siguen siendo ajustes distintos. La indexación o el mantenimiento pueden limitar lo que se muestra públicamente.</p>
    <details><summary>Ver ejemplos y qué cambia cada editor</summary>
      <ol>
        <li><strong>Inicio · dos diseños:</strong> el título SEO y la descripción de cada portada tienen prioridad sobre el respaldo global. Sus títulos y descripciones sociales también son propios.</li>
        <li><strong>SEO por página:</strong> modifica solo los metadatos de la página informativa seleccionada. «Usar valor de respaldo» recupera el valor original de esa página o de su documento legal publicado; no copia necesariamente el título global.</li>
        <li><strong>SEO global e identidad:</strong> define valores de respaldo para páginas sin metadatos propios. No sustituye los títulos propios del Home, las noticias ni las demás páginas que los definen.</li>
      </ol>
      <p><strong>Ejemplo ficticio:</strong> si el respaldo dice «Título general A» y el Home activo dice «Título de portada B», en / se usa «Título de portada B». Cambiar el respaldo a «Título general C» no modifica esa portada.</p>
      <p><strong>Dos Home, una portada pública:</strong> solo se publica el SEO del diseño activo en Testing. El otro queda guardado para cuando lo actives. Cambiar entre clásico y Liquid Glass cambia el tema visual, no qué Home está activo.</p>
      <p><strong>SEO no es el texto visible:</strong> «Título SEO» se usa en la pestaña y como propuesta para buscadores; «H1 · título principal» es el encabezado que se lee dentro de la página. Google puede mostrar otro texto.</p>
    </details>
    <p className="seo-help-indexing"><strong>La indexación es diferente de los textos de respaldo.</strong> El interruptor global sí afecta al Home. Ahora está {settings.robots_indexing === 'enabled' ? 'activado: permite solicitar indexación' : 'desactivado: el Home recibe noindex, nofollow'}. Permitirla no garantiza aparecer en Google; desactivarla no vuelve privada una página.</p>
    <div className="content-editor-actions"><ActionAnchor className="button button-outline" href="/admin/contenido/inicio">Editar el SEO del Home</ActionAnchor><ActionAnchor className="button button-outline" href="/admin/contenido/seo/paginas">Editar SEO por página y ver su puntaje</ActionAnchor>{context === 'home' ? <ActionAnchor className="button button-outline" href="/admin/contenido/seo">Ver respaldos globales</ActionAnchor> : null}</div>
  </section>;
}

export function SeoFeatureHelp() {
  return <details className="seo-feature-help">
    <summary>Rank Math: funciones incluidas, pendientes y qué significa el puntaje</summary>
    <h2>No es Rank Math instalado ni una copia completa de sus funciones</h2>
    <dl className="seo-help-feature-list">
      <div><dt>Incluido en el editor por página</dt><dd>Título, descripción, contadores, vista orientativa de buscador, tarjeta social, imagen estática pública y texto alternativo. Open Graph y X comparten los mismos valores; no hay dos tarjetas independientes.</dd></div>
      <div><dt>Directivas incluidas</dt><dd>Noindex, nofollow, noimageindex, nosnippet y límites de fragmento, vídeo e imagen. Se mantiene la protección global y los cambios sensibles exigen confirmación.</dd></div>
      <div><dt>Gestionado por el sitio, no editable aquí</dt><dd>Rutas, canónicas, sitemap y datos estructurados. No se añadieron controles duplicados para modificarlos libremente: podrían romper enlaces o contradecir la configuración existente.</dd></div>
      <div><dt>No implementado en esta herramienta</dt><dd>Palabras clave objetivo, densidad, análisis de encabezados, enlaces y ALT del contenido, legibilidad, contenido pilar, sugerencias de enlaces y análisis de resultados de búsqueda. Son funciones diferentes de editar metadatos y no forman parte del puntaje actual.</dd></div>
      <div><dt>Sin integración de WordPress ni Content AI</dt><dd>Este sitio no usa WordPress. No se instaló el plugin ni se conectaron sus servicios de IA o generación automática. El trabajo manual sigue bajo tu control.</dd></div>
      <div><dt>Opción obsoleta excluida: noarchive</dt><dd>Google ya no utiliza esta directiva para mostrar una copia en caché. No se añadió como si siguiera teniendo ese efecto.</dd></div>
      <div><dt>Imagen social: alcance actual</dt><dd>Puedes indicar una imagen raster pública que ya exista en el sitio. Aquí no hay biblioteca ni subida de imágenes, comprobación de dimensiones o superposición de iconos.</dd></div>
    </dl>
    <h3>El puntaje actual es de completitud técnica</h3>
    <p>Solo aparece en los editores de páginas informativas: hay un resumen antes de los campos y un desglose de las ocho comprobaciones junto al formulario en PC, o debajo en móvil. No hay un puntaje de Rank Math para el SEO global ni para los dos Home en estos formularios.</p>
    <p>Ocho comprobaciones con el mismo peso: título, descripción, canónica estable, dominio HTTPS, título social, descripción social, ruta de imagen permitida y texto alternativo. Se calcula aprobadas ÷ 8 × 100 y se redondea: 4 de 8 = 50/100; 8 de 8 = 100/100.</p>
    <p><strong>100/100 no significa «SEO perfecto».</strong> No evalúa palabras clave, calidad del texto o de la imagen, tráfico, rapidez, autoridad ni posiciones. Tampoco comprueba que Google haya indexado la página. Un noindex intencional no resta puntos; los errores de carga de imagen se muestran por separado.</p>
    <p className="seo-help-sources">Documentación: <a href="https://rankmath.com/kb/seo-score-vs-content-ai-score/" target="_blank" rel="noopener noreferrer">qué mide Rank Math</a> y <a href="https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag" target="_blank" rel="noopener noreferrer">directivas de Google</a>. Estas referencias no cambian la configuración del sitio.</p>
  </details>;
}
