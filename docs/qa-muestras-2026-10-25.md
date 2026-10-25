# Revisión de muestras privadas — 25 de octubre de 2026

## Resultado implementado

`/admin/muestras` muestra nombre, edad, género, ciudad, usuario privado, procedencia, estado y fechas. Incluye WhatsApp directo, marca manual de contacto y acceso a Papelera. Contactar por WhatsApp no marca automáticamente al posible anunciante: el administrador confirma el contacto, que queda fechado y atribuido. Los pendientes aparecen primero; los filtros combinan nombre/usuario, procedencia, estado y contacto.

Cada muestra conserva un usuario corto estable. Los enlaces recuperables se guardan cifrados con AES-GCM y autenticación del ID de la muestra. Recuperar/copiar conserva el enlace y el vencimiento; extender es una acción separada. Los enlaces heredados vigentes siguen funcionando por su ID original. Si solo existe su hash no se puede reconstruir el secreto: el panel permite guardar el enlace completo anterior o generar uno persistente conservando el anterior vigente. Revocar invalida todos los accesos.

La muestra vence a los 7 días y aparece en Papelera, con restauración y eliminación explícita. Restaurar concede 7 días nuevos y conserva el enlace salvo revocación. El mantenimiento elimina tras 30 días en papelera y comprueba nuevamente el estado para respetar restauraciones concurrentes. Las muestras convertidas se retienen 30 días; sus archivos ya pertenecen al anuncio y no se eliminan por limpiar la muestra.

El editor ocupa todo el ancho disponible en PC. Los controles y tarjetas siguen la escala móvil de los paneles. La galería reutiliza el mismo `ProfileMediaManager` y `AdminPhotoTools` que los anuncios: recorte, foto principal, privacidad facial, marcas de agua, videos, edición guardada, orden y eliminación. La foto principal anterior se conserva en galería. R2 mantiene solo el archivo final; la conversión conserva las opciones de edición sin copiar objetos.

Convertir exige una cuenta activa con correo confirmado y aceptación del anunciante. Si ya tiene un Escort, se muestra una advertencia con confirmación administrativa específica para esa cuenta. La transacción vuelve a comprobar ID, revisión, cantidad de anuncios, revisión de la muestra, caducidad y reserva. La excepción autoriza exclusivamente el nuevo anuncio; no concede un cupo ilimitado al usuario ni verificación de identidad/médica. Cambiar de propietario consume esa excepción y evita reutilizarla mediante una secuencia de papelera y restauración. Creación, edición, contacto, enlaces, papelera, conversión y medios se registran en la actividad administrativa.

## Datos, privacidad y rutas

Migración aditiva `0064_private_sample_workflow.sql`: usuario corto, enlace cifrado/hash heredado, procedencia, papelera y contacto en `private_profile_samples`; excepción acotada en `profiles`; revisión al actualizar medios y guardas del límite Escort. El esquema tipado contiene 92 tablas, 813 columnas y 105 claves foráneas; hay 65 archivos SQL. Estos conteos describen el código.

Nuevas rutas dedicadas: POST/PATCH `/api/admin/muestras/:id/media`, PATCH/DELETE `/media/:mediaId` y GET/POST `/media/:mediaId/procesar`. Incluyen límites de carga en el Worker. Se mantienen `/muestra/:usuario` y los alias antiguos por ID, sus cookies privadas y archivos con rangos de video. Las muestras continúan fuera del sitemap, sin canonical público, analítica ni datos estructurados públicos, y con `noindex`, `noimageindex` y `no-store`.

La clave de cifrado se deriva con dominio independiente de la clave protegida del servidor ya configurada. No se añadieron credenciales al repositorio, tokens a auditoría ni cuentas ficticias de producción. Las pruebas funcionales usan exclusivamente fixtures locales desechables.

## Verificación

`pnpm test` terminó con compilación correcta y **511 pruebas aprobadas**, sin fallos. Typecheck y ESLint de los archivos afectados también aprobaron. Los fixtures locales y sus archivos fueron retirados al terminar.

- Pruebas SQLite/D1 de migración, límites, transacciones, concurrencia, transferencia, auditoría y retención.
- Pruebas de API de enlace persistente, recuperación, adopción heredada, revocación, contacto y permisos.
- Pruebas de medios con SQLite/R2: cuotas, portada, orden, edición, reservas, caducidad durante carga y respuestas inciertas sin borrar archivos confirmados; videos dentro/fuera de duración admitida y límites multipart.
- 18 comprobaciones del flujo HTTP local, incluyendo archivo real de 2,4 MB, rango de 16 bytes, cookie privada, enlaces por usuario/ID y conversión adicional confirmada.
- 70 vistas de listado/papelera/contactados/nueva/detalle, ambos temas, 320/360/390/430/1366/1920/2560 px. Editor desplegado a ancho completo, filtros nativos y foco; sin desbordamientos ni errores JavaScript. Dos vistas móviles adicionales verifican pestañas compactas y nombre largo. Otras ocho vistas con fotos y video reales (ambos temas, 320/390/1366/1920 px) comprobaron carga 200/206, editor guardado, privacidad manual, recorte, teclado y límites deshabilitados. El recorrido desde los botones compartir → reordenar → extender → recargar recuperó el mismo enlace.

La evidencia técnica local se conserva en `outputs/` (ignorado). La sincronización de GitHub, migración efectiva y versión activa de Cloudflare se verifica y comunica por separado al publicar; estas comprobaciones locales no la sustituyen.
