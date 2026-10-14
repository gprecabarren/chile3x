# Correos globales y correcciones administrativas — 14/10/2026

## Historial

`/admin/correos` registra todos los envíos realizados por el servicio central `sendPortalEmail`, incluidos verificación, recuperación de contraseña, aprobación de anuncios, bloqueo de cuenta, alertas de ciudad y notificaciones generales. Los destinatarios pueden ser usuarios, administradores, propietarios u otras direcciones. No se filtra por el administrador que abre la vista. Las notificaciones internas de `admin_notifications` no son correos y no se presentan como tales.

Se inicia un registro antes de preparar/enviar el correo y se finaliza con el resultado. Si el proceso se interrumpe, el estado queda sin confirmar: no existe reenvío automático desde el historial. Se conserva el intento del relay principal y el alternativo, sus códigos acotados y el ID del servicio si lo entrega. Se mantiene la ruta de envío ya configurada, sin habilitar servicios pagados ni cambiar dominios o credenciales.

La respuesta positiva de un proveedor significa aceptación técnica, no lectura ni entrega en la bandeja principal. El panel no inventa esos resultados. El binding de Cloudflare devuelve un `messageId`, no confirmación de lectura: [referencia oficial](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).

Datos registrados: destinatario normalizado, cuenta asociada si existe, clasificación de destinatario, asunto limitado, tipo, fechas, duración, resultado e intentos. No se guardan cuerpos HTML/texto, acciones, enlaces de recuperación, tokens ni errores crudos. Se retiran URLs de asuntos. Las direcciones reservadas `.invalid` se registran como omitidas y nunca se pasan al proveedor.

Acceso: exige conjuntamente gestión de cuentas, auditoría y datos privados. Propietarios y administradores completos lo tienen; moderadores, editores, soporte y cuentas normales no. El servidor aplica estos controles antes de consultar filas y el menú usa la misma política. Hay búsqueda por correo/asunto/ID, filtros de tipo, resultado, audiencia, proveedor, período y fechas de Santiago; paginación SQL de 25 registros y recuentos del conjunto filtrado. El filtro de proveedor incluye intentos alternativos y no solo el servicio final.

La tabla aditiva `email_delivery_logs` se incorpora en la migración 0051. Historial desde la activación, sin backfill ficticio: los eventos operativos anteriores no registraron destinatarios. Los diagnósticos antiguos siguen en el resumen administrativo. Conservación ordinaria de 90 días, limpieza acotada en el cron existente y eliminación de registros asociados al borrar definitivamente una cuenta. Política de privacidad actualizada con la descripción técnica, sin cambiar responsables ni afirmar nuevas obligaciones legales.

## Acceso administrativo

Las causas de callback vencido o comunicación fallida se distinguen de ausencia de autorización. Un callback repetido con sesión administrativa válida vuelve al panel; no crea ni amplía permisos. Una página antigua de denegación comprueba el grant y, si la sesión sigue autorizada y no se trata de un permiso específico, muestra acceso confirmado y retoma el panel tras hidratar. Se mantiene un enlace de retorno si JavaScript no está disponible.

Se evitó una redirección de página dependiente de query durante el probe de vinext: este probe puede recibir parámetros vacíos y absorber equivocadamente una denegación específica. Los avisos `reason=permission` continúan visibles, sin restaurar acceso a rutas prohibidas. El retorno de OAuth no permite volver a la propia página de denegación. La auditoría de inicio se registra después de crear la sesión.

## Vista móvil

Los accesos de cada anuncio administrativo usan una cuadrícula con anchos reales y textos normales: editar y previsualizar destacados, las demás acciones en dos columnas, una columna en pantallas de hasta 360 px. No cambian los paneles de usuarios. Se retira el flex-basis vertical que dejaba un vacío entre el nombre y los botones al apilar el encabezado.

## Verificación

Pruebas con proveedores simulados, almacenamiento SQLite/D1 real y registros exclusivamente locales: aceptación principal, alternativa tras fallo, ambas fallidas, tiempo agotado, destinatario inválido, test omitido, servicio ausente, error de preparación, privacidad, clasificación de propietarios, eliminación en cascada, filtros de intentos y permisos. Se comprueba la vista compilada en PC y móvil y el retorno de sesión en el navegador. No se envían correos reales de QA ni se modifica a Lalita o anuncios pendientes.
