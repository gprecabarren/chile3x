# Recorte de videos e invitaciones administrativas — 28 de octubre de 2026

## Cambios

- Anuncios de cuenta normal, administración y muestras usan el mismo `ProfileMediaManager` y `VideoTrimEditor`. Se puede elegir inicio y final, mover ambos puntos, restablecer y reproducir el fragmento antes de prepararlo y confirmar su carga. Un original largo comienza con una selección de sus primeros 15 segundos.
- La preparación en el dispositivo recorta video y audio con transcodificación cuando es necesaria para respetar los puntos elegidos; conserva sonido y opciones de marca de agua. Cambiar el recorte o la marca descarta la preparación anterior. Un original corto compatible sin efectos conserva sus bytes.
- Se mantienen los límites de 50 MB de original, 15 segundos y 12 MB de resultado, tres videos por anuncio/muestra, cancelación, validación real del contenedor en servidor y almacenamiento de una sola versión final. No se añaden servicios externos, archivos intermedios en R2 ni transcodificación en Workers. Los videos guardados previamente no se modifican automáticamente.
- La pantalla de acceso denegado permite elegir otra cuenta de GitHub cuando no hay sesión administrativa. Una sesión vigente conserva el regreso al panel. Las reglas de permiso por sección permanecen: gestionar administradores corresponde al propietario protegido.
- Se distingue usuario real de GitHub y nombre visible. Al invitar se valida formato de usuario/correo y existencia de una cuenta personal; organizaciones, cuentas inexistentes y fallos de consulta bloquean el guardado con un mensaje específico. El formulario conserva lo escrito ante errores.
- Un perfil público de GitHub no permite confirmar un correo privado ni demostrar su titularidad. Esa comprobación sigue en el callback autenticado con `/user/emails`, correo verificado y concesión activa. Antes de esta entrega ya existían esas barreras de autorización; aceptar un dato equivocado en una invitación no acreditaba un acceso administrativo.
- El propietario puede corregir el usuario de una invitación sin primer ingreso. El servidor conserva correo/nivel, verifica nuevamente la cuenta y rechaza formularios antiguos o identidades vinculadas. El historial registra antes/después como `admin.grant_login_correct`. Los fallos de OAuth identifican su categoría y usuario público, sin registrar correos, códigos ni tokens.
- El formulario de administradores alinea campos y ayudas, separa el prefijo `@`, elimina el doble borde y mantiene foco visible, controles nativos y tamaños proporcionados en ambos temas.

## Verificación

Las pruebas de rutas ejecutan los handlers reales con SQLite y dependencias aisladas: invitación válida/incorrecta, usuario inexistente, organización, indisponibilidad de GitHub, selección de cuenta, OAuth válido con correo privado verificado, cuenta distinta, concesión revocada, ID diferente y correo no verificado. También comprueban permisos y corrección de invitación sin alterar correo/nivel. No usan identidades ni credenciales reales.

La comprobación visual local cubre 80 vistas: formulario de administradores, acceso denegado y recorte en los tres contextos, ambos temas y anchos 320, 360, 390, 430, 1366, 1920, 2560 y 3440 px. Se comprueban desbordamiento, alineación de campos, foco, controles y nombres de archivo. Son anchos de navegador de escritorio; no equivalen a una prueba física en Safari/iPhone.

Con un original real de 23 segundos se preparó y cargó un fragmento de 5 a 12 segundos en los tres contextos. El servidor aceptó archivos H.264/AAC de aproximadamente 7 segundos con inicio de pistas en cero, audio conservado y tamaño inferior a 12 MB. La cuenta normal dejó su archivo en revisión; administración y muestra lo guardaron aprobado. La comparación de fotograma contrasta el inicio del resultado con el segundo elegido del original. Elegir archivos y generar vistas previas no los guarda.

La comprobación adicional cubre un original corto compatible con hash idéntico, selección hasta el final de un original largo, nombres extensos, invalidación al cambiar marca de agua, cancelación y rechazo de un contenedor inválido. Ninguna preparación de esa comprobación generó una petición de carga.

Las salidas de ejecución, capturas y fixtures permanecen fuera del repositorio. El reporte de compilación/pruebas y la sincronización de publicación se registran por separado. No se incluyen datos privados del incidente en este documento, ni se afirma que una prueba aislada equivale al ingreso real de la persona afectada.

La compilación y batería completa finalizaron con **564 pruebas aprobadas, sin fallos**. TypeScript y ESLint de los archivos afectados aprobaron. Se retiraron mediante las APIs locales los medios, muestra y cuentas desechables; se detuvieron desarrollo/proxies y se eliminó la configuración efímera de QA antes de la compilación final.

## Publicación

Enviar el código probado a `main` mediante commit y push; Workers Builds es el único camino de publicación. Verificar los checks de ese SHA y la versión activa de Cloudflare al 100 %, y registrar ambos en la evidencia local de entrega. La corrección de una invitación concreta es un cambio de datos administrativos separado del despliegue de código, y debe verificarse en su tarjeta e historial.
