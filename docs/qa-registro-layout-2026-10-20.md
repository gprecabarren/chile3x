# Registro: fecha y documentos alineados — 20 de octubre de 2026

## Alcance

Se añadió una hoja CSS específica de `.auth-register-card` y su importación en `/registro`. No se cambiaron DateField, AccountIdentityFields, validaciones, endpoints, OAuth, consentimientos, contraseñas ni datos. No se creó ninguna cuenta durante la comprobación.

## Causas y correcciones

- El formulario había ampliado su ancho a 980 px y la fecha conservaba una columna de 175 px. Ahora el contenedor tiene un máximo de 840 px y la fecha dispone de 300 px en escritorio, hasta 360 px en diseños intermedios.
- Un `padding-right:42px !important` global consumía espacio dentro de cada selector de fecha. Se usa una única excepción de 26 px, limitada a esos tres selectores y compatible con su flecha de 14 px.
- Las etiquetas opcionales eran grids estirados por la fila que contenía texto de ayuda. Se alinearon desde arriba y los controles de registro tienen altura común de 46 px.
- En móvil se mantienen los tamaños de texto de 16 px. Hasta 360 px, la fecha se distribuye en dos filas para conservar legibilidad.
- El peso normal de la escritura y la apariencia de los selectores se conservan. El registro sigue siendo noindex.

## Verificación

Historia revisada: abrir registro → elegir fecha → cambiar tipo de documento → mostrar país para documento extranjero. Se verificó la presentación y las interacciones sin enviar el formulario ni aceptar consentimientos.

- Build de producción correcto; persiste el aviso previo de chunks de más de 500 kB.
- 363 pruebas automáticas correctas, TypeScript sin errores y ESLint correcto.
- Chrome local a 1440, 1024, 900, 899, 768, 620, 390, 375 y 320 px: sin desbordes horizontales.
- En escritorio: tipo/número de documento tienen diferencia vertical de 0 px y ambos miden 46 px, tanto con RUT como con documento extranjero.
- Año, mes y día en PC: aproximadamente 88, 132 y 66 px; se ven completos «2000», «Septiembre» y «30» con datos sintéticos no enviados.
- Móvil de 390 px: selectores de aproximadamente 88, 133 y 66 px, texto de 16 px y columna de ubicación apilada; captura comprobada visualmente.
- El cambio a documento extranjero muestra el país emisor sin desalinear los controles. La lógica de fechas y límite de mayoría de edad no se modificó.
- `scripts/qa-registration-layout-live.mjs`: `/registro` responde 200 con noindex, el endpoint existente viaja en el payload y el dominio sirve el CSS de ancho 840 px, padding de fecha corregido y etiquetas alineadas. El contenedor de seguridad puede mostrar inicialmente su pantalla de preparación antes de la hidratación; no se desactivó.
- `scripts/qa-home-discovery-live.mjs`: home y protección noindex/no-store de `/admin` conservados.
- Chrome en producción, ancho efectivo de 1920 px por el zoom existente: formulario de 840 px, fecha de 88/132/66 px, diferencia vertical de documento de 0 px, ambos controles de 46 px y sin desbordes. Se comprobó el `action=/api/auth/register`, `method=post` y que año/mes/día sigan siendo obligatorios. No se introdujeron datos ni se envió el formulario en producción.

## Evidencia

- `outputs/registro-campos-alineados-pc-20261020.png`
- `outputs/registro-fecha-movil-20261020.png`

## Despliegue

Versión del Worker `chile3x`: `ad16c0bd-8b3a-4e46-addc-1b9ef44069ae`.
Un asset CSS nuevo. Variables, bindings, cola y cron existentes conservados. Sin migraciones ni cambios de autenticación.

## Seguimiento — 21 de octubre: botón del ojo

Se eliminó el margen superior heredado de 5 px únicamente en el botón de visibilidad. La columna y el botón son de 46 px; el control queda cuadrado y alineado con la contraseña.

Chrome local, a 1440, 1024, 768, 620, 390 y 320 px: diferencia superior/inferior de 0 px entre input y botón, icono centrado en ambos ejes, margen de 0 px y sin desbordes. Mostrar/ocultar cambia los dos tipos de input y `aria-pressed` correctamente, sin introducir contraseñas ni enviar formularios.

Compilación y 364 pruebas correctas. ESLint correcto. El verificador publicado confirma el nuevo CSS y que registro sigue noindex. Evidencia: `outputs/registro-ojo-alineado-pc-20261021.png`.

Versión publicada: `5a57bbca-0177-482d-bde1-2ec512efcb4b`. Un asset CSS nuevo; variables, bindings, cola y cron conservados.
