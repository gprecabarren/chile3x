# Paneles, herramientas de fotos, acceso y muestras — 27 de octubre de 2026

Revisión dirigida de los pedidos de presentación y medios posteriores a [la entrega de muestras y SEO del 26 de octubre](qa-muestras-seo-2026-10-26.md). Este informe describe implementación y evidencia local. No acredita por sí solo commit, checks de GitHub, configuración efectiva de D1 ni versión activa en Cloudflare; la publicación debe verificar y registrar esas capas por separado.

## Cambios y causas comprobadas

| Pedido | Resultado implementado y explicación |
| --- | --- |
| WhatsApp en el registro | Los dos enlaces de creación asistida usan el mismo ícono compartido y tamaño. |
| Inicio de sesión para aviso de ciudad | Acción centrada con el ícono compartido de usuario en el perfil real y el modo de muestra; la muestra conserva la acción visible e inactiva. |
| Imagen de marca en redes | Recurso de marca existente con fondo negro, servido con ruta versionada y usado como respaldo social. La muestra tiene título, descripción e imagen genéricos sin información privada. No se modifican favicons ni se expone su galería a rastreadores. |
| Cabecera de muestra | El contenedor reutiliza las tres franjas de la cabecera pública en modo de previsualización sin datos de la sesión administrativa ni escrituras. |
| Foto principal y vista previa | Selector, opciones, foto seleccionada y principal guardada quedan dentro del mismo bloque compartido, con separación interna y sin dos bordes que se toquen. |
| Herramientas por lote | Cuatro acciones visibles para fotos guardadas: aplicar/quitar marca y aplicar/quitar difuminado, incluida la principal. Antes quedaban dentro del desplegable y el editor estaba condicionado al contexto administrativo. Ahora cuentan con ruta de propietario y se presentan en cuenta normal, administración y muestras; el ajuste de difuminado sigue comprobándose en servidor. |
| Eliminar todas las fotos | Acción compartida con confirmación escrita `ELIMINAR`. Conserva videos y selecciones sin subir, respeta permisos/revisión y se detiene ante un fallo sin reintentar una eliminación incierta. |
| Revisión compartida | El control de colaboración queda dentro de cada tarjeta de anuncio en el listado administrativo. |
| Buscador de cuentas | Placeholder con los campos reales de consulta, sin los dos textos auxiliares solicitados; conserva filtros avanzados y selectores nativos. |
| Estado efectivo | Resumen compacto en la misma cuadrícula que los demás datos, con reflujo móvil y sin una columna alta para una sola etiqueta. |
| Cambio administrativo de contraseña | Causa reproducida: `input[name="action"]` sombreaba la propiedad nativa `form.action`; el coordinador enviaba el formulario a un destino incorrecto y la API de cuenta no ejecutaba el cambio. Se leen los atributos y overrides del botón, conservando origen, revisiones y recibos. |
| Cambio propio de contraseña | Verificado con hash real y revocación de las otras sesiones; conserva la sesión actual según su política existente. |
| Formulario de acceso | Correo y contraseña con el mismo ancho y alto de 44px, etiquetas a 7px e ícono de mostrar contraseña dentro del campo, sin ampliar el contenedor. |
| Errores de acceso | Por elección expresa del usuario, se distingue correo no registrado de contraseña incorrecta después de Turnstile. Se conserva únicamente el correo durante cinco minutos en cookie restringida y se limpia al ingresar; nunca la contraseña ni el correo en la URL. La distinción permite conocer si un correo está registrado, decisión de producto aceptada. |
| Íconos y región | Flechas y papeleras sustituidas por íconos SVG compartidos; recomendaciones incluyen ciudad y región. También se retiraron íconos de color independientes encontrados en los controles de reporte y temas fijados. |
| Clics WhatsApp administrativos | Exclusión comprobada en ambas APIs de contacto y en eventos del navegador; abrir el enlace sigue funcionando. Los contadores anteriores se conservan porque no permiten atribuir retroactivamente cada clic a un administrador. |
| Destacar en el inicio | Checkbox sin recuadro adicional, alineado con los controles administrativos de verificación y revisión médica. |
| Restauración de Escort adicional | Conserva una autorización administrativa ya otorgada al anuncio al restaurarlo desde papelera, sin ampliar el cupo de una cuenta normal. |

## Edición de fotos guardadas por la cuenta propietaria

`ProfileMediaManager` y `AdminPhotoTools` siguen siendo el editor común. `GET/POST /api/perfiles/:profileId/media/:mediaId/procesar` verifica identidad propietaria, cuenta activa, anuncio sin papelera, foto pública, origen, revisión y límites de archivo. Fotos privadas, videos y archivos de otra cuenta no se admiten en esta API de efectos.

Editar una imagen aprobada crea una nueva fila pendiente y conserva la versión pública. El vínculo `replacesMediaId` reside en metadatos de R2 escritos por el servidor y se valida contra el anuncio y la aprobación de la base. El editor y el límite de fotografías cuentan una foto lógica; la cuota de bytes incluye ambas versiones mientras se revisa. Editar nuevamente reemplaza solo la versión pendiente.

Al aprobar, el archivo final ocupa el ID público original, preservando posición y condición de principal. Así las referencias de páginas almacenadas en caché no quedan apuntando a un medio eliminado. La fila pendiente y el objeto antiguo se retiran con limpieza registrada. Cancelar la edición pendiente mantiene la foto aprobada y la devuelve al editor. La autorización administrativa y de muestras conserva sus reglas previas. No se añade una migración SQL para este flujo.

Las opciones de efectos preparan vistas previas antes del guardado. La copia limpia de trabajo solo vive temporalmente en la pestaña: retirar una marca o un difuminado ya incorporado en un archivo antiguo requiere disponer de su original limpio. No se guarda un archivo histórico adicional en R2 para prometer una reversión permanente.

## Verificación local

- Paneles: **112 vistas verificadas**, siete superficies, ambos temas y anchos de 320, 360, 390, 430, 1366, 1920, 2560 y 3440px. Incluye acceso, búsqueda, detalle de cuenta, listado administrativo y medios de propietario, administración y muestra. Se comprobaron tamaño/anchura de campos, ubicación de colaboración, agrupación de principal, herramientas visibles, confirmación y retorno de foco, estados deshabilitados y desbordamiento.
- Medios guardados: **32 vistas verificadas** en ambos temas y esos ocho anchos. Cuatro acciones por lote fuera del desplegable y borrado visible, sin errores de página. La primera matriz de controles tenía un selector de QA con una etiqueta singular obsoleta; se corrigió el selector y esta matriz independiente pasó completa.
- Controles y cabecera: **64 vistas válidas** de registro, perfil real, muestra y ambos diseños de portada. Íconos de WhatsApp coherentes, aviso centrado, tres franjas de muestra y ausencia de desbordamiento. Los 32 fallos del selector de medios en esa ejecución inicial no eran fallos de producto; están cubiertos por la repetición anterior.
- Tráfico administrativo: cuatro vistas en ambos temas a 320 y 1366px. Contadores de anuncio y portal sin cambio, petición forzada de contacto sin cookie de visitante y sin eventos de medición; los enlaces conservan su destino. Sin errores de página.
- Operaciones locales de fotos: aplicar y retirar ambos efectos sobre principal y galería en los tres contextos; cancelar reemplazo pendiente; aprobar una principal conservando su ID público; borrar todas las fotos conservando video. Ante un fallo simulado en la segunda eliminación, el lote se detuvo tras dos peticiones y reconoció solo la primera eliminación confirmada.
- Acceso: reproducción en navegador del destino incorrecto del cambio de clave y repetición corregida; hash cambiado, sesiones de la cuenta afectada revocadas. Las pruebas de API incluyen contraseña propia, revisiones antiguas, origen no válido, sesión ajena, recibos y mensajes/cookies de acceso. Nunca se cambió una contraseña real de producción como prueba.
- Metadatos: recurso social genérico absoluto y accesible, sin datos personales en metadatos de muestra; archivo privado inaccesible sin autorización, `noindex` y política de frames conservados.

La compilación y la batería completa de `pnpm test` finalizaron con **552 pruebas aprobadas, sin fallos**. TypeScript y ESLint de los archivos afectados también aprobaron. Se eliminaron las cuentas, muestras y medios desechables mediante las APIs locales; se detuvieron los procesos de desarrollo/proxy y se retiró la configuración efímera de la comprobación. Las capturas, cookies y salidas de ejecución quedan fuera del repositorio. Estos resultados locales no acreditan por sí solos la publicación del commit ni la versión activa en Cloudflare.

## Límites y mantenimiento

- Una previsualización antigua de WhatsApp puede seguir en la caché del servicio o de un mensaje ya enviado, aunque la nueva ruta de imagen tenga fondo negro.
- La exclusión de métricas administrativas no corrige ni reconstruye el historial anterior.
- El diseño de muestra y anuncio real se mantiene en los componentes compartidos; futuras modificaciones deben probar ambos modos. Las interacciones demostrativas de muestra no deben convertirse en escrituras públicas.
- Estos cambios no constituyen una auditoría exhaustiva de todas las rutas o integraciones del sitio ni prueban la activación de proveedores externos.
- Publicar mediante el único flujo de `main` a Workers Builds: commit y push primero; comprobar checks y versión activa de Cloudflare antes de dar por sincronizada la entrega.
