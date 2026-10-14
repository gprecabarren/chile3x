# Historias y paneles — QA del 14 de octubre de 2026

## Datos de prueba en producción

No se crearon cuentas ni anuncios nuevos. El inventario inicial tenía 46 anuncios:
27 demos precargados, 17 adicionales, Lalita y uno en papelera.
La instrucción inicial se interpretó como todos salvo Lalita; al aclararse que
los 12 pendientes eran solicitudes reales, se restauraron inmediatamente desde
el respaldo. Se comprobó igualdad exacta de sus datos y relaciones originales,
sin publicación ni historias. La corrección quedó registrada en la auditoría.

Estado final del conjunto: 32 anuncios ya publicados configurados como pruebas,
12 pendientes restaurados, Lalita intacta y papelera intacta. Los 32 anuncios de
QA tienen descripción explícita, campos públicos variados, contactos ficticios
no operativos, verificación retirada y marcador de prueba/noindex. No se cambió
ninguna foto de perfil, galería ni documento existente. Los contactos usan
ejemplos; no sirven para probar la entrega de WhatsApp o correos.

Se publicaron 320 historias: 160 fotos y 160 textos. Cinco rondas entre los 32
anuncios, alternando foto/texto, con cinco de cada tipo por anuncio y 24 horas
de vigencia. Las fotos neutras provienen de Lorem Picsum; sus autores y fuentes
se conservaron en el respaldo y en los movimientos de QA. Un fallo transitorio
de almacenamiento se recuperó mediante PUT idempotente, sin duplicar registros.

El respaldo y SQL de restauración quedan únicamente en la carpeta ignorada
`tmp/qa-directory-2026-10-14-b201c812/`, no en Git ni en el sitio público.
El script ahora prepara solamente anuncios publicados marcados como demo;
no vuelve a incluir solicitudes pendientes de visitantes.

## Implementación y comprobaciones

- Ayuda beta en ambos paneles: guías filtradas por permisos, pasos y enlaces,
  preguntas no persistentes, aviso de errores y soporte oficial configurado.
  Es búsqueda guiada, no IA generativa ni un proveedor nuevo de pago.
- Editor administrativo completo, documentos privados por autorización y
  publicaciones de historias con actor administrativo registrado.
- Historias: cinco textos (180 caracteres), cinco fotos (final 5 MB, original
  20 MB) y tres videos (final 12 MB, 15 segundos, original 50 MB).
- Fotos optimizadas en el navegador; videos usan la preparación de anuncios,
  con marca de agua opcional. Solo se almacena la versión final.
- Prueba local con H.264/AAC real: siete solicitudes simultáneas entre dueño y
  administrador aceptaron tres videos; ocho solicitudes de texto aceptaron cinco.
  El resto recibió errores de límite. Lectura de video por rangos: HTTP 206.
- Se probaron formato falso, texto excesivo, permisos, CSRF, identidad del actor,
  conservación del estado del anuncio, errores de cuota y respuestas de proxy.
- Visor móvil y PC: imagen completa, video reproducible, pausa, avance al terminar,
  cierre, restauración del desplazamiento y ausencia de desbordes. Formularios
  con una columna móvil y distribución de dos columnas en escritorio.
- Expiran públicamente a las 24 horas. El cron existente, cada cinco minutos,
  elimina registros y archivos vencidos por lotes. Prueba con el Worker local:
  se retiraron tres registros y se confirmó que la foto y el video ya no estaban
  en R2. Si falla almacenamiento, se conserva el puntero para reintentar.

El borrado del almacenamiento activo no promete eliminación instantánea de
copias de recuperación del proveedor. La auditoría conserva la actuación, no
duplica archivos ni el contenido de las historias nuevas.

## Documentación legal

La evaluación de Privacidad/Términos está en `legal-review-2026-10-13.md`.
Se recomienda una actualización puntual de ayuda beta, asistencia administrativa,
temporalidad, separación de revisión de medios y del anuncio, versión/fecha,
responsable y conservación real. No se publicaron modificaciones contractuales.
