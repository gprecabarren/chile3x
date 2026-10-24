# Inicio: ubicación unificada y acceso administrativo

## Publicación

- Worker `chile3x`, versión `c8f92de2-b7b2-4e7c-a7e7-184bc1091400`.
- Variables, secretos, enlaces D1/R2, cola y cron conservados. Sin migraciones ni modificaciones de cuentas.
- Solo presentación del inicio/footer y exclusión de indexación/caché para respuestas de administración.

## Cambios

- Ubicación actual, selector de ciudades y salto a región dentro de una sola tarjeta del inicio. Columnas en PC; distribución apilada con separador sutil en móvil.
- Se reutilizan los componentes, enlaces y preferencia manual existentes; no se añaden consultas ni peticiones de datos.
- En el footer, junto a «Chile · Directorio para adultos», enlace nativo «Acceso administrador» con `rel="nofollow"`, sin precarga.
- Reserva de espacio en el footer móvil para que el WhatsApp flotante no tape el acceso.
- Las respuestas de `/admin` y sus subrutas, incluidas las redirecciones anónimas, llevan `X-Robots-Tag: noindex, nofollow, nosnippet` y `Cache-Control: private, no-store, max-age=0`.
- Se conservan la autorización administrativa, las etiquetas privadas, robots.txt y la exclusión del sitemap. El enlace no concede permisos y las directivas de buscadores no sustituyen la autenticación.

## Verificación

Historia comprobada: inicio → seleccionar ciudad → directorio de esa ciudad → volver al inicio conserva la preferencia → «Ver todo Chile» la limpia; selector de región → salto y resaltado del destino. Footer → enlace privado, sin cambio de permisos.

- Compilación de producción, TypeScript y ESLint correctos.
- 356 pruebas correctas, incluidas seis regresiones de composición y exclusión administrativa.
- Chrome local: tarjeta revisada a 320, 390, 1024 y 1440 px, sin desborde horizontal. Ciudad larga «Santiago Centro» ajusta su texto; selector abierto permanece dentro de la tarjeta y abarca su ancho.
- Comprobación del footer estrecho: enlace sin intersección con el WhatsApp flotante.
- Prueba local con la compilación final: inicio 200; `/admin` y `/admin/medios` sin sesión 307 con noindex/no-store.
- Producción: inicio 200 con la composición y el enlace nuevos; ambas rutas administrativas 307 con noindex/no-store; robots.txt excluye administración y el sitemap no incluye sus URLs.
- Script de verificación de producción de solo lectura: `node scripts/qa-home-discovery-live.mjs`.

La última revisión visual se hizo sobre la compilación local final. Chrome ya no estaba disponible al intentar la revisión visual posterior a la publicación; la verificación de producción por HTTP sí se completó. No se certifican todos los navegadores ni dispositivos físicos.

## Capturas

- `outputs/home-ubicacion-unificada-movil-detalle.png`
- `outputs/home-ubicacion-unificada-pc-detalle.png`
- `outputs/footer-acceso-administrador-movil-detalle.png`

Los contornos resaltados de los campos/enlace en algunas capturas corresponden al foco de teclado utilizado en las pruebas.
