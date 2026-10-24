# Administración, guardado y fotos — 23 octubre 2026

## Cambios

- «Contenido del sitio» agrupa Noticias, Sitios asociados, Términos y privacidad, y FAQ y reglas. Las rutas anteriores se conservan; los permisos se filtran en el servidor y cada editor sigue autorizando sus propias peticiones. Administración y previsualizaciones continúan autenticadas, noindex y sin caché pública.
- «Ver cuenta» y «Ver / previsualizar anuncio» quedan juntos en una fila flexible, sin un botón aislado a mitad del encabezado.
- El ingreso de usuarios incorpora mostrar/ocultar contraseña, con nombre accesible, estado pulsado y un control de 46 px alineado con el campo.
- Fecha de nacimiento compartida: más ancho para año y mes, selección nativa, controles de 46 px y distribución en dos columnas en pantallas estrechas. Tipo y número de documento quedan alineados en escritorio.
- Herramientas de marca y rostros disponibles para la foto principal y las fotos de galería, individualmente o en lote. Preparan vistas previas antes de confirmar y conservan el estado de moderación.

## Almacenamiento elegido por el propietario

Solo se conserva la versión final de cada archivo en R2. No se guarda una copia original adicional ni se cambia el texto legal publicado. La tabla provisional de bases privadas se descartó vacía antes de desplegar la funcionalidad.

Mientras el editor permanece abierto, la foto de partida queda temporalmente en la memoria del navegador: permite deshacer efectos nuevos, preparar otra vista previa y confirmar de nuevo. No usa localStorage ni IndexedDB para conservar fotos. Al recargar/cerrar, un efecto ya incrustado necesita una copia limpia para poder quitarlo. El difuminado manual permite elegir y ajustar zonas; no garantiza anonimato. Los efectos no se aplican automáticamente sin revisión.

La preparación de fotos se hace en el navegador. El Worker inspecciona solo la firma del archivo, usa escritura por flujo hacia R2, conserva validaciones de tamaño y permisos, y sustituye la versión anterior. Una cola durable reintenta borrados fallidos; no es una función de respaldo ni de restauración. El contenido anterior no se sirve después del cambio de referencia en D1.

## Guardados y colaboración

Cada formulario revisado incluye una versión del registro. La comprobación y los cambios dependientes se realizan en una sola transacción: dos administradores no pueden sobrescribir silenciosamente la misma versión. Las cargas propias avanzan la versión local sin confundirlas con cambios externos. Una respuesta antigua de una comprobación no vuelve a marcar obsoleta una versión propia más reciente.

En formularios AJAX, el POST confirma la redirección con JSON; cargar la página siguiente es una petición separada. Si la respuesta se pierde después de guardar, un comprobante transaccional, privado del administrador que hizo el cambio, permite distinguir un guardado confirmado de uno incierto. Expira a las 24 horas y se limpia en lotes limitados durante la tarea programada. No se repiten automáticamente operaciones inciertas ni se da por entregado un correo por el mero comprobante del registro.

Cloudflare mostró peticiones `exceededCpu`, CPU 10 ms y HTTP 503, incluidas cargas de medios y el perfil público. El plan gratuito se mantiene por decisión del propietario. Las reducciones de copias de archivos y renderizados posteriores evitan trabajo innecesario; no garantizan cero errores 1102 con ese límite.

## Estados del anuncio

| Visible | Código | Efecto |
|---|---|---|
| Publicado | approved | Puede aparecer públicamente si la cuenta sigue activa, no está oculto por el propietario y no está en papelera. |
| Borrador | draft | Conservado para edición; no público. |
| Vencido | expired | Retirado de las consultas públicas; no borra el anuncio ni lo republica automáticamente. |
| Pausado | paused | No público; conserva contenido para una reanudación permitida. |
| En revisión | pending | Espera moderación; no público. |
| Rechazado | rejected | Requiere corrección/revisión; no público. |

La publicación, verificación de identidad, revisión médica y aprobación de archivos son controles separados. Publicar el anuncio no aprueba todas sus fotos. Cambiar el estado no elimina datos. Editar como administrador conserva el estado actual; ciertos cambios relevantes del propietario pueden volver a revisión. Las historias requieren un anuncio publicado y visible. El marcado Vencido no implica por sí solo un vencimiento automático por fecha; no existe un proceso general que cambie anuncios a ese estado según un plazo fijo.

## Verificación

- 391 pruebas automáticas aprobadas, compilación, comprobación TypeScript y lint de los cambios.
- Recorridos locales con identidades desechables: carga de foto principal/galería, vistas previas por lote, confirmación, difuminado manual y deshacer desde la pestaña.
- Administración, cuenta y páginas públicas: 25 páginas sin errores de renderizado en la comprobación local.
- Tema clásico y Liquid Glass; fecha de nacimiento a 320, 360, 375, 390, 412, 430, 768 y 1440 px, sin desbordamientos. Ojo alineado a 320, 390 y escritorio; controles táctiles y menús conservados.
- Emulación iPhone 16e (390×844, DPR 3), no prueba en Safari físico. Acceso anónimo/usuario normal denegado a la fuente protegida de edición; administración autorizada con no-store/noindex.
- Liquid Glass sigue siendo un recurso exclusivo del tema activo. Versión nueva del CSS, sin filtros extra ni preloads en clásico.

## Limpieza solicitada

Eliminados de D1 activo 15 anuncios En revisión y de R2 sus 18 archivos asociados. Se conservaron 23 anuncios publicados y 60 cuentas. No se creó un export ni respaldo. No quedan en la papelera. Cloudflare puede conservar registros históricos o respaldos propios que no se pueden purgar selectivamente por anuncio mediante esta limpieza.

## Comparación visual solicitada

Despliegue comprobado: `94a846f8-cc17-4154-a8da-899a0aa3df3a`. Home y perfil público respondieron HTTP 200; administración anónima redirige con noindex. El ingreso real muestra el nuevo control «Mostrar contraseña» y el tema clásico no carga la hoja Liquid Glass. No se crearon cuentas de producción para QA; se retiraron las identidades, fotos y procesos locales de prueba.

Kuchitril usa DM Sans y botones tipo píldora (radio 999 px), con más aire y un tratamiento de agencia. Hostal Piffre usa Manrope y radios pequeños de 4–5 px, con crema/verde y jerarquía editorial. Chile3X usa Manrope con controles oscuros, bordes más visibles, acciones rojas e iconos, y una interfaz mucho más densa por sus formularios y paneles. La diferencia no es una limitación de la tecnología ni de la fuente: la producen los estilos, espaciado, jerarquía y consistencia del sistema visual. No se hizo un rediseño global adicional sin autorización.
