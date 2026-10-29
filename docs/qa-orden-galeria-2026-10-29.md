# Orden de fotos y videos — 29 de octubre de 2026

Muestras ya tenía reordenamiento básico con Subir/Bajar. Los anuncios de cuenta normal y administración no exponían controles ni PATCH de orden. Ahora `ProfileMediaManager` comparte Izquierda/Derecha para archivos guardados en los tres contextos. Cada movimiento se confirma en servidor antes de mostrarlo; no hay reintentos automáticos ante una respuesta incierta.

Fotos y videos se ordenan por separado, con la foto principal fuera de la galería. Cada PATCH valida la permutación completa del tipo elegido, origen, identidad, propiedad/capacidades, revisión y estado del recurso. El servidor rechaza archivos ajenos, duplicados, cambios de tipo y galerías incompletas. Las mutaciones administrativas respetan reservas y recibos y se registran en auditoría.

La edición pendiente y su base aprobada reciben la misma posición. Los editores administrativos usan la vista lógica que también emplea el propietario, evitando mostrar dos versiones como fotos diferentes. Reordenar no modifica bytes, marcas, privacidad ni estados de moderación; tampoco mueve contenido exclusivo. No se añaden tablas ni objetos R2. Las galerías públicas y de muestras ya leen `sort_order` y conservan su presentación compartida.

Al cancelar administrativamente una edición pendiente, el DELETE devuelve también `restoredMedia`, igual que el flujo del propietario. Así la vista lógica recupera inmediatamente la base aprobada y su posición, sin necesitar recargar ni dejar un hueco ficticio. Las pruebas confirman tanto esa cancelación como la aprobación posterior después de reordenar.

Las pruebas usan datos locales desechables, sin cuentas ni cambios de medios en producción. La evidencia de ejecución, capturas y publicación permanece en `outputs/`, fuera de Git. La publicación requiere commit/push, checks del SHA y versión activa de Cloudflare verificada por separado.

La batería completa aprueba con 574 pruebas. Los casos dirigidos verifican permisos, CSRF, órdenes incompletos/duplicados/ajenos, versiones antiguas, reservas, foto principal, contenido exclusivo y sincronización de la base aprobada con su reemplazo pendiente. Se conservan claves R2, bytes, estado de moderación y metadatos ajenos al orden.

El navegador confirma fotos y videos, movimiento inverso, recarga y orden real de la galería compartida en muestra, Escort, Agencia y Arriendo, desde administración y cuenta normal. Una respuesta de conflicto conserva el orden visual y no dispara reintentos. La revisión responsive cubre 54 vistas (tres contextos, ambos temas y anchos 320, 360, 390, 430, 768, 1366, 1920, 2560 y 3440 px), incluidos foco y controles deshabilitados en los extremos. Son pruebas en Chrome con anchos móviles, no en un iPhone físico.

La interrupción de red y una respuesta HTML de error se simulan en los tres contextos: se mantiene el orden anterior, se informa que no pudo confirmarse y no se reenvía la mutación. La confirmación final se registra en servidor mediante revisión; el navegador no presume éxito por haber pulsado un botón.

Los medios, muestras y cuentas desechables se retiraron después de las comprobaciones; se detuvieron los servidores locales. TypeScript, ESLint de los archivos afectados, higiene de publicación y la compilación/batería final aprobaron. La verificación del SHA publicado y su versión activa se conserva como evidencia aparte.
