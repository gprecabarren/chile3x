# Inventario de rutas de Chile3X

Referencia de código: `main` en `5d42099` más los cambios locales de esta entrega, 24 de octubre de 2026. Incluye las rutas de archivos presentes; no prueba publicación ni autorización de cada una. Las reglas efectivas están en el Worker, los layouts, cada handler y sus servicios.

Hay **83 páginas**, **124 handlers en app/api** y **11 handlers adicionales**. Los parámetros entre corchetes representan rutas dinámicas.

## Páginas

| Ruta | Fuente |
| --- | --- |
| `/admin/acceso-denegado` | [página](../app/admin/acceso-denegado/page.tsx) |
| `/admin/actividad` | [página](../app/admin/actividad/page.tsx) |
| `/admin/administradores` | [página](../app/admin/administradores/page.tsx) |
| `/admin/anuncios-publicaciones/[profileId]/editar` | [página](../app/admin/anuncios-publicaciones/[profileId]/editar/page.tsx) |
| `/admin/anuncios-publicaciones` | [página](../app/admin/anuncios-publicaciones/page.tsx) |
| `/admin/anuncios-publicaciones/papelera` | [página](../app/admin/anuncios-publicaciones/papelera/page.tsx) |
| `/admin/ayuda/guias` | [página](../app/admin/ayuda/guias/page.tsx) |
| `/admin/ayuda` | [página](../app/admin/ayuda/page.tsx) |
| `/admin/configuracion/[section]` | [página](../app/admin/configuracion/[section]/page.tsx) |
| `/admin/configuracion` | [página](../app/admin/configuracion/page.tsx) |
| `/admin/contenido/faq` | [página](../app/admin/contenido/faq/page.tsx) |
| `/admin/contenido/inicio` | [página](../app/admin/contenido/inicio/page.tsx) |
| `/admin/contenido` | [página](../app/admin/contenido/page.tsx) |
| `/admin/contenido/seo` | [página](../app/admin/contenido/seo/page.tsx) |
| `/admin/contenido/seo/paginas` | [página](../app/admin/contenido/seo/paginas/page.tsx) |
| `/admin/correos` | [página](../app/admin/correos/page.tsx) |
| `/admin/cuentas/[userId]/crear-perfil` | [página](../app/admin/cuentas/[userId]/crear-perfil/page.tsx) |
| `/admin/cuentas/[userId]` | [página](../app/admin/cuentas/[userId]/page.tsx) |
| `/admin/cuentas/[userId]/perfiles/[profileId]/medios` | [página](../app/admin/cuentas/[userId]/perfiles/[profileId]/medios/page.tsx) |
| `/admin/cuentas` | [página](../app/admin/cuentas/page.tsx) |
| `/admin/documentos-legales` | [página](../app/admin/documentos-legales/page.tsx) |
| `/admin/medios` | [página](../app/admin/medios/page.tsx) |
| `/admin/muestras/[sampleId]` | [página](../app/admin/muestras/[sampleId]/page.tsx) |
| `/admin/muestras/nueva` | [página](../app/admin/muestras/nueva/page.tsx) |
| `/admin/muestras` | [página](../app/admin/muestras/page.tsx) |
| `/admin/noticias` | [página](../app/admin/noticias/page.tsx) |
| `/admin` | [página](../app/admin/page.tsx) |
| `/admin/patrocinadores` | [página](../app/admin/patrocinadores/page.tsx) |
| `/admin/perfiles` | [página](../app/admin/perfiles/page.tsx) |
| `/admin/reportes` | [página](../app/admin/reportes/page.tsx) |
| `/admin/resenas` | [página](../app/admin/resenas/page.tsx) |
| `/admin/telegram` | [página](../app/admin/telegram/page.tsx) |
| `/admin/testing` | [página](../app/admin/testing/page.tsx) |
| `/admin/vista-previa-inicio/[layout]` | [página](../app/admin/vista-previa-inicio/[layout]/page.tsx) |
| `/admin/vista-previa-tema/[theme]` | [página](../app/admin/vista-previa-tema/[theme]/page.tsx) |
| `/agencias` | [página](../app/agencias/page.tsx) |
| `/arriendos` | [página](../app/arriendos/page.tsx) |
| `/contacto` | [página](../app/contacto/page.tsx) |
| `/escorts/[citySlug]` | [página](../app/escorts/[citySlug]/page.tsx) |
| `/escorts` | [página](../app/escorts/page.tsx) |
| `/faq` | [página](../app/faq/page.tsx) |
| `/foro/moderacion` | [página](../app/foro/moderacion/page.tsx) |
| `/foro/normas` | [página](../app/foro/normas/page.tsx) |
| `/foro/notificaciones` | [página](../app/foro/notificaciones/page.tsx) |
| `/foro/nuevo` | [página](../app/foro/nuevo/page.tsx) |
| `/foro` | [página](../app/foro/page.tsx) |
| `/foro/secciones` | [página](../app/foro/secciones/page.tsx) |
| `/foro/tema/[topicId]` | [página](../app/foro/tema/[topicId]/page.tsx) |
| `/ingresar` | [página](../app/ingresar/page.tsx) |
| `/mi-cuenta/[profileId]/editar` | [página](../app/mi-cuenta/[profileId]/editar/page.tsx) |
| `/mi-cuenta/[profileId]/estadisticas` | [página](../app/mi-cuenta/[profileId]/estadisticas/page.tsx) |
| `/mi-cuenta/[profileId]/historias` | [página](../app/mi-cuenta/[profileId]/historias/page.tsx) |
| `/mi-cuenta/ayuda` | [página](../app/mi-cuenta/ayuda/page.tsx) |
| `/mi-cuenta/bloqueados` | [página](../app/mi-cuenta/bloqueados/page.tsx) |
| `/mi-cuenta/comentarios` | [página](../app/mi-cuenta/comentarios/page.tsx) |
| `/mi-cuenta/contenido` | [página](../app/mi-cuenta/contenido/page.tsx) |
| `/mi-cuenta/datos-personales` | [página](../app/mi-cuenta/datos-personales/page.tsx) |
| `/mi-cuenta/favoritos` | [página](../app/mi-cuenta/favoritos/page.tsx) |
| `/mi-cuenta/historias` | [página](../app/mi-cuenta/historias/page.tsx) |
| `/mi-cuenta/mensajes` | [página](../app/mi-cuenta/mensajes/page.tsx) |
| `/mi-cuenta/nuevo-perfil` | [página](../app/mi-cuenta/nuevo-perfil/page.tsx) |
| `/mi-cuenta` | [página](../app/mi-cuenta/page.tsx) |
| `/mi-cuenta/pruebas` | [página](../app/mi-cuenta/pruebas/page.tsx) |
| `/mi-cuenta/reportes` | [página](../app/mi-cuenta/reportes/page.tsx) |
| `/mi-cuenta/telegram` | [página](../app/mi-cuenta/telegram/page.tsx) |
| `/muestra/[sampleId]` | [página](../app/muestra/[sampleId]/page.tsx) |
| `/noticias/[slug]` | [página](../app/noticias/[slug]/page.tsx) |
| `/noticias` | [página](../app/noticias/page.tsx) |
| `/novedades` | [página](../app/novedades/page.tsx) |
| `/` | [página](../app/page.tsx) |
| `/patrocinadores` | [página](../app/patrocinadores/page.tsx) |
| `/patrocioandores` | [página](../app/patrocioandores/page.tsx) |
| `/perfil/[slug]` | [página](../app/perfil/[slug]/page.tsx) |
| `/privacidad` | [página](../app/privacidad/page.tsx) |
| `/quienes-somos` | [página](../app/quienes-somos/page.tsx) |
| `/reactivar-cuenta` | [página](../app/reactivar-cuenta/page.tsx) |
| `/recuperar-clave` | [página](../app/recuperar-clave/page.tsx) |
| `/registro` | [página](../app/registro/page.tsx) |
| `/reglas-de-publicacion` | [página](../app/reglas-de-publicacion/page.tsx) |
| `/restablecer-clave` | [página](../app/restablecer-clave/page.tsx) |
| `/terminos` | [página](../app/terminos/page.tsx) |
| `/venta-contenido` | [página](../app/venta-contenido/page.tsx) |
| `/verificar-correo` | [página](../app/verificar-correo/page.tsx) |

## Manejadores HTTP

| Ruta | Métodos exportados | Fuente |
| --- | --- | --- |
| `/admin/bugs` | GET | [handler](../app/admin/bugs/route.ts) |
| `/admin/configuracion/inicio` | GET | [handler](../app/admin/configuracion/inicio/route.ts) |
| `/admin/testers` | GET | [handler](../app/admin/testers/route.ts) |
| `/api/admin/administradores/[grantId]` | POST | [handler](../app/api/admin/administradores/[grantId]/route.ts) |
| `/api/admin/administradores` | POST | [handler](../app/api/admin/administradores/route.ts) |
| `/api/admin/ayuda/guias` | POST | [handler](../app/api/admin/ayuda/guias/route.ts) |
| `/api/admin/colaboracion/confirmacion` | GET | [handler](../app/api/admin/colaboracion/confirmacion/route.ts) |
| `/api/admin/colaboracion` | GET, POST | [handler](../app/api/admin/colaboracion/route.ts) |
| `/api/admin/contenido/[mediaId]` | POST | [handler](../app/api/admin/contenido/[mediaId]/route.ts) |
| `/api/admin/contenido/colecciones/[collectionId]/aprobar-todos` | POST | [handler](../app/api/admin/contenido/colecciones/[collectionId]/aprobar-todos/route.ts) |
| `/api/admin/contenido/seo/[pageId]` | GET, POST | [handler](../app/api/admin/contenido/seo/[pageId]/route.ts) |
| `/api/admin/cuentas/[userId]/perfiles` | POST | [handler](../app/api/admin/cuentas/[userId]/perfiles/route.ts) |
| `/api/admin/documentos-legales/[document]` | GET, POST | [handler](../app/api/admin/documentos-legales/[document]/route.ts) |
| `/api/admin/email-settings` | POST | [handler](../app/api/admin/email-settings/route.ts) |
| `/api/admin/foro/adjuntos/[postId]` | POST | [handler](../app/api/admin/foro/adjuntos/[postId]/route.ts) |
| `/api/admin/foro` | POST | [handler](../app/api/admin/foro/route.ts) |
| `/api/admin/media/[mediaId]/procesar` | GET, POST | [handler](../app/api/admin/media/[mediaId]/procesar/route.ts) |
| `/api/admin/media/[mediaId]` | POST | [handler](../app/api/admin/media/[mediaId]/route.ts) |
| `/api/admin/moderacion-resumen` | GET | [handler](../app/api/admin/moderacion-resumen/route.ts) |
| `/api/admin/muestras/[sampleId]` | POST | [handler](../app/api/admin/muestras/[sampleId]/route.ts) |
| `/api/admin/muestras/[sampleId]/media` | POST / PATCH | [handler](../app/api/admin/muestras/[sampleId]/media/route.ts) |
| `/api/admin/muestras/[sampleId]/media/[mediaId]` | PATCH / DELETE | [handler](../app/api/admin/muestras/[sampleId]/media/[mediaId]/route.ts) |
| `/api/admin/muestras/[sampleId]/media/[mediaId]/procesar` | GET / POST | [handler](../app/api/admin/muestras/[sampleId]/media/[mediaId]/procesar/route.ts) |
| `/api/admin/muestras` | POST | [handler](../app/api/admin/muestras/route.ts) |
| `/api/admin/noticias/[postId]` | POST | [handler](../app/api/admin/noticias/[postId]/route.ts) |
| `/api/admin/noticias/media` | POST | [handler](../app/api/admin/noticias/media/route.ts) |
| `/api/admin/noticias` | POST | [handler](../app/api/admin/noticias/route.ts) |
| `/api/admin/notificaciones` | POST | [handler](../app/api/admin/notificaciones/route.ts) |
| `/api/admin/operaciones/almacenamiento` | POST | [handler](../app/api/admin/operaciones/almacenamiento/route.ts) |
| `/api/admin/patrocinadores/[sponsorId]` | POST | [handler](../app/api/admin/patrocinadores/[sponsorId]/route.ts) |
| `/api/admin/patrocinadores/grupos/[groupId]` | POST | [handler](../app/api/admin/patrocinadores/grupos/[groupId]/route.ts) |
| `/api/admin/patrocinadores/grupos` | POST | [handler](../app/api/admin/patrocinadores/grupos/route.ts) |
| `/api/admin/patrocinadores` | POST | [handler](../app/api/admin/patrocinadores/route.ts) |
| `/api/admin/patrocinadores/visibilidad` | POST | [handler](../app/api/admin/patrocinadores/visibilidad/route.ts) |
| `/api/admin/profiles/[profileId]/editar` | POST | [handler](../app/api/admin/profiles/[profileId]/editar/route.ts) |
| `/api/admin/profiles/[profileId]/historias` | POST | [handler](../app/api/admin/profiles/[profileId]/historias/route.ts) |
| `/api/admin/profiles/[profileId]/media/[mediaId]` | DELETE | [handler](../app/api/admin/profiles/[profileId]/media/[mediaId]/route.ts) |
| `/api/admin/profiles/[profileId]/media/aprobar-todos` | POST | [handler](../app/api/admin/profiles/[profileId]/media/aprobar-todos/route.ts) |
| `/api/admin/profiles/[profileId]/media` | POST | [handler](../app/api/admin/profiles/[profileId]/media/route.ts) |
| `/api/admin/profiles/[profileId]/papelera` | POST | [handler](../app/api/admin/profiles/[profileId]/papelera/route.ts) |
| `/api/admin/profiles/[profileId]/status` | POST | [handler](../app/api/admin/profiles/[profileId]/status/route.ts) |
| `/api/admin/reportes/[reportId]` | POST | [handler](../app/api/admin/reportes/[reportId]/route.ts) |
| `/api/admin/resenas/[reviewId]` | POST | [handler](../app/api/admin/resenas/[reviewId]/route.ts) |
| `/api/admin/sesiones` | POST | [handler](../app/api/admin/sesiones/route.ts) |
| `/api/admin/settings` | POST | [handler](../app/api/admin/settings/route.ts) |
| `/api/admin/telegram/chats/[chatId]` | POST | [handler](../app/api/admin/telegram/chats/[chatId]/route.ts) |
| `/api/admin/telegram/configuracion` | POST | [handler](../app/api/admin/telegram/configuracion/route.ts) |
| `/api/admin/telegram/confirmar` | POST | [handler](../app/api/admin/telegram/confirmar/route.ts) |
| `/api/admin/telegram/moderacion/[caseId]` | POST | [handler](../app/api/admin/telegram/moderacion/[caseId]/route.ts) |
| `/api/admin/telegram/novedades/[bulletinId]` | POST | [handler](../app/api/admin/telegram/novedades/[bulletinId]/route.ts) |
| `/api/admin/telegram/novedades` | POST | [handler](../app/api/admin/telegram/novedades/route.ts) |
| `/api/admin/telegram/setup` | POST | [handler](../app/api/admin/telegram/setup/route.ts) |
| `/api/admin/telegram/vincular` | POST | [handler](../app/api/admin/telegram/vincular/route.ts) |
| `/api/admin/users/[userId]/eliminar` | POST | [handler](../app/api/admin/users/[userId]/eliminar/route.ts) |
| `/api/admin/users/[userId]/estado` | POST | [handler](../app/api/admin/users/[userId]/estado/route.ts) |
| `/api/admin/users/[userId]` | POST | [handler](../app/api/admin/users/[userId]/route.ts) |
| `/api/admin/users/[userId]/telegram` | POST | [handler](../app/api/admin/users/[userId]/telegram/route.ts) |
| `/api/admin/users` | POST | [handler](../app/api/admin/users/route.ts) |
| `/api/admin/x-settings` | POST | [handler](../app/api/admin/x-settings/route.ts) |
| `/api/agencias/[agencyProfileId]/invitaciones` | POST | [handler](../app/api/agencias/[agencyProfileId]/invitaciones/route.ts) |
| `/api/asociaciones-agencia/[membershipId]` | POST | [handler](../app/api/asociaciones-agencia/[membershipId]/route.ts) |
| `/api/auth/apple/callback` | POST | [handler](../app/api/auth/apple/callback/route.ts) |
| `/api/auth/apple/finish` | GET | [handler](../app/api/auth/apple/finish/route.ts) |
| `/api/auth/apple/start` | GET | [handler](../app/api/auth/apple/start/route.ts) |
| `/api/auth/comprobar-correo` | POST | [handler](../app/api/auth/comprobar-correo/route.ts) |
| `/api/auth/github/callback` | GET | [handler](../app/api/auth/github/callback/route.ts) |
| `/api/auth/github/start` | GET | [handler](../app/api/auth/github/start/route.ts) |
| `/api/auth/google/nonce` | GET | [handler](../app/api/auth/google/nonce/route.ts) |
| `/api/auth/google` | POST | [handler](../app/api/auth/google/route.ts) |
| `/api/auth/login` | POST | [handler](../app/api/auth/login/route.ts) |
| `/api/auth/logout` | POST | [handler](../app/api/auth/logout/route.ts) |
| `/api/auth/reactivate` | POST | [handler](../app/api/auth/reactivate/route.ts) |
| `/api/auth/reenviar-verificacion` | POST | [handler](../app/api/auth/reenviar-verificacion/route.ts) |
| `/api/auth/register` | POST | [handler](../app/api/auth/register/route.ts) |
| `/api/auth/restablecer-clave` | POST | [handler](../app/api/auth/restablecer-clave/route.ts) |
| `/api/auth/session/browser` | POST | [handler](../app/api/auth/session/browser/route.ts) |
| `/api/auth/session/logout` | POST | [handler](../app/api/auth/session/logout/route.ts) |
| `/api/auth/session/state` | GET | [handler](../app/api/auth/session/state/route.ts) |
| `/api/auth/solicitar-recuperacion` | POST | [handler](../app/api/auth/solicitar-recuperacion/route.ts) |
| `/api/auth/verificar-correo` | GET | [handler](../app/api/auth/verificar-correo/route.ts) |
| `/api/auth/x/callback` | GET | [handler](../app/api/auth/x/callback/route.ts) |
| `/api/auth/x/start` | POST | [handler](../app/api/auth/x/start/route.ts) |
| `/api/bugs/[bugId]` | POST | [handler](../app/api/bugs/[bugId]/route.ts) |
| `/api/bugs` | POST | [handler](../app/api/bugs/route.ts) |
| `/api/contacto/whatsapp` | POST | [handler](../app/api/contacto/whatsapp/route.ts) |
| `/api/historias/[storyId]` | POST | [handler](../app/api/historias/[storyId]/route.ts) |
| `/api/historias` | POST | [handler](../app/api/historias/route.ts) |
| `/api/mensajes/[conversationId]` | GET, POST, PATCH | [handler](../app/api/mensajes/[conversationId]/route.ts) |
| `/api/mensajes/conversaciones` | POST | [handler](../app/api/mensajes/conversaciones/route.ts) |
| `/api/mensajes/sin-leer` | GET | [handler](../app/api/mensajes/sin-leer/route.ts) |
| `/api/mi-cuenta/accesos` | POST | [handler](../app/api/mi-cuenta/accesos/route.ts) |
| `/api/mi-cuenta/avisos` | GET | [handler](../app/api/mi-cuenta/avisos/route.ts) |
| `/api/mi-cuenta/comentarios/[reviewId]` | POST | [handler](../app/api/mi-cuenta/comentarios/[reviewId]/route.ts) |
| `/api/mi-cuenta/contenido/accesos` | POST, DELETE | [handler](../app/api/mi-cuenta/contenido/accesos/route.ts) |
| `/api/mi-cuenta/contenido/medios/[mediaId]` | DELETE | [handler](../app/api/mi-cuenta/contenido/medios/[mediaId]/route.ts) |
| `/api/mi-cuenta/contenido/medios` | POST | [handler](../app/api/mi-cuenta/contenido/medios/route.ts) |
| `/api/mi-cuenta/contenido/vinculo` | POST | [handler](../app/api/mi-cuenta/contenido/vinculo/route.ts) |
| `/api/mi-cuenta/datos` | POST | [handler](../app/api/mi-cuenta/datos/route.ts) |
| `/api/mi-cuenta/eliminar` | POST | [handler](../app/api/mi-cuenta/eliminar/route.ts) |
| `/api/mi-cuenta/estado` | POST | [handler](../app/api/mi-cuenta/estado/route.ts) |
| `/api/mi-cuenta/resenas/[reviewId]` | DELETE, POST | [handler](../app/api/mi-cuenta/resenas/[reviewId]/route.ts) |
| `/api/mi-cuenta/sesiones` | POST | [handler](../app/api/mi-cuenta/sesiones/route.ts) |
| `/api/mi-cuenta/telegram/confirmar` | POST | [handler](../app/api/mi-cuenta/telegram/confirmar/route.ts) |
| `/api/mi-cuenta/telegram/desvincular` | POST | [handler](../app/api/mi-cuenta/telegram/desvincular/route.ts) |
| `/api/mi-cuenta/telegram/invitacion` | POST | [handler](../app/api/mi-cuenta/telegram/invitacion/route.ts) |
| `/api/mi-cuenta/telegram/vincular` | POST | [handler](../app/api/mi-cuenta/telegram/vincular/route.ts) |
| `/api/perfiles/[profileId]/avisos-ciudad` | POST | [handler](../app/api/perfiles/[profileId]/avisos-ciudad/route.ts) |
| `/api/perfiles/[profileId]/bloqueo` | POST, DELETE | [handler](../app/api/perfiles/[profileId]/bloqueo/route.ts) |
| `/api/perfiles/[profileId]/contacto` | POST | [handler](../app/api/perfiles/[profileId]/contacto/route.ts) |
| `/api/perfiles/[profileId]/documentos/[kind]` | GET, POST, DELETE | [handler](../app/api/perfiles/[profileId]/documentos/[kind]/route.ts) |
| `/api/perfiles/[profileId]/enviar-revision` | POST | [handler](../app/api/perfiles/[profileId]/enviar-revision/route.ts) |
| `/api/perfiles/[profileId]/exclusive-access` | POST, DELETE | [handler](../app/api/perfiles/[profileId]/exclusive-access/route.ts) |
| `/api/perfiles/[profileId]/favorito` | POST | [handler](../app/api/perfiles/[profileId]/favorito/route.ts) |
| `/api/perfiles/[profileId]/like` | POST | [handler](../app/api/perfiles/[profileId]/like/route.ts) |
| `/api/perfiles/[profileId]/media/[mediaId]` | DELETE | [handler](../app/api/perfiles/[profileId]/media/[mediaId]/route.ts) |
| `/api/perfiles/[profileId]/media` | POST | [handler](../app/api/perfiles/[profileId]/media/route.ts) |
| `/api/perfiles/[profileId]/papelera` | POST | [handler](../app/api/perfiles/[profileId]/papelera/route.ts) |
| `/api/perfiles/[profileId]/pausa` | POST | [handler](../app/api/perfiles/[profileId]/pausa/route.ts) |
| `/api/perfiles/[profileId]/reportes` | POST | [handler](../app/api/perfiles/[profileId]/reportes/route.ts) |
| `/api/perfiles/[profileId]/resenas` | GET, POST | [handler](../app/api/perfiles/[profileId]/resenas/route.ts) |
| `/api/perfiles/[profileId]` | POST | [handler](../app/api/perfiles/[profileId]/route.ts) |
| `/api/perfiles/[profileId]/visibilidad` | POST | [handler](../app/api/perfiles/[profileId]/visibilidad/route.ts) |
| `/api/perfiles/[profileId]/visualizacion` | POST | [handler](../app/api/perfiles/[profileId]/visualizacion/route.ts) |
| `/api/perfiles/nuevo` | POST | [handler](../app/api/perfiles/nuevo/route.ts) |
| `/api/presencia` | GET / POST | [handler](../app/api/presencia/route.ts) |
| `/api/reportes/[reportId]/evidencias/[evidenceId]` | GET | [handler](../app/api/reportes/[reportId]/evidencias/[evidenceId]/route.ts) |
| `/api/solicitudes-agencia/[requestId]` | POST | [handler](../app/api/solicitudes-agencia/[requestId]/route.ts) |
| `/contenido/[mediaId]` | GET | [handler](../app/contenido/[mediaId]/route.ts) |
| `/foro/adjunto/[attachmentId]` | GET | [handler](../app/foro/adjunto/[attachmentId]/route.ts) |
| `/historias/[storyId]/media` | GET | [handler](../app/historias/[storyId]/media/route.ts) |
| `/media/[mediaId]` | GET | [handler](../app/media/[mediaId]/route.ts) |
| `/muestra/[sampleId]/acceso` | POST | [handler](../app/muestra/[sampleId]/acceso/route.ts) |
| `/muestra/[sampleId]/archivo/[mediaId]` | GET | [handler](../app/muestra/[sampleId]/archivo/[mediaId]/route.ts) |
| `/noticias/media/[mediaId]` | GET | [handler](../app/noticias/media/[mediaId]/route.ts) |
| `/patrocinadores/media/[sponsorId]/[kind]` | GET | [handler](../app/patrocinadores/media/[sponsorId]/[kind]/route.ts) |

## Entradas fuera de App Router

- `worker/index.ts`: filtro de peticiones, caché, presentación, webhook Telegram y manejadores fetch/queue/scheduled/email.
- `worker/telegram.ts`: procesamiento del webhook, cola y tareas programadas de Telegram.
- `worker/moderation-mail.ts`: reenvío de correo entrante configurado.

La ausencia de una ruta en `app/api` no la convierte en un archivo público: por ejemplo, `/contenido/:id`, `/media/:id`, archivos de muestras y evidencias aplican sus controles de acceso propios.

Presencia pública (26 de octubre): `GET /api/presencia?id=…` recibe hasta 60 IDs y devuelve solamente los IDs de anuncios públicos con actividad reciente confirmada; no expone cuentas ni fechas. No renueva presencia y responde sin caché. `POST` conserva la sesión y la comprobación de origen para registrar actividad de la propia cuenta.

Actualización de muestras (25 de octubre de 2026): el parámetro público `/muestra/[sampleId]` acepta también el usuario privado corto; conserva alias por ID, acceso por fragmento/cookie y archivos privados sin indexación. La API administrativa principal incluye recuperar/compartir/conservar/revocar enlace, extender, contacto, papelera, restauración y conversión confirmada. Los endpoints de medios exigen autorización y revisión de la misma muestra.
