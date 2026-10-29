# Marca de agua masiva y galerías separadas — 29 de octubre de 2026

## Causa y cambio

El control global usaba una función limitada a fotos que excluía explícitamente los videos. La marca individual de video sí llegaba a `prepareVideo`, por lo que ambos caminos producían resultados distintos. La función compartida `gallery-media-options` incluye ahora ambos formatos para marca de agua y conserva la exclusión de videos para difuminado facial.

Cambiar la marca invalida la preparación anterior y vuelve al original del video, manteniendo inicio/final. Así se evita enviar una vista previa sin el efecto solicitado o incorporar dos marcas al procesar una copia ya marcada. No cambiar la opción conserva su preparación; los archivos completados permanecen intactos.

`ProfileMediaManager` muestra foto principal, fotos de galería y videos de galería. Cada tipo tiene selector y confirmación propios, con sus límites existentes. La marca global incluye principal y todos los archivos seleccionados; videos tiene además su propio control masivo. Las herramientas de fotos guardadas permanecen junto a fotos. El reordenamiento de muestras funciona dentro de cada tipo y sigue enviando el orden completo al servidor.

Anuncios Escort, Agencia, Arriendo y muestras siguen usando el mismo componente y preparación. No hay nuevas rutas, tablas ni objetos originales adicionales. Se conservan permisos, reservas/revisiones, auditoría administrativa, moderación normal, noindex y acceso privado de muestras. Los efectos ya incorporados en videos guardados no se pueden retirar sin volver a subir un original limpio.

## Verificación

Se usan exclusivamente cuentas, muestras y medios desechables locales. La comprobación en navegador carga fotos y dos videos, prepara un fragmento, aplica la marca global, comprueba la invalidación y conserva su recorte. También prueba quitar/agregar marcas desde el control de videos y compara el camino masivo con el individual. Cada contexto confirma únicamente sus videos, dejando fotos seleccionadas sin enviar: cuenta normal queda pendiente; administración y muestra guardan aprobado.

La comparación de fotogramas da diferencia cero entre marca masiva e individual, y entre el video inicialmente sin marca y el resultado al quitarla desde el original. Los tres contextos conservan el fragmento de dos segundos elegido sobre un original de 23 segundos. Se confirmó la carga real de dos videos por contexto, seis en total, y su eliminación posterior por las APIs locales.

La revisión responsive cubre 70 vistas de ambos temas: muestras, administración y cuenta normal en 320, 360, 390, 430, 768, 1366, 1920, 2560 y 3440 px; también Agencia/Arriendo en cuenta y administración a 320/1366 px. Se comprueban ausencia de desbordamiento horizontal, nombres largos, controles de cada tipo, foco y estados deshabilitados. Son pruebas de navegador de escritorio con distintos anchos, no una ejecución física en Safari/iPhone.

Las comprobaciones adicionales rechazan fotos en el selector de videos y viceversa, verifican cupos independientes y confirman que subir fotos conserva la selección de videos en los tres contextos. El reordenamiento de fotos de muestra conserva la posición de sus videos. La marca masiva de fotos guardadas sigue preparando principal y galería sin alterar videos.

La compilación y batería completa aprobaron con 570 pruebas sin fallos, incluidos cambios de marca, conservación del original/recorte, aislamiento del difuminado y cargas completadas. TypeScript, ESLint de los archivos afectados y la revisión de archivos de publicación aprobaron.

Los medios y muestra desechables se retiraron por sus endpoints locales; posteriormente se eliminaron las cuentas de QA y se detuvieron desarrollo/proxies. No se crearon cuentas ni se editaron medios de producción.

Las capturas, videos finales, métricas y evidencia de publicación se conservan en `outputs/`, fuera de Git. El resultado local no acredita por sí mismo un despliegue; la entrega requiere commit/push, checks del mismo SHA y versión activa de Cloudflare verificada.
