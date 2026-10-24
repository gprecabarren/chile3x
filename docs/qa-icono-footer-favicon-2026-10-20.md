# Icono de ubicación, footer y favicon — 20 de octubre de 2026

## Cambios publicados

- El símbolo tipográfico de ubicación se reemplazó por un SVG decorativo centrado. En móvil, el círculo completo se desplaza 4 px hacia la izquierda.
- El footer usa un único borde en el contenedor, sin bordes ni padding heredados en sus tres `span`. Se conserva el texto y «Acceso administrador».
- Los PNG, ICO y Apple Touch Icon de Chile3X tienen nombres de archivo nuevos; el manifiesto usa los nuevos PNG. Se conservan todos los iconos originales como respaldo.
- No se modificaron autenticación, permisos, formularios, base de datos, métricas, contenido SEO ni navegación.

## Verificación

- Compilación de producción correcta; persiste el aviso previo de chunks de más de 500 kB.
- TypeScript sin errores y ESLint de componentes y pruebas correcto.
- 359 pruebas automáticas correctas, sin fallos ni exclusiones.
- Chrome con vistas locales de 320, 390 y 1440 px: sin desbordes horizontales; centro del SVG coincide con el del círculo (desviación menor de 0,001 px); desplazamiento móvil de -4 px y ninguno en PC.
- Footer local: un solo separador; los tres spans tienen borde de 0 px. Texto y acceso alineados verticalmente en PC y móvil. En 320 px el enlace puede pasar de línea sin desbordar.
- En producción, el DOM comprobado en Chrome confirma un separador y los tres spans sin bordes; sin desbordes en la vista móvil efectiva. La captura remota de esta pestaña agotó el tiempo de espera; se conservan capturas locales de la misma compilación.
- `scripts/qa-favicon-live.mjs`: metadatos correctos en home, perfil de Lalita y pantalla pública de acceso denegado. Los diez archivos antiguos/nuevos responden 200, con MIME válido y SHA-256 idéntico al logo original local. ICO admite tanto `image/x-icon` como `image/vnd.microsoft.icon`.
- `scripts/qa-home-discovery-live.mjs`: home correcto; `/admin` y `/admin/medios` siguen redirigiendo sin sesión con `noindex, nofollow` y `private, no-store`; exclusión de robots y sitemap conservada.

## Safari: alcance y límite

Los archivos publicados y sus referencias eran de Chile3X, no de Arsmate. Se comprobaron visualmente los PNG y el PNG incrustado en el ICO. Se renovaron las rutas para solicitar los iconos de nuevo, sin cambiar el logo. No se verificó un iPhone físico ni se confirmó la causa del icono observado por el usuario. Si persiste, será necesario comprobar el resultado en su Safari; no se borraron datos ni sesiones del navegador.

## Evidencia visual local

- `outputs/home-icono-centrado-movil-20261020.png`
- `outputs/footer-linea-unica-movil-20261020.png`
- `outputs/footer-linea-unica-pc-20261020.png`

## Despliegue

Cloudflare Worker `chile3x`, versión `35593292-d672-427f-87c5-1741bf7161bd`.
Se conservaron variables, bindings, cola y cron existentes. No se ejecutaron migraciones.
