# Legibilidad de controles públicos — 24 de octubre de 2026

## Cambios

- Texto de las acciones y navegación pública a `1rem` (16 px con la configuración habitual del navegador), en ambas portadas y temas. Incluye ciudades, filtros, contacto del perfil, menú, FAQ/CTAs y enlaces de navegación del footer.
- No se aumentó el padding global ni se aplicó zoom a los botones. El encabezado móvil conserva botones de 40 px y los contactos de perfil unos 43 px. Se permite reacomodar filas o partir etiquetas cuando el ancho lo exige.
- Se mantienen los controles de solo icono, logos y los paneles privados fuera del cambio. La entrada administrativa discreta del footer y las leyendas no interactivas no se agrandan.
- El enlace territorial ahora dice **Volver a la página principal** y conserva `href="/"`.
- El selector de ciudades se ancla a la barra completa, no a un control que puede bajar de fila. Se comprobó abierto a 320 px; también se ajustó el menú Compartir.

## Implementación y carga

`app/public-controls.css` se importa desde el layout y aplica reglas compartidas a los contenedores públicos existentes. No añade componentes cliente, peticiones de datos, fuentes, imágenes, blur ni animaciones. La fuente continúa siendo DM Sans local. El CSS compilado conserva su nombre con hash para invalidación de caché.

No se modificó el recurso Liquid Glass v4 ni su carga condicional. Classic no descarga el CSS Glass. No se cambiaron URLs públicas, títulos, jerarquía de encabezados, canonicals, datos estructurados, robots ni permisos.

## Verificación

- 418 pruebas automatizadas aprobadas, TypeScript y build correctos.
- ESLint: cero errores; permanece un aviso anterior en `ProfileSafetyActions.tsx` sobre navegación.
- 90 mediciones responsive sin desbordes ni solapamientos de las filas de acciones comprobadas: 320, 360, 390, 430, 768, 1366 y 1920 px; ambas portadas, ambos temas y páginas de ciudades, perfiles, términos, privacidad, FAQ, contacto, venta de contenido, agencias y arriendos.
- Selector de ciudades y menú Compartir abiertos dentro de 320 px; foco de teclado visible y restauración de foco al cerrar ciudades.
- Menú WhatsApp a 320 px, etiquetas legibles y contenido dentro del viewport.
- Paneles de administración y cuenta comprobados sin raíz pública y sin ampliación de sus acciones.
- Pruebas HTTP locales de once páginas: 200, un H1, canonical y sin excepción de renderizado. Solo se utilizaron fixtures locales desechables.

La vista de 390 × 844 es una referencia de tamaño de iPhone, no una prueba en Safari físico ni una certificación integral de accesibilidad. No se atribuye una mejora de Core Web Vitals a un cambio tipográfico.

Evidencia: `outputs/qa-public-controls-viewport-checks.json`, `outputs/qa-botones-publicos-movil-20261024.jpg` y `outputs/qa-botones-publicos-pc-20261024.jpg`.

## Publicación

Versión `6fac29d1-c5fc-4fa1-be0c-21df419cb241`. Se comprobó en producción el nuevo texto y el CSS de 16 px. Quince verificaciones HTTP aprobadas (públicas, sitemap, robots, activos, protección administrativa y bloqueo de mapas/rutas locales). No se cambió el tema ni la portada activos en producción; actualmente responde Classic. Se restauró la presentación local y se retiraron todos los fixtures creados para esta revisión.
