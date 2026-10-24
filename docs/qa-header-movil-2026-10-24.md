# Corrección móvil: navegación compacta y acciones legibles

## Alcance

La ampliación anterior de textos había alcanzado también los enlaces del header. Se corrige exclusivamente por debajo de 861px en `app/public-mobile.css`, cargado después de los estilos públicos. No cambia el diseño amplio de PC ni los paneles privados.

- «Regiones y ciudades», «Escorts» e «Iniciar sesión» recuperan sus 12px anteriores, con una zona de enlace de 36px y columnas proporcionadas. No se eliminan enlaces ni se cambian destinos.
- Acciones del header: 40px de alto a escala de texto normal, texto de 16px, o 14px hasta 360px para mantener las dos acciones en una fila sin recortar sus nombres. Anteriormente el texto era de 11px; no se vuelve a ese tamaño pequeño.
- Se ajustan separación y relleno interno, no se fija una altura que pueda cortar texto ampliado por accesibilidad.
- «Mostrar filtros» conserva 42px en móvil. La explicación secundaria permanece disponible para lectores de pantalla sin alargar el botón. Los campos ampliados conservan sus etiquetas visibles.
- Los enlaces del menú desplegable recuperan su tipografía anterior; apertura, X, Escape y devolución del foco conservan sus manejadores originales.
- Se mantienen DM Sans local, colores, temas, robots, títulos, canonicals, enlaces y HTML de contenido. No se añaden fuentes, peticiones de tema, dependencias o JavaScript. No se modifica el asset inmutable de Liquid Glass.

## Evidencia

Navegador Chrome con viewports CSS simulados: 320, 360, 390, 430, 768 y 860px; sesiones anónima, usuaria y administradora; clásico y Liquid Glass. 36 combinaciones finales: sin desborde de página; todas las acciones del header a 40px. Los datos de prueba son exclusivamente locales.

Header anónimo, sin incluir la franja +18:

| Ancho CSS | Antes | Después |
| --- | --- | --- |
| 320px | 214,85px | 153,67px |
| 390px | 166,85px | 151,67px |

Ambos Home revisados; el segundo Home conserva sus botones de ciudades legibles sin colisiones. Filtros abiertos a 390px: botón 42px, campos visibles, sin errores de consola. Menús dentro del viewport y foco devuelto a «Abrir menú» al cerrar con Escape.

Comparación exacta antes/después a 1920px en la misma ciudad y con la misma sesión: dimensiones del header, columnas y anchuras de tarjetas, navegación y posición de contadores idénticas.

- 425 tests automáticos aprobados; compilación y TypeScript aprobados.
- ESLint: cero errores; una advertencia previa en `ProfileSafetyActions.tsx:57`, ajena al cambio.
- Métricas: `outputs/qa-mobile-compact-20261024.json`.
- Capturas: `outputs/qa-mobile-header-classic-20261024.jpg` y `outputs/qa-mobile-header-glass-20261024.jpg`.

La revisión es una simulación de tamaños, no una prueba en Safari de un iPhone físico. El aumento de texto elegido por el usuario puede producir reflow legítimo; no se fuerza clipping para conservar alturas artificialmente.

## Publicación

Versión Workers `9bfd503d-73dc-4271-ad8d-e3daad734c7b`, publicada con `--keep-vars`, sin cambios de plan, esquema o configuración de seguridad. `scripts/qa-mobile-production.mjs` comprueba de forma no mutante el CSS con hash nuevo, los tokens de escritorio conservados y la carga condicional del tema activo. Se restauró la presentación local y se retiraron los fixtures desechables al cerrar la revisión.
