# Botones principales del Home: tamaños móviles iguales

- Ajuste compartido en `app/public-mobile.css`, limitado a pantallas de hasta 620px: los dos botones de `.hero-actions` tienen ancho completo y altura mínima de 44px. No hay altura fija que impida el crecimiento del texto.
- No se modifica el header, la distribución de escritorio, el modo de Home compacto ni los recursos exclusivos de Liquid Glass.
- Comprobación visual local en clásico y Liquid Glass: 320, 360, 390, 430, 620, 768, 1366 y 1920px. Los dos botones tienen las mismas dimensiones en móvil; el ancho natural de escritorio permanece igual. Sin recortes de texto ni desbordamiento horizontal.
- Build correcto y 430 pruebas automatizadas aprobadas.
- Producción: CSS nuevo `/assets/index-CHs5f-ir.css`, comprobación DOM de ambos botones iguales y sin desbordamientos. Metadatos, datos estructurados y textos de las siete páginas públicas revisadas permanecen iguales.
- Evidencias locales: `outputs/qa-equal-actions-responsive-20261024.json`, `outputs/qa-equal-actions-classic-20261024.png` y `outputs/qa-equal-actions-glass-20261024.png`.
- Solo se utilizaron fixtures desechables locales. No se modificaron datos, configuración visual ni el plan de producción.
