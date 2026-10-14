# Centro de ayuda beta — Johnny Sins

Revisión operativa: 13 de octubre de 2026.

## Alcance actual

El chat-buscador vive en `/mi-cuenta/ayuda` y `/admin/ayuda`, con acceso desde
la navegación de cada panel. Esta primera versión no usa un modelo de IA ni
requiere un proveedor de pago. Resuelve tareas usando guías revisadas del código
actual, vocabulario equivalente, pasos y enlaces. No modifica datos ni permisos.

La base está en `lib/help-knowledge.ts`. Los documentos históricos del producto
no se incorporan automáticamente: varios describen reglas que ya cambiaron.
Actualizar esta base forma parte de modificar un flujo operativo. Las pruebas
comprueban permisos, destinos, consultas habituales y políticas de medios.

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

Las historias administrativas requieren moderación de anuncios y, para imágenes,
moderación de medios. Se publican en nombre del anunciante, solo en avisos
publicados/visibles de cuentas activas, con el mismo límite de cinco por tipo,
24 horas, texto de 180 caracteres e imágenes válidas de 2 MB. La comprobación de
cupo y estado se repite atómicamente al insertar. Publicar y eliminar quedan
registrados como `story.create` y `story.delete` con identidad administrativa.

## Próximas decisiones

1. Tono y nombre público definitivo del asistente.
2. Si basta la búsqueda guiada o se desea IA generativa sobre esta base, con un
   presupuesto/cupo explícito, evaluación de proveedores y límites de gasto.
3. Si se quieren conservar preguntas no resueltas o valoraciones: requiere definir
   finalidad, consentimiento cuando corresponda, acceso, retención y eliminación.
4. Si el soporte debe abrir tickets o si se mantiene la derivación manual.
5. Si las guías deben editarse desde administración, con versión, revisión y
   registro de cambios, o seguir dentro del repositorio.
