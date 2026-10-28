# Sesiones de GitHub y creadores de muestras — 28 de octubre de 2026

## Cierre de sesión y reintento

La entrega anterior añadió el selector en el enlace explícito de reintento. La entrada administrativa normal aún podía reutilizar la sesión abierta en GitHub. Cerrar la sesión de Chile3X no cierra la sesión de un dominio externo, y las cookies temporales de OAuth tampoco se descartaban en todos los cierres del sitio.

- Todo inicio de OAuth administrativo solicita `prompt=select_account`, también después de un cierre normal.
- Elegir otra cuenta en la pantalla de rechazo realiza un POST de mismo origen. Revoca únicamente las credenciales del navegador presentadas, conserva otras sesiones/dispositivos y elimina las cookies de sesión y las dos cookies OAuth con su ruta correcta.
- El reintento pasa por una pantalla local con navegación nueva a GitHub y enlace de respaldo. La prueba en navegador detectó que encadenar directamente la redirección del POST hacia el proveedor era bloqueado por `form-action 'self'`; se conserva esa protección.
- Se mantiene la clave necesaria para coordinar pestañas, que no autentica a una persona. No se borran preferencias del sitio ni se modifica la autorización administrativa.
- Los intentos antiguos siguen rechazados por estado OAuth. Visitar una pantalla de error no cierra automáticamente una sesión válida; cambiar de cuenta requiere la acción explícita.

## Creador de muestras

El dato ya existía en `private_profile_samples.created_by`; faltaba presentarlo y permitir buscar por él. Ahora cada tarjeta muestra el usuario administrativo resuelto, y el filtro desplegable `Creada por` usa su ID estable. Se combina en SQL con los filtros actuales antes del límite de resultados y conserva la selección al entrar a papelera o volver de una acción.

Las opciones incluyen cuentas activas cuyo nivel permite crear muestras, incluso sin muestras previas. Los autores históricos se conservan con la indicación `sin acceso actual`; no se les concede acceso. Si una identidad histórica carece de usuario recuperable, se muestra `Usuario no disponible` en lugar de inventar un nombre. El listado no expone correos administrativos en las opciones del filtro.

La corrección visual de Administradores da 12 px de separación a la edición de nivel y sus acciones, conservando el tamaño de los controles. La estructura identifica explícitamente el formulario de nivel, sin depender de que sea el primer hijo de la tarjeta.

## Verificación

- Pruebas de handlers/SQLite: cierre y cambio de cuenta, origen no válido, borrado de cookies OAuth con su ruta, preservación de otra sesión, selector en entrada normal, creador con/sin muestras, capacidades, revocación, cambio de login, combinación de filtros, papelera, datos inválidos y filtrado previo al límite con más de 100 filas irrelevantes.
- Navegador: sesión desechable local, reintento hacia GitHub con estado nuevo, intento anterior rechazado, eliminación de la credencial local y conservación de otro dispositivo. No se introdujeron credenciales reales de GitHub ni se crearon cuentas en producción.
- Diseño: ambos temas, controles nativos, foco, filtros acumulados, retornos y acciones del administrador en móvil y escritorio. Las comprobaciones se realizan con anchos de navegador; no acreditan una prueba física en iPhone.

La matriz visual comprende **104 vistas** en ambos temas y anchos 320, 360, 390, 430, 621, 768, 860, 1024, 1099, 1366, 1920, 2560 y 3440 px. Incluye filtros/autor, acciones de administradores y acceso denegado con/sin sesión. Se verificaron además el envío real del formulario de filtros, quitar solo un criterio, conservar selección tras cambiar contacto y navegar a papelera, y un creador sin resultados.

La compilación y la batería completa terminaron con **569 pruebas aprobadas, sin fallos**. TypeScript, ESLint de los archivos afectados y la revisión de archivos de publicación aprobaron. Se eliminaron las muestras y cuentas desechables locales, se detuvieron desarrollo/proxies y se retiró la configuración efímera antes de la compilación final.

Las capturas, fixtures y salidas quedan fuera de Git. La compilación, batería completa y publicación se verifican por separado. No se necesitan migraciones ni cambios de permisos para esta entrega. El commit debe enviarse a GitHub antes del despliegue automático de Workers Builds; comprobar checks y versión activa y registrar el SHA junto a la versión de Cloudflare.
