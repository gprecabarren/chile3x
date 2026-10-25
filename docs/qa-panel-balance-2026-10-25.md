# Equilibrio de paneles móviles — 25 de octubre de 2026

Esta corrección continúa [la revisión anterior](qa-paneles-viajes-2026-10-24.md) y aplica la aclaración del propietario: reducir tamaños y espacios solo en móvil. En PC se conservan las proporciones anteriores, salvo el espacio entre estadísticas e historial administrativo y el botón de cierre de sesión.

## Cambios

- Las correcciones privadas móviles están dentro de `max-width:860px` en `app/public-mobile.css`, con ancestros explícitos de administración o cuenta. Las reglas públicas existentes conservan exactamente sus selectores y declaraciones.
- Jerarquía móvil: texto principal y etiquetas de 14 px, texto secundario de 13 px, metadatos de 12 px, estados de 11,5 px con ancho intrínseco. “Activa” mide aproximadamente 58 × 23,5 px y no ocupa una fila completa por estiramiento.
- Los títulos principales usan 28 px y los de sección/tarjeta, 22/20 px. Se revisaron además sesiones, visibilidad del anuncio, agencias, Telegram, medios, reportes y patrocinadores. Las cifras de estadísticas conservan su jerarquía como métricas.
- Se moderaron rellenos y separaciones de tarjetas. La creación asistida deja 16 px entre su encabezado y las acciones superiores, frente a los 53 px conservados en PC.
- Inputs, selects y textareas mantienen 16 px para evitar zoom de foco en iPhone. Las acciones conservan objetivos mínimos de 44 px y las casillas usan figuras de 20 px con sus etiquetas pulsables.
- En PC, el historial queda a 24 px del bloque de estadísticas. El cierre de sesión administrativo recupera 12 px y una sola línea a tamaño de texto normal; mantiene 44 px de alto y permite reflujo al ampliar texto.
- La ayuda de viajes queda en “Selecciona fechas desde hoy, según la hora de Chile.” Se conserva toda la validación de fechas de cliente y servidor.

## Verificación local

La matriz principal cubrió **320 vistas de paneles** en ambos temas, con anchos 320, 360, 390, 430, 768, 860, 1366, 1920, 2560 y 3440 px según la ruta. Incluye cuentas, configuración, correo, actividad, medios, contenido, formularios de creación y edición con perfiles de los tres tipos, y las superficies del propietario. No hubo desbordamientos de viewport ni errores JavaScript.

Otras **108 comprobaciones focalizadas** midieron las separaciones, la línea del botón de salida, el límite 860/861 px, los títulos de las tarjetas pendientes y el texto abreviado de viajes. Se probaron también ambos diseños públicos, ambos temas y cabeceras con/sin sesión entre 320 y 3440 px, sin cambios en la composición pública.

Las mediciones de 320/390 px corresponden a ventanas responsive; no se presentan como una prueba física en Safari/iPhone. Las capturas locales fueron inspeccionadas y se usaron únicamente fixtures desechables, sin cuentas ficticias de producción.

Las pruebas de límites responsive se adaptaron para permitir las nuevas reglas privadas explícitamente solicitadas: un parser comprueba su confinamiento al breakpoint correspondiente y mantiene las restricciones de navegación pública. No se agregaron dependencias ni migraciones.

La compilación de producción y las **475 pruebas** pasaron, sin fallos ni omisiones. Typecheck, ESLint de los archivos afectados y las comprobaciones de documentación/publicación también pasaron. Los fixtures locales se eliminaron y sus servidores se detuvieron. La publicación se verifica por separado mediante el commit y la versión activa.
