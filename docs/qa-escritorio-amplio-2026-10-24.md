# Composición pública amplia para PC

## Contrato visual

La composición principal se activa a partir de **1100 px de ancho CSS**. El ancho útil es fluido, con márgenes de 24–80 px y un límite de 3200 px para monitores ultrawide. Header, ciudades, catálogo, historias, ambas portadas y footer comparten los mismos tokens de borde.

El espacio adicional se usa para más columnas, no para ampliar los controles:

- Tarjetas de perfil entre 208 y 252 px; `auto-fill` conserva las columnas cuando hay pocos resultados.
- Con actividad visible se midieron 4 columnas a 1366 px, 6 a 1920, 9 a 2560 y 12 a 3440/3840. Sin actividad hay más espacio para columnas. La cantidad real depende del ancho disponible, no de una cuota fija de resultados.
- El número de cada sección queda a 12 px de su título; el control de plegado permanece a la derecha.
- Navegación del header distribuida en filas reales. No se usa scroll horizontal ni se recorta contenido para ocultar errores.
- Selectores, búsqueda, botones y textos extensos mantienen límites razonables. Los textos legales/artículos conservan su medida de lectura.
- Historias y actividad se probaron con contenido presente. Las barras de desplazamiento de esas listas —no de la navegación— siguen funcionando con un estilo discreto.

Los controles de teléfono no se modifican. Entre 621 y 1099 px hay una protección de reflow: el menú de edad se ancla a todo el buscador y la actividad deja de ser sticky, evitando desplazamientos fuera de pantalla al usar zoom en PC.

## Imágenes, rendimiento y SEO

Se conservan las URL originales, `unoptimized`, proporción 4:5 y `object-fit:scale-down`. No se introduce blur ni escalado CSS de las fotografías. El zoom del navegador necesariamente amplía los píxeles: no se promete nitidez ilimitada si el archivo original tiene poca resolución.

No se cambia el límite de resultados ni se añaden consultas, JavaScript, fuentes, efectos de vidrio o peticiones por componente. Se conserva la carga diferida de imágenes. Más columnas pueden hacer visibles y cargar más fotografías simultáneamente; no se compensa bajando su calidad.

El recurso Glass v4 y su selección condicional permanecen intactos. El nuevo CSS es compartido por ambos temas y usa el hash de compilación habitual. No cambian títulos, H1, textos públicos, URLs, canonicals, robots, JSON-LD, seguridad ni permisos. El plan de Cloudflare no cambia.

## Validación

- Build y TypeScript correctos; **422 pruebas automáticas aprobadas**.
- ESLint sin errores; permanece un aviso anterior de navegación en `ProfileSafetyActions.tsx`.
- 32 comparaciones de estructura, anchos, fuentes, columnas y padding en 320/390/768/1024 px, ambos temas y ambas portadas, sin diferencias. Se excluye de la comparación de estilos la altura variable de badges externos del footer; no es una comparación de capturas idénticas píxel a píxel.
- 32 comprobaciones de páginas/composición en 1366/1920/2560/3840 px sin desbordes ni solapamientos de los controles revisados.
- 24 comprobaciones de cabeceras: visitante, usuario y administrador, en ambos temas.
- 80 comprobaciones de reflow equivalentes a anchos de zoom de 50–500 %, más límites de breakpoints y anchos de 5464/7680 px equivalentes a reducir zoom hasta 25 % en pantallas comunes.
- Menú de edad abierto a 683 px dentro de la pantalla; selector de ciudades, filtros y categorías vacías/con un solo resultado revisados.
- Visor de historia de texto probado en 320/390/683/1366/1920 px, incluyendo cierre, pausa y acción deshabilitada.
- Once rutas locales verificadas: 200, un H1, canonical y sin excepción de renderizado.

Las pruebas de zoom utilizan el **ancho CSS equivalente**, no automatización del zoom nativo ni un ensayo físico en cada navegador. Tampoco se afirma una medición nueva de Core Web Vitals. La revisión usa fixtures locales desechables, nunca cuentas de prueba en producción.

## Archivos y continuidad

`app/public-desktop.css` centraliza el contrato. `AGENTS.md` deja las pautas para futuras tareas visuales. Las comprobaciones reutilizables están en `tests/public-desktop.test.mjs` y los datos locales en `scripts/qa-desktop-catalog.mjs`, registrados en el manifiesto habitual para limpieza.

Evidencia: `outputs/qa-desktop-responsive-20261024.json`, `outputs/qa-escritorio-amplio-classic-20261024.jpg` y `outputs/qa-escritorio-amplio-glass-20261024.jpg`.
