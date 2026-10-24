# Ajustes de revisión, anuncios y contraseña · 23-10-2026

## Resultado

- Barra de reserva compacta en escritorio; ajustada al ancho disponible y con texto envolvente en móvil. Mensaje inicial más breve, sin quitar las advertencias de concurrencia.
- Revisión del anuncio y papelera dentro de un contenedor máximo de 1184 px, alineado con la ficha. Separación de 18 px entre ambos paneles.
- Papelera dentro del mismo ReviewScope, con review_key/review_revision explícitos para conservar la protección de cambios simultáneos.
- Tarjetas de anuncios de la cuenta con relleno propio (20 px PC, 16 px móvil). Acciones cortas: Revisar anuncio, Previsualizar, Fotos y videos. Se mantienen ambas rutas de revisión y vista pública/privada, así como permisos, retorno y tratamiento de papelera.
- Contraseña limitada a 760 px en PC; entrada y acciones de 44 px, botón Guardar proporcional. Campo oscuro, etiqueta asociada y ayuda accesible. En móvil/tablet la entrada ocupa una fila y Generar/Mostrar/Copiar otra.
- Corregida la interacción entre flex-wrap y flex-direction que desplazaba las acciones fuera de las tarjetas móviles, aun sin desbordamiento horizontal del documento.

## Verificación

- 396 pruebas automáticas aprobadas, TypeScript, lint de los componentes cambiados y compilación de producción correctos.
- Navegador local con identidades desechables: ambos temas, fichas de cuenta y anuncio, anchos 320, 360, 375, 390, 412, 430, 768, 1366 y 1920 px. Sin controles fuera del contenedor en las zonas corregidas, inputs/ojos alineados y acciones de tarjetas de 44 px.
- Emulación móvil 390×844, DPR 3 (medida de iPhone 16e); no es una prueba en Safari físico.
- Capturas inspeccionadas de contraseña PC/móvil, tarjetas PC/móvil y moderación/papelera abierta en ambos estilos.
- Generación de clave de 14 caracteres, habilitación de Copiar y conmutación Mostrar/Ocultar comprobadas sin guardar contraseñas reales ni enviar correos.
- Reserva y liberación reales a través de la interfaz local comprobadas; nombres largos de otro administrador, botón deshabilitado y aviso de revisión desactualizada ajustados a 320 px. Papelera abierta conserva campos de revisión y sus controles caben en móvil.
- Sin errores de consola en los recorridos finales inspeccionados. Prueba local de selección de temas/SSR/caché/vistas privadas y conflictos aprobada, restaurando la configuración local anterior.
- No se añadieron librerías, animaciones, filtros de fondo ni peticiones para estos cambios. El CSS compartido conserva ambos temas y no activa la hoja Glass en Classic. No se modificaron títulos públicos, canonicals, datos estructurados o reglas de robots.

## Publicación

Versión desplegada: `b7b31ff7-f986-4743-8d71-83daedf970c1`, conservando variables, secretos y bindings existentes. No se modificó el tema ni la distribución del home de producción. No se contrató ni cambió ningún plan.

Comprobación posterior: home, /escorts, /ingresar y /perfil/@thalia-la-colombiana responden HTTP 200. La hoja CSS nueva responde 200 y contiene los ajustes. /admin redirige al acceso (307) con noindex/nofollow/nosnippet. El tema sigue siendo Classic, sin cargar el CSS Liquid Glass y sin mostrar herramientas administrativas a visitantes anónimos.

Las identidades y archivos de prueba locales se retiraron; no se crearon cuentas ni anuncios de producción para esta revisión.

## Rendimiento y plan

Los ajustes de distribución no necesitan efectos costosos. Una identidad visual distinta no implica por sí sola lentitud; desenfoques extensos, animaciones y JavaScript innecesario sí pueden añadir coste de renderizado.

Los incidentes previamente confirmados como exceededCpu alcanzaron el límite gratuito de 10 ms por solicitud. Workers Paid da más margen de CPU; no convierte automáticamente las consultas, descargas o el renderizado del navegador en operaciones más rápidas. Su coste mínimo es US$5/mes por cuenta con posibles excedentes y cargos separados de otros productos. No es el plan Pro del dominio.

Fuentes: https://developers.cloudflare.com/workers/platform/pricing/ y https://developers.cloudflare.com/workers/platform/limits/
