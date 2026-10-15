# Trabajo simultáneo y recuperación de pantallas — 15 octubre 2026

## Alcance

La coordinación se aplica a cualquier administrador según sus permisos reales, no a una lista de nombres: edición y moderación de anuncios, galerías públicas y exclusivas, datos/estado/eliminación de cuentas, papelera y configuración del portal. Las autorizaciones existentes siguen comprobándose en el servidor. No se modifica la identidad GitHub, ni se convierte una cuenta normal en administrativa.

Cada formulario conserva la versión que se revisó. Un guard en una transacción D1 comprueba esa versión y la reserva antes de ejecutar todos los cambios relacionados. Si falla, responde 409 y revierte el lote completo. No se reintenta automáticamente ni se sobrescriben los campos escritos. Las modificaciones del anunciante invalidan la revisión mediante triggers; no se bloquea al anunciante por una reserva del equipo.

“Tomar revisión” reserva el registro durante dos minutos. Se renueva cada 30 segundos mientras la pestaña está visible, se libera al salir cuando la red lo permite y caduca aunque se cierre el navegador. La reserva ayuda a coordinar, pero la comprobación transaccional es la garantía contra escrituras antiguas. Los contadores y avisos se actualizan sin recargar formularios, con pausa en pestañas ocultas y espera progresiva ante fallos.

La aprobación de una misma versión solo puede aceptarse una vez; un segundo envío no vuelve a ejecutar el correo de aprobación. Esto no promete entrega exactamente una vez ante fallos de un proveedor externo. Foro, noticias, patrocinadores y las decisiones de reportes mantienen sus flujos actuales; no se presentan como completamente versionados.

La excepción visual `@b` se vincula exclusivamente al ID administrativo de Benjamín. Autenticación, permisos, auditoría y atribución histórica conservan su identidad real. Los demás administradores mantienen su usuario GitHub.

## Pantallas negras

El cálculo global de almacenamiento utilizaba ocho SELECT unidos. SQLite de escritorio aceptaba la consulta, pero D1 la rechazaba por el límite de términos de SELECT compuesto. En una respuesta RSC en streaming podía ocurrir después del HTTP 200, por eso comprobar solo el código HTTP no detectaba el fallo. Ahora se ejecutan ocho agregados separados en un único lote D1 y se suman sus resultados; se conservan todas las fuentes de almacenamiento.

Se añaden límites de error para el panel administrativo, páginas normales y layout raíz, con referencia de diagnóstico y acciones de recuperación. La recuperación advierte comprobar si un guardado ya ocurrió antes de repetirlo. Los registros de render no incluyen cuerpo, cookies, parámetros de consulta ni parámetros SQL. Los conflictos esperados no se registran como fallos de almacenamiento.

La comprobación real detectó también una carrera entre dos despliegues: una pestaña podía recibir el documento anterior y solicitar un chunk ya reemplazado. Se añade una recuperación inline, sin dependencias de React ni archivos externos, para una página vacía persistente o un arranque detenido por un script fallido. Solo ofrece recarga manual; no lee datos de formularios, cookies o almacenamiento y no repite peticiones. Las pestañas ocultas no se revisan. El bootstrap también cubre una caída del propio chunk del límite de error.

## Migración y despliegue

Aplicar **solo** `drizzle/0056_admin_collaboration.sql` una vez, después de comprobar `pragma_table_info` y `sqlite_master`. No ejecutar ciegamente todas las migraciones históricas sobre una base donde 0052–0055 ya se aplicaron manualmente.

```powershell
npx wrangler d1 execute chile3x-db --remote --file drizzle/0056_admin_collaboration.sql
```

La migración es aditiva: versiones, reservas, guard y triggers. No publica, elimina ni cambia la moderación de anuncios existentes. Desplegar el nuevo Worker después de la migración. Si fuera necesario volver al Worker anterior, conservar estas columnas/tablas; no intentar una reversión destructiva de datos. Las pestañas abiertas antes del despliegue deben recargarse una vez para obtener los nuevos formularios versionados.

## Verificación reproducible

- `node --experimental-strip-types --test tests/*.test.mjs`: transacciones reales SQLite, carrera de guardados, rollback, edición del dueño, reservas, caducidad, rechazo de replay y un solo correo de aprobación en la ruta real con proveedor simulado.
- `scripts/qa-account-moderation.mjs`: fixtures temporales y proxies exclusivamente loopback; nunca copiar sesiones de producción.
- `node scripts/qa-collaboration-flow.mjs`: Worker/D1/R2 local reales, carrera de subidas, renovación de reserva, archivos del dueño pendientes y eliminación de los objetos temporales.
- `node scripts/qa-panel-render.mjs`: 52 rutas derivadas de los archivos del proyecto; busca también errores RSC en respuestas HTTP 200. La revisión de navegador comprueba la hidratación y la ausencia de desbordes en móvil y escritorio.
- Tipado, lint y compilación antes de publicar. Confirmar con GET las dos URLs reales reportadas por QA después del despliegue, sin modificar sus anuncios.
