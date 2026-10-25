# Formularios, viajes y paneles: revisión del 24 y 25 de octubre de 2026

Esta revisión continúa la entrega de [formularios Escort](qa-escort-form-2026-10-24.md). Se usaron exclusivamente cuentas, anuncios y D1 locales desechables. No se crearon identidades de producción ni se ejecutaron migraciones remotas.

## Comportamiento implementado

- Horarios de disponibilidad muestra su explicación y el número de días seleccionados antes de abrir el grupo. Agenda de viajes muestra la explicación solicitada en lugar de “Opcional”.
- Los selectores de viajes ofrecen fechas desde el día actual de Chile hasta el 31 de diciembre del próximo año. El término no puede preceder al inicio. Las opciones se actualizan al volver a la pestaña y cada minuto; el envío vuelve a consultar el reloj.
- La política de servidor valida fechas reales, ciudad, orden y período, incluso para borradores. La creación y la edición revalidan antes de escribir. Si cambió el día mientras se completaba el formulario, el error pide volver a seleccionar las fechas.
- Una visita ya guardada, iniciada o terminada puede mantenerse al editar contactos o su nota. Cambiar ciudad, inicio o término exige fechas actuales. Las muestras privadas siguen editables con esa excepción; publicarlas exige fechas vigentes. El perfil público deja de anunciar viajes terminados o fechas inválidas, conservando los datos guardados.
- Agencia, Arriendo y anuncios exclusivamente digitales descartan los metadatos de viajes. No se modificaron el esquema D1 ni los permisos.
- Las fechas de viaje se restauran como estado React tras un error de servidor: los valores visibles y enviados coinciden. La revisión original del borrador se conserva; una revisión obsoleta sigue respondiendo 409 y no se actualiza automáticamente.
- Los controles históricos de nacimiento y filtros administrativos conservan sus rangos propios; el nuevo límite solo se pasa a los viajes.
- Etiquetas del formulario de los tres tipos: 16 px; ayudas y subetiquetas de fechas: 14 px. Los paneles comparten jerarquía de texto y casillas nativas de 22 px. Se corrigió un recorte de tarjetas a 320 px mediante columnas que pueden encogerse y texto que puede partirse.
- El aviso final de creación asistida tiene 20 px de separación arriba y abajo. Las acciones y la navegación pública conservan su composición.
- WhatsApp flotante se alinea a la derecha desde 1100 px. Conserva posición vertical, diálogo compartido, contenido, foco y reglas existentes bajo ese ancho.

## Verificación funcional local

Las pruebas de `travel-date-policy` cubren límites inclusivos, fechas inexistentes, años bisiestos, orden, horario de verano/invierno, medianoche y cambio de año en Santiago. Las pruebas SQLite usan los triggers reales de revisión y comprueban que el rechazo no escriba parcialmente, que una edición de contactos preserve aprobación y que las muestras antiguas sigan legibles y editables.

La comprobación de navegador cubre la selección de fechas, recuperación tras error, fecha histórica de nacimiento y filtros, apertura de los grupos anidados ante errores y cambio simulado de día. Al cruzar medianoche, el envío se detiene, aparece un aviso legible con foco y se conservan los otros datos. Las peticiones manuales con fechas pasadas o del año posterior al permitido se rechazan sin modificar el anuncio. Una revisión obsoleta devuelve 409 sin sobrescribir datos.

`node scripts/qa-escort-form.mjs` comprueba creación y edición por propietario y administración, contactos, género/etiquetas, idiomas, horarios, origen y revisiones. La revisión complementaria de Agencia y Arriendo cubre cuatro creaciones normales/asistidas, datos específicos, horarios, precios, preservación de aprobación al editar contactos y rechazo de revisiones antiguas.

## Portada y editor administrativo

El encuadre del arte de la portada clásica se alinea arriba desde 1100 px, conservando su altura y tipografía. Se inspeccionaron 1536, 1920, 2560 y 3440 px; los anchos 1536/2560 equivalen al espacio de composición de una pantalla de 1920 px a zoom 125/75 %. La cabeza queda completa y el encabezado no se superpone al arte. Esta comprobación usa anchos equivalentes, no afirma pruebas de zoom nativo ni de un iPhone físico.

La nota de activación progresiva se elimina mediante `coverageNote` vacío, omitiendo también su párrafo. La descripción de Cobertura territorial pasa a “Explora escorts, agencias y arriendos por región y ciudad para encontrar anuncios en la zona que te interesa.” El acento del título regional pasa a “ciudades para explorar.” Los campos siguen editables desde Contenido → Textos y SEO de los home, separados del SEO, H1 y CTA. La prueba real del editor guardó una descripción personalizada, comprobó su lectura pública y luego guardó la nueva descripción en ambos diseños.

Los ajustes efectivos viven en los dos documentos JSON `home_content_classic`/`home_content_compact` de D1. Cambiar valores predeterminados del código no reemplaza esos documentos. La sincronización de esta entrega actualiza únicamente tres propiedades por diseño y conserva las otras 41, con comprobación de revisión, snapshots completos y reservas activas. El Worker incluye la revisión de ajustes en la clave de caché pública; los cambios no dependen de esperar diez minutos.

## Espacios e identidad de las tarjetas administrativas

El enlace al perfil de GitHub usa el ícono SVG compartido de enlace externo. Las secciones de correo y datos de cuenta se separan; los textos de Telegram e historial tienen espacio antes de sus estados vacíos y después de ellos. La coordinación de revisión del listado de cuentas queda dentro de cada tarjeta, conservando el recurso, la revisión y todos sus formularios en el mismo `ReviewScope`. Los cuatro metadatos usan altura natural y columnas ajustables, sin el alto mínimo anterior.

El aviso de privacidad conserva la frase sobre cookies necesarias, sus dos decisiones y el enlace a la política, retirando la explicación larga solicitada. La altura ya era automática y se ajusta al texto restante: 283 px a 320 px de ancho, 255 px a 390 px y 194 px en escritorio. No cambian la persistencia, la reapertura ni la revocación del consentimiento.

## Matrices comprobadas

- Paneles: 200 vistas iniciales de 24 rutas, roles propietario, cuenta nueva y administración, ambos temas y anchos 320, 360, 390, 430, 1366, 1920 y 2560 según la ruta. Se detectó y corrigió el recorte de tarjetas de propietario a 320 px; la comprobación final volvió a medir esa ruta en ambos temas.
- Formularios: 40 grupos de comprobaciones funcionales de ambos temas, incluidas selección de Agencia/Arriendo, descripciones cerradas, días seleccionados, límites de fechas, restauración, foco, cambio de día, menús móviles y separación del aviso de creación asistida.
- Portada, perfil y WhatsApp: 96 vistas de ambos temas y diseños, entre 320 y 3440 px, incluidos 1099/1100 px. Posición fija al desplazar, diálogo, foco, Escape y tabulación correctos. Cuatro estados adicionales comprueban visitas terminadas, actuales, futuras e inválidas.
- Editor de portada: ida y vuelta de guardado, 24 vistas públicas y 30 vistas privadas finales; sin desbordamientos ni errores JavaScript. Los rails de historias conservan su desplazamiento horizontal intencional.
- Últimas capturas administrativas: 18 vistas de tres rutas, ambos temas y anchos 320, 390 y 1366 px; espacios medidos de 20/16 px, íconos SVG y revisión dentro de la tarjeta. Tomar y liberar la revisión funciona en ambos temas, sin alterar datos de cuenta ni dejar reservas.
- Privacidad: ocho vistas, ambos temas y anchos 320, 390, 1366 y 1920 px; acciones visibles y sin desbordamientos. Se comprobó guardar, reabrir, aceptar y revocar; las solicitudes a Google se bloquearon en el navegador de pruebas.

Estos resultados corresponden a rutas y estados probados; no constituyen una auditoría de cada pantalla, proveedor externo ni dato de producción. La publicación se comprueba por separado mediante commit, checks, versión activa y lectura pública.

## Comprobación final

`pnpm test` completó la compilación de producción y **475 pruebas**, sin fallos ni omisiones. Typecheck, ESLint de los archivos afectados, comprobación de documentación y revisión de archivos de publicación también pasaron. Las cuentas de QA y sus anuncios se eliminaron de D1 local y los servicios de prueba se detuvieron. No hubo migraciones de esquema ni cambios de dependencias.
