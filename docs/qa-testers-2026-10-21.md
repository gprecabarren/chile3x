# Testers: reportes y diseños del home

## Acceso

- Menú administrativo → Testers → `/admin/testers`.
- Reportes de errores: `?seccion=bugs`, con los mismos filtros, conversaciones y actualizaciones de estado.
- Diseños del home: `?seccion=inicio`, con vista previa privada y publicación manual reversible.
- `bugs.manage` conserva el acceso a tickets. `settings.manage` conserva el acceso a plantillas y guardado. No se ampliaron los permisos de Soporte ni de otros roles.
- Las rutas antiguas `/admin/bugs` y `/admin/configuracion/inicio` son redirecciones HTTP 307; conservan únicamente los filtros y avisos admitidos. No mantienen pantallas duplicadas.
- El acceso desde Configuración es un atajo a Testers, no un segundo editor.

## Protección y carga

- No se consulta ni se renderiza el panel inactivo.
- No hay escrituras al entrar o previsualizar. El home público no cambió de diseño durante el despliegue.
- Guardado protegido por origen, autorización, versión de revisión y auditoría existentes.
- Redirecciones del formulario limitadas a las rutas internas admitidas.
- Todas las rutas administrativas mantienen `noindex, nofollow, nosnippet` y caché privada `no-store`.
- Se conservan el canonical público, el sitemap y los enlaces de ciudades.

## Limpieza acotada

- Se reutilizan las pantallas originales como paneles, eliminando su duplicación en las rutas antiguas.
- Retirados dos scripts de un solo uso ya completados: `cleanup-test-accounts.mjs` y `action-controls-codemod.mjs`. Ninguno tenía consumidores en scripts npm ni código de aplicación.
- Retirado un bloque condicional vacío en el guardado de ajustes.
- La agrupación de mensajes utiliza listas acumuladas sin copiar el hilo entero en cada iteración.
- No se eliminaron migraciones históricas, activos usados, herramientas de respaldo generales ni pruebas de regresión.

## Verificación

- Compilación y comprobación TypeScript correctas.
- Suite completa: 375 pruebas aprobadas.
- `qa-testers.mjs`: rutas nuevas/antiguas, filtros, respuesta y persistencia del ticket, aislamiento de permisos para Soporte y Editor, rechazo de usuario normal/anónimo y cabeceras privadas.
- `qa-home-layouts.mjs`: vistas previas, selección/guardado, destino posterior al guardado, canonical, orden de ciudades, origen y rechazo de escritura desactualizada. Se restaura el valor local anterior.
- Revisión visual de ambos paneles en escritorio y móvil; selector probado también a 320 px sin desbordamiento horizontal. Controles principales y filtros de estado con altura mínima de 44 px.
- Todas las cuentas y tickets de estas pruebas son locales y desechables; no se crearon usuarios de prueba en producción.
- Publicado en Cloudflare: versión `2b703522-b21c-4118-8cc8-fa2683e4c795`.
- Comprobación posterior en producción: ambos enlaces antiguos responden 307 con filtro/aviso conservado; Testers exige sesión y conserva `noindex`/`no-store`; home, Chillán, Venta de contenido y Lalita responden 200. El home sigue en `classic`.

## Respaldo solicitado

El intento de eliminar el respaldo local específico de la limpieza anterior fue bloqueado por la herramienta. No se informa como eliminado. Esta limitación no afecta los cambios del sitio.
