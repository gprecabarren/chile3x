# Foro Chile3X — beta privada

## Alcance implementado

`/foro`, `/foro/nuevo`, `/foro/secciones` y `/foro/tema/[topicId]` son privados. Cada página valida una sesión administrativa y `forum.manage` ANTES de consultar datos del foro. Solo owner y administrator tienen esa capacidad; moderator, editor y support quedan excluidos. La API exige esa misma autorización y origen correcto. No hay registro público, acceso de cuentas normales ni opción de apertura automática.

44 secciones iniciales, agrupadas en comunidad, anuncios, Santiago, regiones, conversación y creadores. Incluyen las 16 regiones actuales (Aysén incluida). La referencia La EstoKada se utilizó para investigar la taxonomía, no para importar personas, teléfonos, textos, fotografías ni conversaciones. Los nombres y descripciones son propios y adaptados a Chile3X.

Disponible: crear/editar/archivar/reactivar secciones, grupos y orden; crear temas, responder, buscar títulos y textos, paginar, fijar, cerrar/reabrir, mover entre secciones, papelera recuperable de temas y respuestas, edición con control de versión y trazabilidad administrativa. Archivar no borra. La beta no ofrece eliminación definitiva ni adjuntos; no se guardan copias de textos en la auditoría.

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

Definir normas de comunidad y moderación, visibilidad de nombres, reclamaciones y rectificación, consentimiento y derechos de publicación, límites de frecuencia y anti-spam para usuarios, denuncias privadas, plazos de conservación, adjuntos consentidos con cuotas y revisión, notificaciones, seguimiento de temas y pruebas de carga. Una apertura requiere cambios deliberados de autorización: no hay interruptor público oculto.
