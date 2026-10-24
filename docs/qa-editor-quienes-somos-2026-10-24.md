# Editor de Quiénes somos y orientación del panel

## Acceso

Contenido del sitio → SEO y buscadores → SEO por página → Quiénes somos.

Ruta directa: `/admin/contenido/seo/paginas?pagina=nosotros`.

Se reutiliza el editor manual existente: título y descripción para buscadores, tarjeta social (título, descripción, imagen estática pública, texto alternativo), robots, límites de fragmento y comprobación técnica. No es un editor del cuerpo visible de Quiénes somos ni un analizador de palabras clave. No sube imágenes nuevas ni modifica la canónica/ruta, el H1, el texto visible o los datos estructurados.

## Conservación y seguridad

Los valores iniciales son los publicados, no sugerencias nuevas. Se conserva por separado la descripción social original de Quiénes somos, que no era idéntica a la descripción del resultado. El título absoluto evita duplicar la marca. Abrir no escribe ajustes y guardar sin cambios tampoco.

`seo_info_nosotros` usa el almacenamiento existente: no requiere tabla ni migración. La API hereda autenticación, permiso `settings.manage`, mismo origen, lista cerrada de campos, límite de JSON, huella de valores efectivos, revisión compartida, registro y escritura atómica. Cambiar robots exige confirmación. `noindex` excluye también del sitemap. Las restricciones globales prevalecen. Admin y API siguen noindex y no-store. No se cambiaron el plan ni los permisos.

## Navegación y aspecto

- El índice es un enlace principal con icono de cuadrícula, no una pestaña más.
- Dos grupos: Textos e imágenes (tono ámbar) y SEO y buscadores (azul). Las etiquetas explican las excepciones de Inicio y Noticias, que ya contienen ambos tipos de campos.
- Se muestra “Estás en”, la sección activa lleva borde y marca “Actual”, y se elige la ruta más específica para no resaltar simultáneamente padre e hijo.
- En móvil hay un selector nativo agrupado, con la ubicación visible. Se neutraliza la regla antigua que ocultaba toda la navegación superior.
- En SEO por página también se identifica la página seleccionada, con borde, fondo y marca de verificación que se conserva en ambos temas.
- El formulario de ambos Home mantiene sus nombres, datos, guardado y permisos; solo agrupa los campos visibles por separado de los cuatro metadatos existentes.
- DM Sans ya era global en ambos paneles. Se hacen más legibles los menús (14px), botones (14px) y campos (16px). Los botones privados usan esquinas compartidas, no el radio de píldora del sitio público. Las acciones de cuentas se distribuyen a su ancho intrínseco y saltan de fila sin deformarse.
- Los campos privados pierden la sombra inferior antigua; mantienen foco visible, etiquetas, selectores nativos, estados inválidos y deshabilitados. No se alteran los controles públicos ni el archivo condicional de Liquid Glass.

## Comprobaciones

443 pruebas automáticas, build y tipos correctos. Lint sin errores; permanece una advertencia preexistente de navegación en `ProfileSafetyActions.tsx`, ajena a este cambio.

Integración local de las seis páginas: herencia, no-op, permisos/origen, payload inválido, conflictos, robots, guardados independientes, HTML público, sitemap y restauración. Flujo de navegador en Quiénes somos: editar → revisar diferencias → guardar → usar respaldo → guardar restauración.

Matriz final de seis vistas (índice, Inicio, SEO global, SEO de Quiénes somos, cuentas y datos del usuario), nueve anchos de 320 a 2560px y ambos temas. Se revisan navegación visible, acción activa, desbordamientos, campos de 16px y ausencia de sombra inferior. Fixtures exclusivamente locales, sin cuentas ni modificaciones de prueba en producción. Evidencia: `outputs/qa-content-panel-responsive-20261024.json` y capturas `qa-content-*`, `qa-about-editor-*` y `qa-panel-account-actions-*`.

Comparación pública antes/después preparada con `scripts/qa-about-seo-production.mjs`: título, descripción, robots, canónica, tarjeta social, H1, JSON-LD y huella del cuerpo visible. Los resultados de publicación se agregan tras el despliegue.

## Check rojo de GitHub

La ejecución de Cloudflare `5264d150-5fe8-4d17-96b5-0cb62b5c67c4`, commit `060679e`, falló en instalación con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`: el bloqueo conservaba overrides que ya no estaban declarados en el manifiesto. No llegó a compilar ni a desplegar. Los dos checks de CodeQL se completaron correctamente. No es un error 1102 ni demuestra un fallo del sitio desplegado manualmente.

Con autorización del propietario se restablecen exactamente los once overrides ya fijados en `pnpm-lock.yaml` y se declara `packageManager: pnpm@9.15.5`, la versión usada por Workers Builds. No se elimina la protección `--frozen-lockfile`, no se cambian las versiones directas ni se regenera la resolución. Una instalación limpia con esa versión y ese indicador finalizó correctamente; el lockfile permanece idéntico. Una prueba evita que vuelva a separarse del manifiesto.
