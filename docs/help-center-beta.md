# Centro de ayuda beta — Johnny Sins

Revisión operativa: 14 de octubre de 2026.

## Alcance actual

El chat-buscador vive en `/mi-cuenta/ayuda` y `/admin/ayuda`, con acceso desde
la navegación de cada panel. Esta primera versión no usa un modelo de IA ni
requiere un proveedor de pago. Resuelve tareas usando guías revisadas del código
actual, vocabulario equivalente, pasos y enlaces. No modifica datos ni permisos.

La base operativa está en la tabla `help_guides`, inicializada con las 46 guías
revisadas de `lib/help-knowledge.ts`. `/admin/ayuda/guias` permite crear, editar,
retirar y restaurar guías, definir audiencia, permiso, palabras clave, pasos y
destinos locales. Requiere `settings.manage`, comprueba la versión al guardar y
registra el actor en la auditoría. Los documentos históricos no se incorporan
automáticamente: varios describen reglas que ya cambiaron.

El administrador alterna las vistas «Administración» y «Usuarios normales» sin
suplantar una cuenta. La consulta SQL filtra audiencia, publicación, permisos y
guías de testers ANTES de enviar datos al navegador. La configuración
`account_help_enabled` oculta los accesos normales y devuelve 404 en la URL
directa; la ayuda administrativa sigue disponible.

## Privacidad y seguridad

- Las preguntas y valoraciones quedan solo en memoria del componente y se
  descartan al salir, recargar o empezar una conversación nueva.
- No hay llamadas a IA externa, almacenamiento de conversaciones, tickets
  automáticos ni envío del texto al WhatsApp.
- Se advierte que la beta puede equivocarse. Las dudas sin guía clara muestran
  alternativas o derivan al soporte, sin inventar respuestas.
- El servidor entrega únicamente las guías autorizadas para cada función.
  En una cuenta normal, el selector solo incluye anuncios propios no eliminados.
- Los WhatsApp se leen de la configuración vigente del portal. Abrirlos implica
  salir a un proveedor externo; el usuario redacta y envía su consulta allí.
- No deben ingresarse claves, documentos, información médica ni datos de otras
  personas. Se detectan algunos patrones evidentes, no todos los datos sensibles.

## Edición e historias administrativas

Desde cada anuncio de la lista administrativa se accede a su editor completo.
Guardar requiere `profiles.moderate`, conserva el estado y la verificación, y
registra `profile.details_update`. Las cargas de medios siguen requiriendo los
permisos de gestión de cuentas y moderación de medios existentes. Los documentos
requieren `private.view`; su acceso y cambios se registran y nunca son públicos.

Las historias administrativas requieren moderación de anuncios y, para fotos/videos,
moderación de medios. Se publican en nombre del anunciante, solo en avisos
publicados/visibles de cuentas activas: cinco textos, cinco fotos y tres videos,
24 horas, texto de 180 caracteres, fotos finales de 5 MB y videos de 12 MB/15 s.
Las fotos originales de hasta 20 MB se optimizan en el navegador, y los videos
usan la preparación de anuncios (original hasta 50 MB). La comprobación de
cupo y estado se repite atómicamente al insertar. Publicar y eliminar quedan
registrados como `story.create` y `story.delete` con identidad administrativa.
La auditoría conserva la actuación, no otra copia del archivo o cuerpo de la
historia. La limpieza de registros y objetos vencidos usa el cron existente cada
cinco minutos, por lotes seguros; fallos de almacenamiento conservan referencias
para reintentar. No depende de que otro anunciante suba una foto.

## Próximas decisiones

1. Tono y nombre público definitivo del asistente.
2. Si basta la búsqueda guiada o se desea IA generativa sobre esta base, con un
   presupuesto/cupo explícito, evaluación de proveedores y límites de gasto.
3. Si se quieren conservar preguntas no resueltas o valoraciones: requiere definir
   finalidad, consentimiento cuando corresponda, acceso, retención y eliminación.
4. Si el soporte debe abrir tickets o si se mantiene la derivación manual.
5. Revisar y mantener el catálogo desde administración cuando cambie un flujo.
