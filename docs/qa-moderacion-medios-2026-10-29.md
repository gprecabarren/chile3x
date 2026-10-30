# Moderación de archivos desde previsualización y editores — 29 de octubre de 2026

## Causas verificadas

La aprobación masiva de la previsualización estaba fuera de `ReviewScope` y no enviaba `review_key`/`review_revision`. El servidor rechazaba el formulario aunque no hubiera otro administrador conectado; sin la clave tampoco lo interceptaba `AdminCollaboration`, y la navegación terminaba mostrando JSON. Los editores ofrecían carga/edición/eliminación pero carecían de acciones de aprobación. Además, la consulta de previsualización administrativa solo incluía pendientes mientras el anuncio no fuera público: publicar cambiaba la selección a archivos aprobados y ocultaba los pendientes, sin borrarlos.

Una consulta de solo lectura del incidente confirmó un anuncio publicado con tres archivos registrados pendientes. No se cambió la aprobación ni la publicación de esa cuenta. Los datos del incidente, identificadores, consultas y evidencias privadas permanecen fuera del repositorio.

## Corrección

Los formularios de aprobación masiva e individual llevan revisión explícita. Los destinos permitidos incluyen únicamente Medios, la ficha y los editores correspondientes al anuncio; se conserva el contexto `return_to`. Las respuestas JSON sirven a las acciones interceptadas y los conflictos de formularios nativos regresan con un aviso legible. No se reintentan escrituras automáticamente ni se eliminan las comprobaciones de revisión/reserva.

`ProfileMediaManager` recibe acciones de moderación de servidor en principal, fotos y videos, además de aprobación conjunta. Las acciones usan los endpoints existentes de Medios y su auditoría. El rol Moderación puede revisar desde el editor sin obtener permisos de carga ni de cuentas. `PublicMediaCard` se comparte con el panel de Medios. Las muestras siguen su aprobación administrativa automática y no muestran estos controles.

La vista administrativa incluye pendientes antes y después de publicar, usa los mismos grupos lógicos de fotos que el editor y explica que solo administración ve esos pendientes. La aprobación conjunta corresponde a los archivos mostrados. Las peticiones normales y visitantes conservan únicamente material aprobado, controles de acceso de archivos y SEO público; la variante administrativa queda noindex.

La aprobación conjunta de una edición pendiente conserva el ID público de su base aprobada, sustituye sus bytes finales y retira la fila pendiente, igual que la aprobación individual. La normalización de principal y las aprobaciones se ejecutan en una transacción con revisión y validación del conjunto. Las bases temporales no consumen el límite de archivos lógicos revisados. No se publican anuncios, documentos privados ni contenido exclusivo como efecto de aprobar la galería.

## Pruebas manuales reproducibles

1. Abrir la previsualización de un anuncio pendiente con principal, galería y video pendientes. Revisarlos, marcar la confirmación y aprobar todos: debe regresar a la misma ficha, conservar el filtro administrativo de retorno y mantener el anuncio pendiente de publicación.
2. Con otro anuncio de prueba, publicarlo antes de aprobar archivos: administración debe seguir viendo sus pendientes; una ventana sin sesión no debe mostrarlos. Aprobar después y comprobar la vista pública.
3. Desde Editar anuncio y Gestionar fotos y videos, aprobar un archivo y devolverlo a revisión. Comprobar que cambia solo ese archivo, que la aprobación masiva funciona y que cada acción vuelve al editor correspondiente.
4. En dos pestañas del mismo administrador, abrir una revisión y cambiar el anuncio en la otra. La pestaña antigua debe avisar del conflicto sin mostrar JSON ni aprobar/borrar nada; tras actualizar y revisar de nuevo, debe permitir aprobar.
5. Revisar una edición pendiente de foto ya aprobada: aprobarla individualmente o en lote debe conservar su posición y referencia pública, sin duplicarla ni perder la principal.

Los fixtures y archivos de QA son locales y desechables. Las capturas y resultados de publicación se registran en `outputs/`, fuera de Git. Las pruebas de navegador a distintos anchos no equivalen a ejecutar Safari en un iPhone físico.

## Resultado de QA

La compilación y batería completa aprobaron con 577 pruebas, más la comprobación dirigida de una galería de 14 archivos lógicos con 23 filas por bases pendientes. Se probaron seis recorridos funcionales en navegador, moderación sin permiso de cuentas/carga y 48 vistas en ambos temas (320, 360, 390, 430, 768, 1366, 1920 y 2560 px). Se verificaron retorno al contexto, aprobación antes/después de publicar, aprobación/devolución individual, falta de exposición pública de pendientes y conflicto por cambios del mismo actor. TypeScript y ESLint de archivos afectados aprobaron. Los fixtures se eliminaron al terminar; no se aprobaron archivos de la cuenta real durante QA.
