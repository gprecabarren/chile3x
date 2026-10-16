# Recomendaciones locales y editor legal — 16 de octubre de 2026

## Bloque al final de cada anuncio

- Máximo cinco anuncios públicos de la misma ciudad; excluye el anuncio abierto, pruebas, papelera, cuentas inactivas y anuncios ocultos por el visitante.
- Ranking de visitas registradas en las últimas 24 horas, no de personas únicas ni pagos. Reutiliza la medición existente, deduplicada por navegador, anuncio y día chileno. No añade rastreo ni expone recuentos, cuentas o claves de visitantes.
- Si no hay visitas recientes, presenta «Más anuncios en…», sin inventar popularidad. Si no hay candidatos, informa el estado vacío y ofrece volver al directorio local.
- Incluye escort, solo contenido, agencias y arriendos con su etiqueta correspondiente. El enlace de regreso respeta el tipo del anuncio abierto.
- Consulta SQL única, límite de cinco resultados, índices de ciudad/estado, visita/fecha y portada pública aprobada; no hidrata galerías, historias ni contactos.
- Renderizado de servidor dentro de Suspense después del contenido principal. Enlaces HTML con `href`, nombre y ciudad visibles; H2/H3 sin añadir otro H1 ni puntuaciones estructuradas ficticias.
- Imágenes de carga diferida, prioridad baja, decodificación asíncrona y espacio reservado. Usa el archivo público existente; no introduce una transformación de imágenes pagada ni afirma reducir sus bytes. El navegador puede anticipar imágenes cercanas al viewport.
- Se conserva la caché anónima existente de hasta diez minutos para las fichas. El ranking no promete actualización instantánea.

## Editor: /admin/documentos-legales

También se encuentra en Configuración y en el menú «Términos y privacidad». Requiere `settings.manage` tanto en página como en API; las cuentas normales no tienen acceso.

Permite editar título/SEO, descripción, resumen, aviso final, secciones, subtítulos, párrafos, listas, avisos y fuentes; cambiar su orden; insertar negrita/enlaces; contraer secciones; y previsualizar el documento. Conserva identificadores de sección, numeración y enlaces del índice. Campos escritos en peso normal y controles adaptados a móvil.

«Guardar borrador» no modifica el documento público. «Publicar nueva versión» requiere confirmación, conserva el documento anterior y actualiza versión, fecha chilena y metadatos públicos. «Recuperar texto publicado» descarta únicamente el borrador. Las operaciones quedan en la auditoría con la identidad administrativa real y rechazan revisiones antiguas con 409, sin sobrescribir texto.

Si falla temporalmente la consulta de coordinación, su aviso se limpia cuando una consulta posterior termina bien. Esa recuperación no borra errores de guardado ni avisos de conflicto entre revisiones.

El despliegue conserva exactamente los textos, fuentes, versión 2026.10.14.3 y fecha previamente publicados. No agrega una identidad legal. Las publicaciones de prueba se hicieron exclusivamente en D1 local y se restauran después.

Los documentos públicos no comparten caché de HTML, para que la siguiente petición vea la publicación nueva. El sitemap usa la fecha real de la versión publicada. Los borradores, editor y API son privados/noindex. El formato admite texto escapado y enlaces limitados; no ejecuta HTML arbitrario. Tamaño del cuerpo y del documento limitados antes de guardar.

Los registros nuevos guardan la pareja de versiones aceptada junto con la cuenta en una transacción. Un formulario anterior a una publicación exige revisar y marcar otra vez el consentimiento. No se inventan aceptaciones históricas ni se atribuyen a cuentas creadas por administración. Publicar no envía avisos masivos ni obliga a cuentas existentes a aceptar cambios; los cambios materiales necesitan su revisión y comunicación correspondiente.

## Comprobaciones

- 335 pruebas automatizadas; TypeScript, ESLint y compilación de producción.
- Comparación mecánica de todos los bloques originales con el commit 9796fdd; validación de límites y enlaces.
- SQLite real: visibilidad, ventanas de 24 horas, bloqueos, portadas aprobadas, máximo cinco, todos los tipos, borrador/público, publicación/historial, permisos y conflicto simultáneo con reversión de la transacción.
- HTTP contra Worker local: 200 al guardar/publicar; 409 para otro administrador con revisión antigua; 401 para cuenta normal; descripción SEO publicada, un H1 y cinco enlaces SSR con imágenes lazy.
- Revisión visual en PC y anchos móviles 390 y 320: sin desbordes; campos escritos con peso 400. Evidencias locales en outputs/qa-2026-10-16.
- Medición previa del perfil de Lalita con Chrome, sin limitación artificial: LCP 1339 ms, TTFB 539 ms, CLS 0.00; no son datos de campo ni garantía para todos los dispositivos. La imagen original sigue siendo la principal oportunidad de ahorro global.

Referencias: [enlaces rastreables de Google](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), [contenido lazy de Google](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading), [lotes transaccionales D1](https://developers.cloudflare.com/d1/worker-api/d1-database/).

Migraciones aditivas 0057 y 0058. No cambian estados, titulares ni archivos de anuncios. Para revertir código puede mantenerse la ampliación de esquema sin borrar documentos o historial.
