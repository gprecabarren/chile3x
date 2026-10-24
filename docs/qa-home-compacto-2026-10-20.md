# Bloque de ubicación más compacto — 20 de octubre de 2026

## Alcance

Únicamente CSS del bloque de ubicación del home y sus pruebas. Sin cambios en componentes, llamadas, cookies, preferencias, enlaces, contenido SEO, permisos ni datos.

## Causa y corrección

El selector global `.home-location-summary > div:not(.home-location-actions)` tenía mayor especificidad que `.home-discovery-controls .home-location-heading`, por lo que imponía un `gap` de 2 px. El nuevo selector incluye el contenedor y el hijo directo para prevalecer en todos los tamaños.

- Escritorio: separación real de 16 px entre el círculo y el texto.
- A partir de 1024 px: ancho máximo de 960 px, identidad de ciudad dimensionada al contenido y acciones en una fila. La región ocupa el espacio restante, sin la gran separación vacía anterior.
- Menos padding y separación vertical; se conserva la navegación a otras ciudades debajo.
- Móvil: continúa el diseño apilado y el desplazamiento de -4 px del círculo. El círculo incluye el borde dentro de sus dimensiones.

## Verificación y evidencia

Historia comprobada: home → resumen de ciudad → selector de ciudades desplegable y salto de región, conservando las preferencias existentes. Los controles no incorporan nuevas peticiones ni nuevos accesos a datos.

- Compilación de producción correcta. Persiste el aviso previo de chunks de más de 500 kB.
- 360 pruebas correctas; ESLint de pruebas y comprobación publicada sin errores.
- Chrome local: 1440, 1024, 900, 768, 760, 390 y 320 px. Sin desbordes; acciones y selector de región permanecen dentro del bloque.
- Ciudad seleccionada Caldera: en escritorio el bloque mide 960 × 133,2 px y el espacio icono/texto es 16 px. Sin selección, 960 × 107,2 px.
- Selector desplegado a 320 px: 36 enlaces, estado expandido correcto, sin desbordes internos ni de página.
- Captura de PC de la compilación desplegada: `outputs/home-ubicacion-compacta-pc-vista-20261020.png`. Una captura posterior recortada agotó el tiempo de espera; la validación responsive se apoya también en medidas del DOM.
- `scripts/qa-home-discovery-live.mjs` confirma el CSS compacto y el espacio de 16 px servido por el dominio, el home correcto y la conservación de noindex/no-store y exclusión de sitemap en `/admin`.

## Publicación

Worker `chile3x`, versión `f8f72501-eeba-4a5f-89c3-4dca5e569f6c`.
El despliegue cambió un único asset estático CSS y conservó variables, bindings, cola y cron. Sin migraciones.
