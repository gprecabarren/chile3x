# Ayuda de configuración y resaltado de navegación — 2026-10-24

## Alcance

- La navegación por anclas del header tiene selección temporal compartida entre sus copias móvil/escritorio. Se activa con cada clic y se desactiva ante desplazamiento manual (rueda, gesto táctil, teclado o barra de desplazamiento).
- El salto automático al ancla no la desactiva. Un hashchange tardío no vuelve a activar una selección que el usuario ya descartó. Se conservan href, fragmento e historial; no se modifican rutas ni estilos o tamaños del header. Las páginas completas conservan aria-current="page"; las anclas usan "location".
- Las ayudas privadas de SEO muestran los títulos guardados de respaldo y del Home activo, prioridad, diferencia entre H1 y metadatos, dos diseños y la indexación global. No añaden escrituras ni consultas de configuración; consumen los valores que las páginas ya habían cargado.
- El Home abre el diseño activo y separa textos visibles de SEO con ayudas por campo. Los nombres de campos, valores iniciales y payload de guardado siguen intactos.
- La puntuación técnica existente se muestra antes del editor informativo y conserva su fórmula de ocho comprobaciones. No es el análisis de Rank Math ni una promesa de posicionamiento. Las funciones no implementadas, gestionadas centralmente y obsoletas quedan diferenciadas en un desplegable.
- Sin cambios a valores públicos, política de robots, generación de metadatos, canónicas, sitemap, datos estructurados, autenticación, plan o recursos de Cloudflare. Sin nuevas dependencias.

## Verificación previa a publicación

- Build y TypeScript correctos; 451 tests aprobados, incluidos selección inicial, clic repetido, regreso desde otra página, llegada tardía del ancla, listeners compartidos y limpieza.
- ESLint: 0 errores; permanece una advertencia previa en ProfileSafetyActions.tsx:57, ajena al cambio.
- 24 recorridos en navegador: 2 temas × 2 diseños de Home × 6 anchos (320, 390, 1366, 1920, 2560, 3440). En todos: /escorts marcado, clic en regiones marcado, desplazamiento sin marca, segundo clic vuelve a marcar; sin desbordamiento horizontal.
- Historial Atrás/Adelante y desplazamiento con teclado comprobados adicionalmente. El clic repetido conserva el comportamiento de historial ya existente.
- 36 vistas de editores (global, Home, SEO de Quiénes somos × 6 anchos × 2 temas), sin desbordamientos. Ayudas desplegadas y teclado, valores actuales, diseño activo, controles sin cambios deshabilitados y salto al desglose comprobados.
- Integración local existente de los seis editores informativos: permisos, conservación sin cambios, validación, confirmación de robots, conflictos y guardado/restauración correctos.
- Fixtures y cambios de tema limitados al entorno local; restaurados y eliminados mediante los helpers de QA. Ninguna cuenta de producción creada ni configuración pública editada para probar.
- Revisión React: ayudas presentacionales sin nuevo fetch; suscripción de anclas única, pasiva y con cleanup; sin suscripción de los enlaces de página a gestos; handlers existentes y clics modificados preservados.
- Higiene de archivos de release comprobada. No constituye una auditoría de seguridad completa. Los archivos ajenos en buddy_subtitle_work/ se excluyen.

## Referencias de alcance

- https://rankmath.com/kb/seo-score-vs-content-ai-score/
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag

Las capturas y métricas locales están en outputs/ (excluido del repositorio); no se publican cookies ni bases de datos de pruebas.
