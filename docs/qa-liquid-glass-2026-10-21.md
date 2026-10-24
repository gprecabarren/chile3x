# Testing y tema Liquid Glass

## Recorrido verificado

Testing → Tema visual → vista previa privada o selección → POST de ajustes → D1 y revisión compartida → documento nuevo con tema y CSS correspondientes.

- Ruta principal: `/admin/testing`. Mantiene tickets y diseños del home; añade Tema visual.
- `/admin/testers` redirige 307 conservando solo pestaña, estado y aviso válidos. `/admin/bugs` y `/admin/configuracion/inicio` redirigen directamente a Testing.
- Los nombres de roles de personas tester no cambian. El nombre de la sección administrativa es Testing.
- El tema (`classic`/`liquid-glass`) y el diseño del home (`classic`/`compact`) son independientes. No se activó Liquid Glass en producción al desplegar.
- Guardado reservado a `settings.manage`, con comprobación de origen, validación de un único valor, revisión de concurrencia y auditoría. Soporte y Editor no pueden activar ni previsualizar temas.

## Carga y caché

- El tema se decide en el servidor y se imprime en `<html>` antes de pintar; no depende de localStorage, observadores, fuentes externas o peticiones de tema desde componentes.
- Una consulta acotada a dos ajustes fija el tema y el home para la caché y el HTML de la misma petición. No se hace esa consulta para API, medios ni activos estáticos.
- Se ignoran cabeceras y parámetros de tema introducidos por el cliente.
- Las entradas compartidas se separan por despliegue, tema, home cuando corresponde y ciudad. Las peticiones autenticadas siguen fuera de la caché compartida.
- `theme-liquid-glass-20261021.css` solo se enlaza cuando Liquid Glass está activo o en su vista previa privada. El tema clásico no lo solicita ni precarga. La estructura base es compartida y necesaria en ambos.
- Las copias descargadas anteriormente pueden permanecer en el almacenamiento del navegador, pero no se aplican ni se solicitan cuando el tema está inactivo. No hace falta borrar la caché para cambiar de tema.
- Los activos tienen URL versionada e immutable. `AGENTS.md` exige cambiar la versión del nombre al editar un CSS ya publicado.
- Pestañas ya abiertas conservan su documento: hay que recargarlas. Al salir de una vista previa se fuerza navegación de documento para no arrastrar su tema a una página pública.

## Diseño y accesibilidad

- Reflejos por gradientes y sombras suaves, sin refracción animada ni desenfoque global. Menús y cabeceras opacos evitan texto fantasma del fondo.
- No se aplican filtros ni overlays a fotografías. Se conservan colores y logos de contactos, incluido Arsmate y OnlyFans.
- Selectores nativos conservan flecha, teclado y comportamiento del dispositivo. Opciones opacas, foco visible, estados deshabilitados legibles y escritura sin negritas.
- Botones de ciudades con altura mínima de 44 px en ambos temas.
- Selector de ciudades con cierre explícito y altura ajustada al viewport; WhatsApp flotante se oculta mientras está abierto para no tapar opciones.
- Nuevos controles deben usar las clases/componentes compartidos y comprobarse en ambos temas; instrucciones persistidas en `AGENTS.md`.

## Evidencia

- Build, TypeScript y suite completa: 380 pruebas aprobadas.
- Integraciones locales: `qa-testing.mjs`, `qa-home-layouts.mjs`, `qa-visual-themes.mjs` aprobadas. Prueban permisos, redirecciones, persistencia, selección independiente, reversión, preview sin publicar, canonical y conflicto 409 ante revisión antigua.
- Flujo de navegador real probado guardando Glass y restaurando clásico desde el formulario.
- Red: clásico sin petición al CSS Glass; Glass con una sola petición al CSS exclusivo.
- Vistas revisadas: 1440, 390 y 320 px; selector abierto probado a 320 × 568 y dentro del viewport. Se revisaron inicio, directorios, perfil con todos los contactos, registro, Mi cuenta, historias, datos personales, creación de anuncios, cuentas administrativas, medios, correo y Testing. No hubo desbordamiento horizontal en las vistas comprobadas.
- Registro se revisó directamente en el Worker local: el proxy anónimo de QA descarta cookies y no sirve para preparar la sesión de registro.
- Medición local sin limitar CPU/red: LCP clásico 594 ms y Glass 588 ms; CLS 0 en ambos. Una muestra por tema, no datos de usuarios reales ni una garantía de velocidad. Insights de bloqueo de render: ahorro estimado 0 ms. El CSS añade aproximadamente 2,4 KB gzip y ningún JavaScript público para aplicar el tema.
- No se crearon cuentas ficticias ni se alteró contenido en producción. Las identidades de QA son locales y desechables.

## SEO

Sin URLs públicas nuevas ni cambios en títulos, contenidos, jerarquía, canonical o sitemap. Testing y previews mantienen autorización y `noindex, nofollow, nosnippet` con `no-store`.

## Despliegue

- Cloudflare: versión `99152a81-af80-4e44-ad06-a5f8e9606517`.
- Verificación posterior: `/admin/testers` y `/admin/bugs` redirigen a Testing con filtros conservados. Las rutas de Testing no entregan datos privados sin sesión y los previews redirigen al acceso.
- Home, Concepción, Venta de contenido y Lalita responden 200 con tema clásico, un H1 y sin cargar CSS Glass. El CSS exclusivo se sirve como activo versionado.
- La guía de rendimiento influyó en mantener reflejos CSS simples sin desenfoque global y en verificar solicitudes/CLS. Las guías de React y verificación influyeron en mantener ajustes server-side, paneles independientes y salida de previews mediante documento nuevo.
