# Muestras, perfil compartido y controles móviles — 26 de octubre de 2026

## Cambios

- Cada tarjeta activa de `/admin/muestras` permite copiar el enlace privado. Si no existe, se crea y registra; las copias posteriores recuperan el mismo sin renovar el vencimiento. El control usa la revisión compartida vigente, mantiene la marca de estado y ofrece selección manual cuando el navegador deniega el portapapeles. La escritura diferida de ClipboardItem conserva la activación de usuario en navegadores que la exigen.
- Los filtros agrupan nombre/usuario y teléfono, región/ciudad dependientes, y un desplegable de opciones de contacto, procedencia, estado y género. Las etiquetas aplicadas permiten retirar filtros individuales y los retornos de acciones conservan la búsqueda. Papelera usa el botón con icono compartido de administración.
- Las consultas buscan los pares de campos concretos del formulario, antes del límite de resultados. El teléfono acepta prefijo de Chile, número local, espacios, paréntesis, guiones y fragmentos; busca WhatsApp y teléfono. Los valores se parametrizan y el JSON histórico inválido no rompe las búsquedas. No cambia el esquema ni requiere migración.
- El editor de muestras sigue siendo `ProfileMediaManager` con `AdminPhotoTools`: foto principal, galería, edición al seleccionar, efectos por lote, recorte, privacidad y preparación de videos. Se retira únicamente el rótulo «GALERÍA PRIVADA».
- La visualización comparte `app/perfil/[slug]/page.tsx`, `directory-root` y sus componentes con el anuncio real. Mapa, reseñas, chat, favoritos, likes, compartir, reportes y avisos de ciudad están visibles según sus datos. En muestras sus controles quedan deshabilitados; no hay envío de comentarios/mensajes, estadísticas ni antispam. La galería conserva el visor y los videos. Se retira el pie que enumeraba funciones ausentes.
- Se habilita únicamente el iframe de Google Maps necesario para la tarjeta compartida, con referrer vacío. Las páginas y archivos continúan privados, noindex/no-store; no se añaden analítica, JSON-LD público ni URLs al sitemap.
- En móvil, Favorito/Me gusta/Compartir usan una fila compacta cuando caben y pueden reordenarse al escalar texto. Se reducen las separaciones de los enlaces de seguridad/login, el espacio al terminar Servicios y la composición de Reseñas. Todos los cambios móviles viven bajo 860px; los tamaños de PC se conservan. El mismo ajuste se aplica a anuncios y muestras.

La regla de reutilizar presentación y edición compartidas queda en `AGENTS.md`. Los fixtures y archivos de QA son exclusivamente locales y desechables; no se crean cuentas de producción. La sincronización de GitHub y Cloudflare se registra por separado al publicar.

## Verificación local

Compilación correcta y ejecución final de **514 pruebas aprobadas**, sin fallos. Typecheck y ESLint de las fuentes afectadas también se verifican antes de publicar.

- Búsqueda SQLite/D1 combinada por región, ciudad, género, contacto y procedencia; teléfonos locales/internacionales y espacios especiales, entradas históricas inválidas, parámetros hostiles y filtrado antes del límite de 100.
- Copia real al portapapeles, segunda copia del mismo enlace, actualización del estado y marca de contacto inmediatamente después sin conflicto. Denegación de portapapeles con alternativa manual.
- 60 vistas responsive entre listado, filtros, anuncio y muestra, en ambos temas y 320/360/390/430/1366/1920 px. Controles privados deshabilitados, igualdad de tamaños compartidos y ausencia de solicitudes de interacciones con IDs de muestras.
- 8 vistas con medios guardados: teclado, privacidad manual, recorte, límites de orden, fotos y video. Efectos globales sobre principal y dos fotos seleccionadas, preparación de video con marca y descarte de la preparación al cambiar el efecto. Compartir → reordenar → extender conserva el enlace al recargar.
- 6 vistas móviles adicionales con Servicios poblados: separación real de 18px antes de Reseñas, acciones compactas y enlaces de login proporcionados. Mapa compartido y política restringida comprobados.

Los datos de prueba se retiran al terminar; el tema local se restaura después de cada matriz. La evidencia está en `outputs/` (ignorado).
