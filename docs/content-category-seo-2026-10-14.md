# Venta de contenido y revisión SEO — 14 de octubre de 2026

## Modalidades públicas

La etiqueta `venta-contenido` es voluntaria y no depende de enlaces sociales, archivos privados, autorización de compradores o ventas dentro del portal. No activa un sistema de pago.

| Modalidad | Categoría de visibilidad | Masajes, si está marcado | Venta de contenido | Etiqueta Escort |
| --- | --- | --- | --- | --- |
| Escort sin venta de contenido | VIP/Premium/Bronze elegida | Sí | No | Sí |
| Escort que vende contenido | VIP/Premium/Bronze elegida | Sí | Sí | Sí |
| Solo venta de contenido | No | No | Sí | No |

Se guarda `content_only: "1"` en la metadata existente. El servidor fuerza la etiqueta de venta y elimina Masajes, servicios presenciales, viajes y tarifas por tiempo al guardar solo contenido. Administración y titulares usan el mismo formulario y la misma validación; las modificaciones relevantes de un titular continúan pendientes de aprobación. No se modifica el estado de anuncios existentes ni se crea una biblioteca privada.

Las siete secciones son VIP, Premium, Bronze, Masajes, Venta de contenido, Agencias y Arriendos. Se conservan las denominaciones del sitio; no se cambia Bronze a Gold. `/escorts` ahora usa la misma distribución que las ciudades. Venta de contenido también puede combinarse con las etiquetas adicionales de los filtros.

Las insignias de las cards se distribuyen en filas flexibles separadas arriba y abajo. Venta contenido usa celeste propio, sin copiar logotipos de otras plataformas. Los perfiles de solo contenido tienen título SEO y rótulo de Venta de contenido, sin atribuirles servicios escort.

## Rotación y paginación

Se genera una semilla nueva al entrar a una ruta sin `orden` y al aplicar filtros. D1 ordena los IDs antes del límite de 24 resultados; no se descargan todas las galerías para barajarlas. La semilla viaja en Siguiente/Anterior para evitar duplicados entre páginas de un conjunto sin cambios. Una URL que conserva explícitamente la semilla mantiene su orden. Si se publican o retiran anuncios entre páginas, OFFSET puede variar como en cualquier lista paginada viva.

Los documentos de directorios no usan la caché compartida de diez minutos: esa caché impediría una rotación nueva en las visitas sin semilla. Inicio, perfiles e información mantienen su política anterior. La ordenación requiere ordenar IDs elegibles en D1; al crecer el inventario, medir filas leídas y evaluar partición por categoría o claves de rotación indexadas. No hay migraciones ni nuevos servicios de pago.

## Evidencia SEO consultada en Chrome

No se contrató ni compró acceso de API. Una consulta inicial a la conexión de Semrush indicó unidades insuficientes; se dejó de usar cuando el titular pidió exclusivamente Chrome. Se consultó la sesión del perfil Chrome Chile3X. La entrada y navegación de determinadas pestañas falló intermitentemente; no se atribuyen métricas no obtenidas ni un análisis exhaustivo de todas las URLs competidoras.

- Semrush, base Chile, escritorio, 14/10/2026: `putas chile`, volumen estimado de **8.100 búsquedas mensuales**, KD **69/100**. Variantes visibles: `putas en chile`, 3.600, KD 69; `putas en santiago de chile`, 880, KD 61; `putas santiago chile`, 720, KD 59. Son estimaciones de Semrush, no visitas al portal ni garantías de posicionamiento.
- Panel SEO de Semrush, base CL, fecha 13/10/2026: aproximadamente 1.000 de tráfico orgánico estimado, 87 keywords y Authority Score 10. Auditoría existente del 7/10: salud 85 %, 253 errores y 86 advertencias. No se realizó una auditoría nueva ni se consideraron resueltos esos avisos.
- Search Console, selector 3 meses, datos disponibles **30/07–11/10/2026**, Web, sin filtro de país: aproximadamente 1.540 clics, 15.800 impresiones, CTR 9,8 %, posición media 19,3. Consulta `escort concepcion`: 107 clics y 648 impresiones; `escort concepción`: 63/456; `escort chile`: 37/228. En las 500 filas revisadas aparecen `putas en concepción` 5/33, `putas pucon` 5/19, `putas vallenar` 3/52, `damas de compañia vallenar` 3/34 y `damas de compañia caldera` 1/10. No se suman estas filas como si fueran las 837 consultas completas.
- GA4, Inicio, últimos 7 días, **7–13/10/2026**: 193 usuarios activos, 574 vistas, 138 sesiones Organic Search, de ellas 135 google/organic. 184 usuarios activos de Chile. Hay 0 eventos clave en el resumen; no se deduce que no existan clics en WhatsApp, solo que no están contabilizados allí como eventos clave. Las vistas incluyen Mi cuenta y Administración y la fuente github.com; no son una muestra exclusiva de público ni ventas. No se cambiaron etiquetas, objetivos, permisos o exclusiones.
- SERP de Google vista en Chrome para `escorts Chile`: aparece Skokka con “Escort en Chile y putas”, además de El Silencio, Gemidos, Chimbis y SexoSur. Se verificó directamente la página de Skokka; no se demostró que todas las páginas usen las tres expresiones ni que su uso sea la causa de sus posiciones.

Fuentes y enlaces de comprobación:

- [Semrush: putas Chile](https://es.semrush.com/analytics/keywordoverview/?q=putas%20chile&db=cl).
- [Search Console del portal](https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Achile3x.cl).
- [GA4 del portal](https://analytics.google.com/analytics/web/#/a403951247p549062700/reports/intelligenthome).
- [Skokka, directorio Chile](https://cl.skokka.com/escorts/).
- [Google: políticas contra relleno de palabras clave y páginas puerta](https://developers.google.com/search/docs/essentials/spam-policies).
- [Google: directrices para contenido explícito](https://developers.google.com/search/docs/specialty/explicit/guidelines).

## Decisión implementada

Mantener escorts + ciudad como intención principal y damas de compañía como expresión complementaria. Incorporar una mención contextual y visible de la búsqueda “putas en…” en la guía del directorio nacional y en la guía local existente. No crear rutas duplicadas `/putas`, bloques ocultos, palabras repetidas en alt ni promesas de puestos. No etiquetar a anunciantes individuales con esa palabra ni añadirla a todos los títulos de perfil.

En solo contenido, metadata, rótulo y resumen se refieren a venta de contenido. La intención, identidad, enlaces canónicos y privacidad se mantienen en ausencia o presencia de los campos opcionales. Los filtros continúan noindex/follow; la semilla `orden` no transforma la URL canónica en otra página indexable.

## Seguimiento recomendado

Comparar un período posterior de 28 días con el anterior, separando consultas escort/scort, damas y putas por ciudad y página, dispositivo y país Chile. Revisar clics, impresiones, posición y contactos medibles; no concluir resultados SEO el día de publicación. Priorizar inventario real aprobado y páginas útiles. Revisar los errores existentes de Semrush en otra tarea antes de asumir que añadir una palabra basta para competir.

## QA realizado

Pruebas del servidor local: edición administrativa conserva aprobación; cambio de modalidad del titular requiere revisión; contenido-only normaliza etiquetas y servicios; búsqueda de contenido incluye ambos modos; VIP y Masajes excluyen solo contenido. Tres páginas de IDs sin duplicados con semilla estable; semilla diferente cambia el orden. Prueba SQLite compara la aritmética de ordenación con JS. Casos de identidad SEO y flags ajenos al tipo escort.

La vista de producción local se comprueba a 1440×900 y 390×844, incluidos el editor interactivo y cards con múltiples insignias. Todos los registros de prueba son locales y eliminables. No se modifican Lalita, medios de anuncios existentes, pendientes reales, verificación o cuentas de producción para estas pruebas.
