# Redondeado compartido y transparencia de Liquid Glass

Publicado en Cloudflare: `f6ac0dcd-a9cc-4eb4-8dab-b54308268c00` (startup 42 ms). Se conservó el tema activo; se eliminaron las fixtures locales de QA al finalizar.

## Resultado

- Logo real del header, footer y paneles redondeado en Liquid Glass: 13,8 px, sin modificar la imagen ni sus dimensiones/alt.
- Escala común `--corner-scale: 1.15` en `app/corner-tokens.css`. Se sustituyeron 262 valores de radio por tokens compartidos en CSS público, cuenta, administración, formularios, foro, ayuda y componentes diferidos. Ejemplos: 8 → 9,2 px; 12 → 13,8 px; 16 → 18,4 px. No se escalaron tamaños, espaciados ni zonas de pulsación.
- Los controles y recuadros sin un radio previo usan el radio compartido; los círculos, cápsulas y esquinas interiores de controles unidos conservan su forma. Los enlaces simples y tiradores de recorte no se convierten en tarjetas.
- Fondos de tarjetas, campos, selectores y acciones de Liquid Glass con alpha moderado. Texto e imágenes siguen opacos. Menús, paneles laterales y opciones nativas conservan fondos opacos para evitar texto fantasma.
- Sin filtros de desenfoque nuevos, animaciones, listeners o consultas adicionales. Hay alternativa opaca con `prefers-reduced-transparency` y se conservan `forced-colors`, foco y estados deshabilitados.
- Asset exclusivo nuevo `/assets/theme-liquid-glass-20261021-v2.css`; consumidores de paneles con versión `20261021-rounded`. El modo clásico no solicita CSS exclusivo de Glass. Se mantienen la selección del servidor y las variantes de caché; no se cambia el tema publicado por el administrador.

## Verificación

- Build, TypeScript y ESLint de los componentes tocados correctos; 383 tests correctos.
- Prueba local de guardado reversible de ambos temas, separación de caché, permisos, conflicto de revisión, cabeceras manipuladas y vistas previas privadas correcta. Sin modificar ajustes ni cuentas de producción.
- 128 comprobaciones de geometría en ambos temas: home, Testing, cuenta y registro a 320, 360, 375, 390, 412, 430, 768, 1366, 1440 y 1920 px; directorio, venta de contenido, perfil, historias, datos personales, correo, medios y cuentas a 320, 390 y 1440 px. Sin desbordamiento horizontal ni etiquetas de botones cortadas detectadas. Se repitió una muestra que inicialmente capturó el DOM durante una recarga del emulador.
- iPhone 16e representado por viewport 390 × 844, DPR 3 y eventos táctiles en Chrome. No equivale a ejecutar Safari en un iPhone físico; el selector nativo de iOS sigue dependiendo del sistema.
- Inspección de capturas de PC y móvil, menús públicos y administrativos abiertos, apertura del selector de ciudades y geometría de cierre. El menú público inicialmente no tenía radio y dejaba traslucir texto: corregido y vuelto a comprobar (13,8 px y fondo opaco).
- Consolas revisadas sin errores en páginas públicas y paneles. HTML público y privado conserva el SEO y la política robots existentes.

## Carga

- Glass exclusivo: 9.808 bytes sin comprimir / 2.687 gzip. Tokens compartidos: 1.471 bytes / 517 gzip (antes del minificado del bundle).
- Traza local de carga fría, 390 × 844/DPR 3, sin limitación de CPU/red: Glass LCP 675 ms, CLS 0,00; ahorro estimado por quitar recursos bloqueantes: 0 ms.
- Otra muestra clásica: LCP 1.702 ms, CLS 0,00; 1.503 ms corresponden a descarga del recurso LCP. Son muestras locales con variabilidad de red y no permiten concluir que Glass sea más rápido que clásico ni prometer coste cero en todos los dispositivos.
- La transparencia se implementa mediante colores alpha; no mediante opacidad del contenedor, refracción ni `backdrop-filter`. El rendimiento real se debe seguir contrastando con dispositivos y datos de usuarios reales.
