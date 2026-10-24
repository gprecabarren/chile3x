# Metadatos informativos y lectura de escritorio

## Acceso y alcance

Contenido del sitio → SEO e identidad → Abrir editor por página (`/admin/contenido/seo/paginas`). Requiere una sesión administradora y permiso `settings.manage`.

Se pueden editar los metadatos de Contacto, FAQ, Términos, Privacidad y Reglas de publicación. El inicio (ambos diseños) y Quiénes somos tienen consultas de su configuración vigente, sin edición nueva en esta herramienta. No se añadieron controles a anuncios, ciudades ni directorios.

## Valores efectivos, no campos falsamente vacíos

El servidor y el editor utilizan la misma definición de metadatos. Los documentos legales toman sus valores del documento publicado, nunca del borrador. La imagen de respaldo conserva el logo vigente. Cada campo distingue su valor personalizado del respaldo. Volver al respaldo elimina solo esa personalización; no copia ni congela valores predeterminados.

No hay escritura al abrir el editor. Los guardados sin diferencias tampoco escriben en D1. Una instalación sin personalizaciones conserva los metadatos anteriores. No se cambia automáticamente el título, la descripción, el contenido visible ni los datos estructurados.

## Flujo y protección

Editar → revisar diferencias antes/después → aplicar cambios de esa página. Un cambio de robots exige una confirmación adicional. La versión de ajustes y una huella de los valores efectivos impiden sobrescribir cambios de otro administrador o de un documento legal publicado entretanto. Un conflicto conserva lo escrito y bloquea nuevos intentos hasta consultar la versión actual.

La API aplica autenticación, autorización, mismo origen, una lista cerrada de páginas/campos, JSON limitado a 16 KiB y escritura atómica con la protección de revisión existente. Registra el cambio en el historial administrativo. Las vistas y respuestas privadas llevan noindex y no-store. No se incorporaron HTML libre, scripts, peticiones a URLs arbitrarias ni nuevos permisos.

## Funciones y límites

- Título y descripción del resultado, vista orientativa móvil/escritorio y contadores de caracteres.
- Título, descripción, imagen y texto alternativo sociales, compartidos por Open Graph y X.
- Solo imágenes raster estáticas y públicas del mismo sitio. No hay subida de imágenes, imágenes privadas, SVG ni URLs externas. Se muestra un error de carga y se impide guardar mientras la imagen no sea válida/cargable. No se verifican dimensiones.
- Canónica y rutas gestionadas por el sitio, no editables desde aquí.
- Noindex, nofollow, noimageindex, nosnippet y límites de fragmento, vídeo e imagen. No se permite levantar un bloqueo global. Una página informativa marcada noindex se excluye del sitemap. La actualización invalida la caché mediante la revisión ya existente.
- Puntaje de integridad técnica de ocho comprobaciones. No es Rank Math, no mide posiciones/autoridad/tráfico, no analiza palabras clave ni contenido y no penaliza restricciones intencionales.
- No se añadieron noarchive, funciones WordPress, Content AI, generación automática ni promesas de indexación. Las directivas privadas preexistentes no se alteraron.

## Lectura de PC

Cambios limitados a `min-width:1100px` en `app/public-desktop.css`: cuerpos de lectura de 20px, preguntas FAQ de 22px y metadatos/etiquetas secundarios más legibles. Las columnas se agrupan centradas dentro del marco público compartido; no se lleva el lateral al extremo de una pantalla ultraancha. Los textos de Quiénes somos también se hacen más legibles y sus columnas se equilibran. Reglas, sin índice lateral, utiliza una columna de lectura. No se cambian header, tarjetas de perfiles, móviles ni contenido SEO.

## Verificación

Build, tipos y pruebas; validaciones unitarias de alcance, imágenes, campos, robots, lectura limitada y conservación de defaults. Pruebas locales integradas de los cinco guardados, no-op, permisos, origen, datos inválidos, conflictos, confirmación de robots, HTML público, sitemap y restauración de ajustes. Prueba de interfaz editar → revisar → guardar → volver al respaldo. Matrices responsive en ambos temas con fixtures desechables locales. Las comprobaciones públicas de producción son solo de lectura; no se crean datos de prueba allí.

Resultados: 438 pruebas aprobadas; 112 vistas de lectura (siete páginas, ocho tamaños, dos temas) sin desbordamiento horizontal y 16 vistas del editor entre 320 y 1920px sin recortes de campos o acciones. En 390px los cuerpos de las siete páginas conservan 16px; en escritorio los cuerpos de lectura son de 20px. Evidencias locales en `outputs/qa-info-reading-responsive-20261024.json`, `outputs/qa-info-seo-responsive-20261024.json` y capturas con prefijo `qa-info-`.

## Referencias

- Rank Math: https://rankmath.com/kb/score-100-in-tests/ — su puntuación tampoco garantiza posiciones.
- Google: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag — directivas vigentes; noarchive ya no controla la caché de Google.
- Cloudflare: https://developers.cloudflare.com/d1/worker-api/d1-database/ — escritura por lotes con la protección transaccional existente.
