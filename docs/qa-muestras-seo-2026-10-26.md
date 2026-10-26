# Muestras, perfiles e indexación — 26 de octubre de 2026

Esta revisión continúa la entrega `8931cf9`. Describe cambios y comprobaciones dirigidas; no certifica la ausencia de errores en todo el sitio. La publicación sigue una única ruta: commit y push a GitHub, Workers Builds y comprobación de la versión activa. No requiere migración ni cambios de credenciales.

## Cambios

- Anuncios y muestras mantienen `ProfileMediaManager` y `AdminPhotoTools`: principal, galería, edición, recorte, efectos individuales y por lote, privacidad y videos. Las tarjetas comparten una anchura mínima de 260px cuando cabe y acciones completas; desaparece la compresión que partía botones en numerosas líneas. El bloque de muestras se llama «Galería pública de muestra»; su autorización y almacenamiento siguen privados.
- Copiar enlace y WhatsApp quedan agrupados. La papelera ofrece eliminación definitiva visible, con confirmación explícita, desde listado y detalle. Conserva la concurrencia y la auditoría; un trabajo de limpieza repetido no invalida la operación y un objeto compartido con otro anuncio/muestra no se borra.
- El logo de Arsmate se sirve desde el propio sitio. Su anterior origen externo quedaba bloqueado por la política de imágenes de las muestras. Se preserva esa política restrictiva.
- Gestión de comentarios queda dentro de Reseñas, tanto para administración como para el propietario. Se reduce el espacio antes de ese bloque y se alinea la acción del aviso de ciudad a la derecha. En móvil se oculta el texto redundante del contacto de WhatsApp sin perder el nombre accesible.
- La presencia conserva la ventana de tres minutos y recibe actualización por lotes, sin caché, para evitar etiquetas antiguas provenientes del HTML almacenado. Solo confirma anuncios públicos de cuentas activas; las muestras no participan. No significa disponibilidad de atención.
- Las guías locales se distribuyen en dos columnas de escritorio y cuatro cuando el espacio lo permite. Se reemplaza el párrafo sobre términos de búsqueda por información útil para comparar anuncios y confirmar servicios, ubicación y disponibilidad. Se conservan títulos locales, enlaces, jerarquía, canónicas y política de robots.

## Search Console y comprobación HTTP

Se consultó la sesión autorizada de Search Console, además de revisar el código y las respuestas públicas. El informe general mostraba actualización del **18 de octubre**, por lo que no equivale al estado de cada URL inspeccionada el día 26.

| URL o grupo | Resultado verificado | Interpretación |
| --- | --- | --- |
| `https://chile3x.cl/` | Inspección: está en Google e indexada; último rastreo 25 de octubre, obtención correcta e indexación permitida. Canónica declarada y seleccionada: la portada HTTPS sin www. | La portada principal sí está indexada. |
| `http://chile3x.cl/`, `https://www.chile3x.cl/`, `http://www.chile3x.cl/` | Redirección 308 en un salto a la portada canónica. | Son variantes que deben redirigir; no necesitan indexarse por separado. La validación histórica con error no demuestra que la canónica esté excluida. |
| `/escorts/lo-barnechea` | Índice: rastreada sin indexar, último rastreo 30 de agosto. Prueba publicada del 26: disponible para Google y se puede indexar. HTTP 200, canónica propia e inclusión en sitemap. | El estado histórico sigue pendiente de un nuevo rastreo y decisión de Google; disponibilidad técnica no garantiza indexación. |
| `/ingresar?return_to=…` | `noindex`, canónica de acceso. | Exclusión deliberada de una pantalla de sesión. |
| `/favicon.ico` | HTTP 200, icono válido. | Recurso del sitio, no página de contenido que deba aparecer como resultado. |
| Dos medios de historias QA antiguas | HTTP 404. | Archivos retirados; no se crean redirecciones engañosas a la portada. |
| `/assets/` | Normaliza a `/assets`, sin página de directorio pública. | No debe indexarse como contenido. Los archivos reales de assets conservan sus respuestas propias. |

El sitemap público examinado contiene **60 URLs**, sin duplicados, consultas, dominios ajenos ni páginas privadas; incluye portada y Lo Barnechea. En Search Console figura **Correcto**, con última lectura el 22 de octubre y 57 páginas descubiertas entonces; ese recuento fechado no debe confundirse con el contenido actual. Las muestras, accesos y APIs permanecen excluidos. Se preservan la clasificación adulta y los controles de edad; no se introduce un acceso especial basado únicamente en el User-Agent.

El ZIP entregado corresponde a rendimiento, no a cobertura de indexación. Entre el 30 de julio y el 24 de octubre registra 2085 clics y 20782 impresiones; 1928 clics provienen de móviles. La portada registra 77 clics y 334 impresiones; Lo Barnechea, 10 impresiones. Estos datos históricos no sustituyen la inspección actual. El archivo original y sus consultas no se incluyen en el repositorio.

Referencias contrastadas: [canónicas y redirecciones](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [interpretación de indexación](https://support.google.com/webmasters/answer/7440203?hl=es), [404 sin sustituto](https://support.google.com/webmasters/answer/2445990?hl=en), [contenido útil](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) y [sitios con contenido explícito](https://developers.google.com/search/docs/specialty/explicit/guidelines).

## Verificación local

- Galería real y muestra pobladas con principal, cuatro fotografías y un video: 16 vistas, ambos temas, 320/390/1366/1920px; mismas columnas y anchuras, acciones legibles y sin desbordamiento. Se comprobaron efectos por lote, guardado, recorte y video.
- Perfil: ocho vistas de ambos temas y dos adicionales de propietario; gestión dentro de reseñas, separación de 18px móvil/24px escritorio, aviso alineado, cierre de WhatsApp con Escape y retorno de foco. Siete contactos de muestra visibles e inactivos; el logo local carga dentro de la CSP privada.
- Papelera: eliminación desde la interfaz, cancelación, confirmación requerida, recibo y auditoría. Un archivo transferido a un anuncio real sigue accesible después de eliminar su muestra; la conversión a una cuenta con Escort exige confirmación adicional.
- Listado y confirmación de papelera a 320/390/1366/1920px en ambos temas: copia real y estable del enlace, separación de 10px respecto de WhatsApp, foco y validación accesibles, sin desbordamientos.
- Presencia: entrada a la cuenta registra heartbeat y la etiqueta aparece para un visitante en perfil de PC, móvil y catálogo; las muestras no hacen peticiones de presencia ni muestran esa etiqueta.
- Guías y portada: 32 vistas, ambos temas, guías a 320/360/390/430/1366/1920/2560/3440px y ambos diseños de portada a los cuatro anchos de escritorio; sin desbordamiento ni errores de página.
- Pruebas de servidor sobre borrado, referencias compartidas, revisiones y auditoría; presencia con actividad, caducidad, propietarios desactivados y lotes; verificación de assets y contratos de presentación.

Compilación y batería completa: **519 pruebas aprobadas**, sin fallos; TypeScript, ESLint de los archivos afectados, enlaces del traspaso y comprobación de higiene de publicación aprobados. Se retiraron los fixtures y sus 17 objetos locales de R2, además de los procesos y la configuración efímera de esta comprobación.

Las pruebas usan únicamente fixtures locales desechables. Las comprobaciones de producción son lecturas y pruebas de Google sobre URLs públicas; no se crean cuentas de prueba en producción.
