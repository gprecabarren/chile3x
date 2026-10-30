# Carga múltiple, pasos del gestor y acciones de muestras — 30 de octubre de 2026

## Implementación

- `ProfileMediaManager` sigue siendo el gestor único para muestras y anuncios Escort, Agencia y Arriendo, desde cuenta normal o administración. La foto de perfil acepta una imagen; las galerías aceptan varias fotos o varios videos por selección o arrastre. Soltar en el encabezado del gestor distribuye una selección mixta entre ambas galerías; soltar dentro de un paso respeta su tipo.
- `useMediaFileDrop` comparte el comportamiento de arrastre con la biblioteca exclusiva. Evita que un archivo soltado dentro del gestor abra otra página, señala la zona de destino y bloquea nuevas selecciones durante procesos o cuando el almacenamiento está bloqueado. Los arrastres de texto/enlaces no se interceptan.
- `selectGalleryFiles` aplica las mismas reglas a selector y arrastre: formatos originales, tamaño de origen, tipo de sección y suma de archivos guardados y pendientes. No sustituye la validación de firmas, duración, permisos o cuotas en servidor.
- Elegir/soltar prepara una selección local, sin subirla. Las acciones de enviar/guardar aparecen arriba y abajo de cada selección. Fotos y videos se confirman por separado; los éxitos se retiran de la cola y los fallos conservan el archivo con su explicación.
- El gestor público identifica los pasos 1 (principal), 2 (fotos) y 3 (videos). La selección de fotos usa una o dos columnas según el espacio disponible, con un máximo de dos y al menos 360 px por tarjeta cuando son dos. Mantiene recorte, privacidad facial, efectos masivos, moderación y orden de archivos guardados.
- Las herramientas para fotos guardadas explican cuándo se habilitan y dónde ajustar las fotos seleccionadas sin subir. Una vista previa preparada explica que «Ver resultado completo» abre la foto con los efectos, todavía sin subirla.
- `ExclusiveContentManager` separa fotos y videos privados, incluida su selección y material guardado. Comparte la validación de selección y el editor `VideoTrimEditor` con la galería pública; su preparación usa el mismo módulo de video. Conserva los límites de 20 fotos/4 videos, el endpoint de contenido exclusivo, moderación y autorización por cuenta. La biblioteca privada se identifica como una sección independiente.
- El listado de muestras añade «Ver muestra» junto a «Copiar enlace»: abre la presentación administrativa en otra pestaña sin generar ni rotar el enlace privado. «Convertir en anuncio real» está cerrado inicialmente en un desplegable independiente debajo de «Editar datos de la muestra». Ambas instancias conservan las revisiones mediante los eventos de confirmación propios.

No se añaden rutas, permisos, migraciones ni escrituras públicas. Los archivos de muestras siguen privados y noindex. Las verificaciones y registros de cambios de las APIs existentes siguen vigentes. La selección y las vistas previas locales no son cambios de datos que deban registrarse en la auditoría.

## Verificación local

- Build y 583 pruebas de `pnpm test` correctos, incluidos seis casos nuevos de selección: múltiples archivos, selección mixta, sección incorrecta, cupos acumulados, límites de biblioteca privada, fuentes vacías/excesivas/no finitas y nombres sin MIME. Typecheck y ESLint de los archivos afectados correctos.
- Navegador real: carga de varias fotos y varios videos mediante arrastre; ninguna petición de subida antes de confirmar; botones superiores/inferiores; rechazo de formatos, tamaños y sección incorrecta; conservación de la otra cola; respuesta y moderación correctas en muestra, editor administrativo, gestión de medios de cuenta, cuenta anunciante y biblioteca privada.
- Conversión: posición y estado cerrado, error visible para destinatario inexistente, revisión compartida después de obtener el enlace y confirmación adicional cuando la cuenta ya tiene un Escort. «Ver muestra» abre otra pestaña y conserva noindex.
- Fallo parcial simulado de carga privada: mensaje visible, archivo fallido retenido, éxito retirado y reintento que envía únicamente el pendiente. El arrastre durante una carga queda bloqueado.
- Video privado: original de más de 15 segundos recortado a 2 segundos y otro fragmento de 1,5 segundos; duraciones finales verificadas en los contenedores enviados. El titular puede leer los archivos pendientes con caché privada; el visitante recibe 404.
- API privada: 401 sin sesión, 403 por origen ajeno y 400 para imagen falsa, archivo vacío y video final mayor de 15 segundos. Ninguna fila creada por esos rechazos.
- Matriz visual de 80 combinaciones: cinco superficies, ambos temas y anchos 320, 360, 390, 430, 768, 1366, 1920 y 2560. Sin desbordamiento horizontal ni controles fuera del viewport; una/dos columnas verificadas por geometría. Revisión adicional de la biblioteca privada después de compartir el recorte de video.
- Comprobación complementaria de Agencia/Arriendo desde titular y administración a 320/1366 en ambos temas. Recorte, difuminado manual y vista preparada comprobados en muestras a 320/1366/3440; todas las fotos guardadas cargan al recorrerlas, incluidas las que se cargan al desplazarse.
- Las herramientas de fotos guardadas permanecen deshabilitadas con una selección sin subir y se habilitan tras confirmar el guardado.

Las pruebas utilizan exclusivamente cuentas, archivos y datos desechables locales. Las capturas, registros y credenciales de las sesiones QA quedan en `outputs/` ignorado por Git. El incidente de Benjamin, sin una reproducción concreta del botón sin respuesta, sigue pendiente de investigación; estas pruebas no demuestran su causa ni su resolución.

## Comprobación manual después de publicar

1. En una muestra y en un anuncio de cuenta normal, arrastrar dos fotos al paso 2 y dos videos al paso 3. Comprobar que todavía no se guardaron; quitar un archivo, cambiar sus opciones y confirmar cada sección con sus botones superior/inferior.
2. Arrastrar varias fotos sobre la foto de perfil: debe explicar que solo admite una portada. Arrastrar un video sobre Fotos: debe rechazarlo indicando la sección correcta. Comprobar que los selectores habituales siguen funcionando.
3. Preparar el resultado de una foto y abrir «Ver resultado completo». Debe mostrar los efectos aplicados. En escritorio suficientemente ancho deben caber dos tarjetas; en móvil deben reorganizarse sin cortes.
4. En un anuncio sin fotos guardadas, leer el aviso de herramientas masivas. Seleccionar una foto no las habilita; confirmar la subida sí. Verificar la moderación posterior cuando la carga pertenece a un usuario normal.
5. En Mi contenido, seleccionar/arrastrar varias fotos y varios videos privados. Confirmar que se separan, que se puede recortar cada video y que enviar fotos conserva los videos pendientes. Comprobar el acceso privado con otra sesión sin autorización.
6. Desde `/admin/muestras`, abrir «Ver muestra», copiar su enlace y volver a entrar: el enlace debe conservarse. En el detalle, abrir la conversión debajo de Editar datos y comprobar sus requisitos antes de una conversión real autorizada.

La publicación se verifica por separado: SHA enviado a GitHub, sus comprobaciones y versión activa de Cloudflare. El resultado del build local no acredita por sí solo un despliegue.
