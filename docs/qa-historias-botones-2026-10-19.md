# Historias, cabeceras e iconos — revisión del 19 de octubre de 2026

## Publicación

- Worker `chile3x`, versión `ae0f17a9-fdae-495d-a633-e2b2af4ecf0a`, activa al 100%.
- Se conservaron las variables, secretos, enlaces D1/R2, colas y cron existentes. No se necesitaron migraciones.
- Se conservaron los cambios previos de dependencias y el trabajo ajeno a esta tarea.

## Cambios

- «+ Subir historias» para sesiones normales en la cabecera pública y el panel de cuenta.
- Selector privado de anuncios: aprobados y visibles primero; los demás debajo, desactivados, con explicación, soporte, edición y vista previa.
- Resumen de historias de todos los anuncios encima de «Rendimiento de tus anuncios». Consultas agrupadas por propietario y tipo, sin lecturas por cada anuncio.
- Textos, fotos y videos desde el administrador de historias existente. Medios con carga diferida, sin reproducción automática.
- Cabeceras privadas sin logo duplicado: logo al inicio en el menú lateral; etiqueta Mi cuenta / Administrador en la barra superior.
- «Volver al sitio web» como enlace discreto de texto con flecha, no como un botón grande.
- Iconos SVG compartidos para acciones reconocibles. Se conservaron las ilustraciones existentes y los controles nativos, sin observadores ni modificación posterior del DOM.
- OnlyFans con símbolo circular inline, conservando el campo, validación de dominio, seguimiento y enlace existentes. Se revisó junto a Arsmate y el resto de contactos.
- Correcciones de cascada móvil: tarjetas de cuentas en una columna, acciones largas sin recortes y detalles de historias sin columnas implícitas.

## Verificación

- Compilación de producción correcta.
- TypeScript sin errores.
- ESLint sin errores; permanece un aviso previo de navegación en ProfileSafetyActions, ajeno al cambio.
- 346 pruebas automáticas correctas.
- 25 páginas privadas/públicas renderizadas con cuentas sintéticas locales: paneles, editores, medios, correo, historias y perfiles.
- Publicación real local de texto, imagen y video mediante el API existente. Anuncios ajenos, no aprobados, ocultos y en papelera rechazan nuevas historias.
- Revisión visual en Chrome a 360, 390 y 1440 píxeles. No es una certificación en dispositivos físicos ni en todos los navegadores.
- Menú de soporte abre los canales existentes de soporte y marketing; Escape cierra el diálogo y devuelve el foco.
- Casos revisados: usuario normal, administrador, venta de contenido, cuenta sin anuncios y visitante anónimo.
- Nueva ruta privada noindex; metadatos, canonical y contenido público conservados. El botón de historias no aparece para visitantes anónimos ni administradores en el sitio público.
- Producción: `/`, `/escorts`, `/perfil/@lalita` y el nuevo recurso de cabecera respondieron 200 sin error de Worker; `/mi-cuenta/historias` redirigió correctamente al ingreso sin sesión.
- Los datos y archivos de prueba locales fueron eliminados al terminar; no se crearon anuncios ni historias de prueba en producción.

## Entregables

- [Mensajes de WhatsApp](mensajes-whatsapp.md): bienvenida, ausencia, respuestas rápidas y tres invitaciones. Son borradores; no se enviaron ni configuraron en WhatsApp.
- Capturas: `outputs/historias-selector-pc.png`, `outputs/historias-selector-movil.png`, `outputs/contactos-onlyfans-movil.png`.
- Script de comprobación reproducible local: `scripts/qa-account-stories.mjs`.
