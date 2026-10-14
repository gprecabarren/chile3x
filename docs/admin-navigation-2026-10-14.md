# Navegación lateral de administración

Solo cambia `AdminShell` (panel administrativo y foro privado), no el panel de
cuentas normales ni el directorio público. La lista de secciones y sus contadores
sigue filtrada por capacidades en el servidor. No se alteran roles ni permisos.

En escritorio desde 1100 px: lateral de 256 px, abierta inicialmente, con
hamburguesa para contraerla. En pantallas menores: menú cerrado inicialmente,
apertura lateral con fondo atenuado, ancho máximo 300 px y navegación con scroll
propio. Identidad y cierre de sesión permanecen al pie, sin salir del lateral.
El logo enlaza al sitio público y el distintivo ADMIN es un enlace independiente
al resumen `/admin`, separado visualmente de la imagen.

Sección activa por ruta (sin marcar Resumen en todos sus descendientes), iconos,
etiquetas beta y contadores mantenidos. No se precargan páginas al mostrar el
menú. Escape, cierre exterior y selección de una sección lo cierran; el menú
móvil limita Tab a sus controles, aísla el fondo con inert y devuelve el foco a
la hamburguesa. El scroll de la página se restaura al cerrar.

QA: 256 pruebas automatizadas, TypeScript, ESLint, compilación y verificaciones
HTTP locales de autorización (cuenta normal denegada, soporte sin enlaces de
medios/cuentas/configuración/foro). Inspección visual y de navegación a 1440 y
390 px: contraer/abrir, Anuncios activo, ADMIN vuelve al resumen, teclado y
ausencia de desbordamiento lateral. No sustituye pruebas con un iPhone físico.
