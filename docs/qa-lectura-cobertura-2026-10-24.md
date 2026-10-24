# Páginas informativas amplias y acceso ligero a regiones

## Cambios

- FAQ, contacto, documentos legales, noticias y artículos usan el mismo marco exterior que el sitio público en PC, en vez de contenedores de 980–1000px. A 1920px se midieron aproximadamente 1809px de marco útil, con los mismos márgenes que la navegación.
- La longitud de párrafos sigue acotada a 82ch. Se aprovecha el ancho adicional para ayuda y enlaces relacionados o para un índice legal lateral, sin convertir los textos en líneas de toda la pantalla.
- FAQ: preguntas de 20px y respuestas de 18px en PC; 17px y 16px en móvil. Texto informativo y legal: 18px en PC y 16px en móvil. Índices legales: enlaces de 16px, sin heredar la disposición flex del menú global.
- Noticias tienen un único landmark `main` (el compartido), cuerpo de artículo y continuación en columnas en PC; vuelven al flujo vertical en móvil. No se modifica la sanitización ni el contenido editorial.
- Se retiró del HTML el recuadro territorial del Home clásico, sus cifras y su panorama decorativo. No se carga esa ilustración. La acción «Explorar regiones de Chile» está junto a las acciones principales; ocupa 44px de alto en móviles de 320 y 390px, sin cortar el texto. El salto respeta el header fijo de PC.
- El Home alternativo conserva su selector de ciudades, sin introducir un enlace engañoso a regiones que ese diseño no muestra. Se conservan ambos temas y ambos modos de Home; no se cambia cuál está activo en producción.
- El editor de textos elimina el campo del título del recuadro retirado y conserva el botón editable. Las configuraciones antiguas con el texto predeterminado «Explorar cobertura» adoptan el nombre nuevo al leerlas, sin escritura ni migración en producción; textos personalizados se respetan.
- Se mantienen los enlaces de ciudades, datos estructurados, H1, canonicals, metadatos, fuentes locales y protecciones existentes. No se añaden dependencias, peticiones de tema, animaciones o filtros de fondo. El asset versionado de Liquid Glass no se modifica: todo el ajuste compartido se compila al CSS público con un hash nuevo.

## Verificación

La guía utilizada localmente procede del HTML editorial ya guardado en el repositorio. Se usa una noticia desechable asociada a un administrador de QA local; no se crean noticias, cuentas ni perfiles ficticios en producción.

- 126 comprobaciones de lectura: siete rutas, dos temas y nueve anchos CSS (320, 390, 768, 1024, 1100, 1366, 1920, 2560 y 3440px). Sin desbordes de página; un H1 y un `main` en todas.
- 24 comprobaciones de Home: ambos diseños y temas, seis anchos (320, 390, 768, 1366, 1920 y 3440px). Sin acciones desbordadas ni solapadas.
- FAQ abierto, navegación por teclado, foco visible del acceso a regiones, salto de ancla en PC y móvil, y enlaces del índice legal. El destino queda por debajo del header en PC.
- 429 tests aprobados. Compilación y TypeScript aprobados. ESLint sin errores; conserva una advertencia previa en `ProfileSafetyActions.tsx:57`.
- No se observaron errores de la aplicación en consola filtrada por el origen local. El navegador sí emitió errores de una extensión ajena al sitio; no se modifica esa extensión.
- Son pruebas en Chrome con viewports simulados, no una certificación en un iPhone físico ni una garantía sobre todos los navegadores.

## SEO, contenido y seguridad tras publicar

`scripts/qa-reading-production.mjs capture` guarda la referencia previa de siete páginas públicas: título, descripción, canonical, robots, H1, JSON-LD y hash del texto informativo. `check` verifica su igualdad después de publicar, así como CSP, HSTS, `nosniff` y bloqueo de marcos. El contenido del Home se excluye del hash porque se elimina expresamente el recuadro; sus metadatos y schema sí se comparan.

El smoke general también verifica que administración y muestras privadas conservan `noindex`/`no-store`, y que no se sirven sourcemaps ni rutas locales. Estas verificaciones no equivalen a una auditoría de seguridad exhaustiva.

## Evidencia local

- Métricas: `outputs/qa-reading-responsive-20261024.json`.
- FAQ PC clásico: `outputs/qa-reading-faq-classic-20261024.png`.
- FAQ PC Glass: `outputs/qa-reading-faq-glass-20261024.png`.
- Home móvil: `outputs/qa-reading-home-mobile-20261024.png`.
- Artículo Glass: `outputs/qa-reading-news-glass-20261024.png`.

## Publicación completada

Versión Workers `4e43b8e9-4cc5-4fce-83cb-53cbf48b9fe1`, desplegada conservando variables y sin cambiar plan ni tema activo. La comparación de las siete páginas públicas pasó: metadatos, schemas y textos informativos idénticos. Pasaron también el smoke público/privado de 15 rutas y la regresión del CSS móvil, con fuente local y sin rutas de PC ni sourcemaps expuestos.

La comprobación visual del sitio publicado confirmó el FAQ a 20/18px, el artículo a 18px y ambos con el marco amplio; el Home ya no contiene el recuadro y muestra el nuevo enlace. Se mantienen las capturas locales de revisión como evidencia gráfica; la captura de producción por CDP agotó su tiempo, aunque la lectura del DOM y los checks HTTP sí finalizaron correctamente.

Se restauró la presentación local original y se eliminaron la noticia y las cuentas/perfiles desechables de esta revisión, sin tocar datos reales de producción.
