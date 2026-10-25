# Formulario Escort: comprobación local del 24 de octubre de 2026

Se comprobó el Worker local en `http://127.0.0.1:3880`, usando la base D1 descartable de `.wrangler/visual-state`. No se modificaron datos remotos ni se crearon cuentas de producción. El script de integración no cambia el tema del sitio.

## Comprobación del servidor

`node scripts/qa-escort-form.mjs` pasó para creación normal y creación asistida por administración, incluyendo la edición posterior de ambos anuncios:

- Género Masculino agrega `hombres` exactamente una vez, aunque no se envíe como etiqueta.
- Cambiar a Femenino elimina `hombres`, incluso si un formulario antiguo o una petición manual lo sigue enviando.
- Se conservan idiomas, horarios semanales, medianoche y la normalización de Telegram, Instagram, Arsmate y OnlyFans.
- La combinación Masculino + MILF y los horarios incompletos o invertidos se rechazan sin escrituras parciales.
- Un origen ajeno se rechaza con 403 y una revisión obsoleta con 409, sin cambiar el anuncio.
- Cambiar solo WhatsApp, correo y redes conserva un anuncio aprobado. La edición administrativa también conserva el estado de moderación existente.
- Los anuncios antiguos también conservan su aprobación al actualizar solo contactos: la etiqueta derivada se corrige en la misma transacción, sin reemplazar los demás servicios ni etiquetas. Las pruebas SQLite usan los disparadores reales de revisión e incompatibilidad y comprueban la reversión ante un fallo.
- El editor privado responde correctamente y mantiene `noindex`.

El script requiere el servidor local y el manifest generado por `node scripts/qa-account-stories.mjs seed`. Crea su propia cuenta y anuncios temporales, los elimina al terminar y deja intactas las cuentas utilizadas para la comprobación visual. Los proxies de `qa-account-stories.mjs serve` ofrecen propietario en `:3881`, administración en `:3882` y cuenta sin anuncios en `:3884`.

## Estado público de disponibilidad

Se encontró y corrigió un fallo previo: un anuncio que atendía solamente un día perdía el mensaje de próxima apertura después del cierre de ese día. El cálculo ahora contempla el mismo día de la semana siguiente.

`node --experimental-strip-types --test tests/qa-upload-preview.test.mjs` pasó 4/4 pruebas. La nueva prueba cubre antes de la apertura, apertura exacta, cierre exacto, cierre posterior, vuelta de semana y ausencia de horarios, con la zona `America/Santiago`.

La revisión ESLint de `scripts/qa-escort-form.mjs`, `tests/qa-upload-preview.test.mjs` y `lib/profile.ts` pasó.

La revisión visual del formulario debe hacerse después de que termine `BrowserSessionSetup`: la respuesta HTML inicial de las rutas privadas contiene la pantalla de preparación segura.

## Formulario y temas

Se verificaron Classic y Liquid Glass en 320, 360, 390, 430, 768, 1366, 1920, 2560 y 3440 px: 18 combinaciones, sin desbordes horizontales ni errores JavaScript. Se revisaron creación, edición de propietario y edición administrativa.

- Días, idiomas y etiquetas: texto de 16 px, casillas nativas de 22 px y etiquetas con un área mínima de interacción de 44 px.
- Horarios cerrados inicialmente; abrir y cerrar conserva los valores y muestra cuántos días están seleccionados. Se verificaron foco visible y apertura con teclado.
- Agenda de viajes también cerrada inicialmente dentro de Características opcionales, con el mismo estilo. Se comprobaron 12 combinaciones de ambos temas y anchos 320, 360, 390, 430, 1366 y 1920 px: ciudad, nota y fechas permanecen al cerrar ambos grupos, el teclado abre el desplegable y un campo inválido recupera foco tras abrir sus dos ancestros.
- Los selectores de fecha de viajes se redistribuyen en móvil para mostrar año, mes y día completos. Se midió el texto seleccionado con la fuente real frente al espacio disponible, además de revisar las capturas.
- Con ambos desplegables cerrados, un horario obligatorio incompleto abre ambos y recibe el foco de validación nativa.
- Se verificaron selección de días, campos deshabilitados, atención 24 horas y restauración de horarios anteriores.
- El género Masculino bloquea MILF, y cambiar a Femenino vuelve a habilitarla. La opción manual Hombres desaparece.
- Los contactos conservan sus nombres accesibles y usan los íconos compartidos del perfil; Arsmate mantiene su marca con su proporción original.
- En 320/360 px las horas se apilan para conservar la lectura de AM/PM. Se comprobó también texto ampliado en los editores.

Los cambios compartidos están en `app/account-form-controls.css`; el ajuste específico para móvil está dentro de los límites de `app/public-mobile.css`. No se modificó el archivo inmutable de Liquid Glass ni su carga condicional.

## Tipografía

Chrome confirmó la fuente local DM Sans realmente renderizada, además de su familia CSS, en 20 vistas: diez rutas públicas, registro, formulario y paneles en escritorio y móvil. Se inspeccionaron 4.381 textos y controles, sin diferencias de familia ni errores JavaScript. Las IP y el código conservan su fuente técnica monoespaciada.

El archivo variable incluye pesos de 100 a 1000, acentos, ñ/Ñ y signos españoles. Las diferencias visuales observadas proceden de tamaños, pesos y cursivas; no fue necesario cambiar la fuente.

Los resultados anteriores corresponden a QA local previo a la publicación. No se cambió la visibilidad del repositorio ni se modificaron datos de producción para las pruebas. La publicación se verifica por separado mediante el commit de GitHub y la versión activa de Cloudflare.

## Validación final

- `pnpm build`: correcto.
- `pnpm typecheck`: correcto.
- ESLint de todos los archivos TypeScript/TSX y scripts/pruebas afectados: correcto.
- `node --experimental-strip-types --test tests/*.test.mjs`: 465 pruebas correctas, cero fallos.
- `node scripts/qa-escort-form.mjs`: integración de propietario y administración correcta.

Los cambios de género y de otras características siguen pasando por la política de moderación existente. La normalización no necesita una migración de la base; los anuncios anteriores se sincronizan al guardar.

## Actividad pública

La comprobación pública descubrió un fallo anterior de hidratación: el servidor y el navegador podían renderizar minutos distintos al calcular «hace 1 min» en instantes diferentes. Ese error podía bloquear los controles de actividad con el aviso de desarrollo.

La actividad ahora usa la fecha de publicación fija durante el render inicial y el mismo reloj cliente que actualiza las historias después de la hidratación. No agrega temporizadores, llamadas ni solicitudes por componente. Las pruebas comprueban el cruce exacto de minuto con el componente real renderizado en servidor y conservan el contenido y las acciones.

Se completaron 144 combinaciones públicas: ambos temas, ambos diseños del inicio, con/sin sesión, inicio, catálogo poblado/vacío y anchos 320, 390, 1366, 1920, 2560 y 3440 px. Todas pasaron composición, controles de historias/actividad, tamaños de tarjetas, navegación sin desplazamiento horizontal y estabilidad de títulos, canónicas, robots y datos estructurados. Se simuló un reloj de navegador adelantado tres minutos: no hubo errores de hidratación.

En esa ejecución hubo un error interno aislado del servidor local que se recuperó mediante render en el cliente. La repetición específica de las 36 combinaciones con sesión y Liquid Glass pasó sin errores; no se reprodujo. Se conserva el registro en los artefactos locales de QA, sin atribuirle una causa no demostrada.
