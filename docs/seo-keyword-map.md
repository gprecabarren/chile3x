# Mapa de palabras clave de Chile3X

Este mapa separa la intención de cada URL indexable para evitar que portada, páginas informativas y páginas locales compitan entre sí.

| URL | Intención principal | Consultas objetivo | No debe competir por |
| --- | --- | --- | --- |
| `/` | Marca y descubrimiento del directorio | `chile3x`, `directorio de escorts en chile por ciudad` | Consultas de una ciudad o un anuncio concreto |
| `/escorts` | Directorio nacional | `escorts chile`, `damas de compañía chile`, `escorts` | Marca institucional o una ciudad concreta |
| `/escorts/[ciudad]` | Búsqueda local transaccional | `escort [ciudad]`, `escorts [ciudad]`, `damas de compañía [ciudad]` | Consultas nacionales o de otra ciudad |
| `/agencias` | Tipo de publicación | `agencias de escorts chile` | Perfiles individuales o arriendos |
| `/arriendos` | Tipo de publicación | `arriendos para escorts chile` | Agencias o perfiles individuales |
| `/quienes-somos` | Confianza y marca del directorio de escorts | `quién es chile3x`, `cómo funciona chile3x`, `moderación chile3x` | Resultados transaccionales nacionales o locales |
| `/perfil/@usuario` | Anuncio individual | nombre del anuncio + escort, agencia de escorts o arriendo para escorts + ciudad | Consultas genéricas del directorio |
| `/noticias` y artículos | Información | seguridad, moderación, novedades y guías | Páginas de resultados locales |
| `/faq` | Soporte previo a la acción | preguntas sobre cuentas, revisión y funcionamiento | Directorio nacional o local |
| `/contacto` | Navegación y soporte | `contacto chile3x`, `soporte chile3x` | Consultas comerciales o locales |

## Señales de Search Console usadas

Periodo consultado: 30 de julio al 6 de septiembre de 2026.

- Sitio: 131 clics, 1.220 impresiones, CTR 10,8 % y posición media 20,6.
- `/quienes-somos`: 41 clics, 153 impresiones, CTR 26,8 % y posición 4,1. La consulta principal era `escorts`; se cambió la página para que responda a intención institucional.
- `/escorts/concepcion`: 26 clics, 278 impresiones, CTR 9,4 % y posición 28,2. Conserva la intención local y enlaza páginas relacionadas.
- `/escorts/vina-del-mar`: 16 clics y 219 impresiones.
- `/escorts/valdivia`: 10 clics y 82 impresiones.
- `/`: 9 clics y 58 impresiones. Se orientó a marca y descubrimiento general.

## Reglas editoriales

1. Un artículo informativo enlaza al directorio o a una ciudad, pero no replica su título ni su introducción.
2. Cada página local conserva ciudad y región en título, H1, descripción, migas y datos estructurados.
3. Las ciudades relacionadas se enlazan dentro de su región; FAQ, reglas y noticias funcionan como apoyo informativo.
4. No se crean páginas para variaciones ortográficas. Google debe consolidarlas en la URL canónica de la ciudad.

## Perfiles y datos opcionales — octubre de 2026

- Título: nombre del anuncio, tipo y ciudad, sin concatenar todas las etiquetas o servicios.
- Descripción: tipo, ciudad y región, más la descripción breve real cuando existe; corte en palabras completas.
- El HTML público muestra únicamente los atributos completados y correspondientes al tipo de anuncio. No crea secciones de características, tarifas, horarios o servicios vacías.
- Los opcionales ayudan a los filtros existentes y aportan información al visitante; no garantizan posicionamiento en Google. No se inventan atributos, direcciones exactas ni reseñas para el marcado estructurado.
- La URL canónica es la del anuncio, no una URL por combinación de opcionales. Borradores, vistas previas privadas y perfiles de demostración conservan `noindex`.
- Esta actualización editorial no constituye una nueva medición de Search Console o Semrush; las métricas anteriores corresponden al periodo indicado.
