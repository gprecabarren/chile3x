# Foro Chile3X — beta privada

## Alcance implementado

`/foro`, `/foro/nuevo`, `/foro/secciones` y `/foro/tema/[topicId]` son privados. Cada página valida una sesión administrativa y `forum.manage` ANTES de consultar datos del foro. Solo owner y administrator tienen esa capacidad; moderator, editor y support quedan excluidos. La API exige esa misma autorización y origen correcto. No hay registro público, acceso de cuentas normales ni opción de apertura automática.

44 secciones iniciales, agrupadas en comunidad, anuncios, Santiago, regiones, conversación y creadores. Incluyen las 16 regiones actuales (Aysén incluida). La referencia La EstoKada se utilizó para investigar la taxonomía, no para importar personas, teléfonos, textos, fotografías ni conversaciones. Los nombres y descripciones son propios y adaptados a Chile3X.

Disponible: crear/editar/archivar/reactivar secciones, grupos y orden; crear temas, responder, buscar títulos y textos, paginar, fijar, cerrar/reabrir, mover entre secciones, papelera recuperable de temas y respuestas, edición con control de versión y trazabilidad administrativa. Archivar no borra. Se añadieron normas versionadas, denuncias y rectificación, seguimiento, avisos internos propios y adjuntos privados con declaración de consentimiento, revisión, cuotas y recuperación. No se guardan copias de textos ni archivos en la auditoría.

Los posts se muestran como texto escapado, nunca HTML. Búsquedas parametrizadas, comodines escapados, formularios acotados a 64 KB, textos a 6000 caracteres, páginas de 20 elementos y hasta 200 secciones. Las rutas no están en sitemap, robots las excluye y su metadata es noindex. El Worker no las incluye en la lista de caché pública.

## Investigación y elección (14 de octubre de 2026)

- [Referencia de estructura](https://www.laestokada.cl/foro/): categorías de anuncios, conversaciones por rubro, regiones, comunidad y contenido. No se copiaron marcas, diseño ni conversaciones.
- [Flarum](https://docs.flarum.org/install/) es software gratuito, pero requiere un entorno PHP y servidor web que no existe en el Worker actual. Instalarlo implicaría otro alojamiento y una integración de identidad.
- [FreeFlarum](https://docs.freeflarum.com/en/legal/terms/) prohíbe contenido sexual explícito, restringe monetización y desaconseja proyectos profesionales o datos críticos. No se creó ninguna cuenta.
- [Discourse autoalojado](https://github.com/discourse/discourse/blob/main/docs/INSTALL.md) requiere un servidor Linux con Docker y servicios adicionales, no una ejecución directa dentro de Workers.
- [Discourse Free](https://blog.discourse.org/2026/07/introducing-the-discourse-free-plan/) ofrece un foro gratuito con subdominio y Discourse ID. Se evaluó; no cumple directamente la necesidad de una ruta interna `/foro` con los permisos y las sesiones de administración ya existentes. No se contrataron planes, crearon cuentas ni transfirieron usuarios.

Se eligió una implementación nativa con la base D1 y sesiones existentes. No añade licencias ni suscripciones; sí utiliza la cuota actual de peticiones y base de datos. No debe describirse como infraestructura ilimitada ni como sustituto completo de Discourse.

## Datos y migración

`0044_private_forum_beta.sql` añade únicamente `forum_sections`, `forum_topics` y `forum_posts` e inserta las 44 secciones vacías. No modifica anuncios, titulares, medios, documentos ni estados de moderación. Los identificadores y nombres administrativos permiten atribuir publicaciones; no se muestran correos, identidades privadas de usuarios ni sus documentos.

El generador encontró migraciones manuales posteriores al snapshot antiguo. Se reconciliaron journal/snapshot sin volver a aplicar esas tablas o columnas: la migración nueva contiene exclusivamente el foro.

## Antes de una apertura pública futura

La beta ya tiene herramientas iniciales para esos flujos, pero no se abre al público. Falta definir expresamente roles públicos, visibilidad de nombres, responsables de moderación y tiempos de respuesta, apelación/reapertura de denuncias, reglas comerciales y de participación. Requiere QA con administradores reales, accesibilidad con tecnologías asistivas y Safari/iPhone, pruebas sostenidas en un entorno de carga independiente, revisión de políticas/abuso y presupuesto de almacenamiento. No hay interruptor público oculto ni registros importados de otros foros.

## Ampliación de comunidad privada (14 de octubre de 2026)

- `/foro/normas`: normas editables con versión; publicación exige confirmar la versión actual. Una edición concurrente invalida el formulario anterior. Se registra la aceptación y la versión, no una firma ni una certificación legal del material.
- `/foro/moderacion`: denuncias con motivos acotados, detalle de hasta 1000 caracteres, mensaje actual y decisión explicada. Retirar a papelera es opcional y solo ocurre si esa decisión consiguió la denuncia abierta y la versión actual del mensaje; reenvíos de una decisión cerrada no pueden retirar mensajes recuperados. La auditoría registra actor, IDs y actuación sin copiar el contenido.
- Seguimiento de hasta 200 temas por administrador. `/foro/notificaciones` muestra solo avisos del destinatario por respuestas de otras personas habilitadas; no se envían correos ni avisos externos. Dejar de seguir evita nuevos avisos.
- Cuatro adjuntos activos por mensaje: fotos finales hasta 5 MB, videos finales hasta 12 MB / 15 segundos. Se prepara en el dispositivo y se guarda solo el final, con marca de agua opcional. No se admiten PDF, SVG ni documentos de identidad o médicos. Los archivos nuevos quedan pendientes; todos siguen privados incluso aprobados.
- Cupo global del foro de **200 MB**, incluidos archivos en recuperación, y protección del límite de medios total del sitio. Reserva atómica en D1 antes de guardar el objeto R2; fallos de almacenamiento generan limpieza durable. Cargar seis archivos por minuto y publicar con cinco segundos de separación; escrituras generales hasta veinte/minuto y denuncias hasta seis/minuto, persistidos en D1.
- Archivos retirados/rechazados o asociados a mensajes/temas en papelera: 30 días; notificaciones: 90 días; denuncias cerradas: 180 días; contadores inactivos: un día. La depuración no temporal conserva la transición ya anunciada al 13 de noviembre de 2026 y respeta retenciones excepcionales registradas. Las historias no cambian su vencimiento de 24 horas. Los reintentos R2 no vuelven a ofrecer registros eliminados.

Migraciones aditivas `0049_forum_community.sql` y `0050_forum_decision_claim.sql`: siete tablas de comunidad y un token de decisión, sin alterar anuncios, medios, titulares o estados de visitantes. Investigación adicional: [guía de moderación de Discourse](https://meta.discourse.org/t/discourse-moderation-guide-part-1-getting-started/63116) y [auditoría de Flarum](https://docs.flarum.org/extensions/audit/). Se adaptaron flujos, no contenido ni marcas.

Pruebas locales: normas/versiones, permisos de dos administradores y cuentas normales, aislamiento de avisos, denuncias duplicadas y decisiones obsoletas, PNG/MP4 reales, rangos privados, consentimiento/formato/tamaño/cuota, retirada/restauración y auditoría sin textos. Carga sintética de 250 temas y 1000 mensajes: ocho páginas concurrentes en aproximadamente 1,0–1,5 segundos en el entorno local; no equivale a capacidad de producción ni a una prueba de tráfico sostenido. Toda esa carga es desechable y no se publica.
