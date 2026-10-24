# Interfaz, contenido y muestras privadas — 23 de octubre de 2026

## Dónde está cada herramienta

- **Muestras privadas:** https://chile3x.cl/admin/muestras
- **Contenido del sitio:** https://chile3x.cl/admin/contenido
- **Textos y SEO de ambas portadas:** https://chile3x.cl/admin/contenido/inicio
- **SEO e identidad global:** https://chile3x.cl/admin/contenido/seo
- **Diseño y tema activos:** https://chile3x.cl/admin/testing

Contenido reúne Noticias, Sitios asociados, Términos y privacidad, SEO e identidad, textos de las portadas y FAQ/reglas. Se retiraron sus accesos duplicados de Configuración. Las direcciones antiguas de configuración SEO/contenido redirigen al editor correspondiente. Cada editor conserva sus permisos.

## Cómo funcionan las muestras

1. Un administrador con permisos de cuentas y moderación abre **Crear muestra privada**. Confirma que dispone de autorización para usar los datos y las fotos.
2. Completa el formulario compartido de perfiles Escort. No se crea un usuario ni un anuncio público.
3. Después de guardar, puede editar los datos y subir hasta diez imágenes y tres videos, con un máximo conjunto de 45 MB. Las imágenes se optimizan en el dispositivo; los videos se preparan con el proceso compartido y el servidor comprueba su formato y duración. Los límites finales siguen las políticas generales: imágenes de hasta 10 MB y videos preparados de hasta 12 MB y 15 segundos.
4. **Previsualizar muestra** permite revisar el diseño real del perfil. Los botones de contacto son demostrativos: no abren conversaciones ni cuentan interacciones. No se generan reseñas, estadísticas, mapas externos o datos estructurados públicos.
5. **Crear / renovar enlace privado** entrega una invitación que dura siete días. Hay que copiarla entonces; la base de datos guarda su huella, no el enlace completo. Renovar o revocar invalida el acceso anterior, incluidas sus fotos.
6. Si la persona acepta, debe existir una cuenta destinataria activa y con correo verificado o con la excepción administrativa ya autorizada. Se puede crear o localizar desde **Cuentas** y regresar a la muestra.
7. **Migrar y publicar anuncio** requiere confirmar la aceptación, la titularidad y la revisión de las fotos. Crea el anuncio aprobado, sus detalles y su período inicial de cortesía de treinta días. Transfiere la propiedad de los mismos archivos, sin copiarlos. No sustituye anuncios existentes ni evita el límite de publicaciones de la cuenta. Tampoco concede verificación de identidad ni médica.

### Restricciones y seguridad

- Cualquier persona que reciba el enlace completo puede reenviarlo. Es un acceso por invitación, no una comprobación de identidad del receptor. Administración también puede consultar la muestra.
- La invitación lleva el secreto en el fragmento `#`, no en parámetros enviados al servidor al abrir la página. Se intercambia por una cookie HttpOnly, SameSite y Secure en HTTPS, restringida a esa muestra.
- Página y archivos llevan `noindex`, `no-store` y política de referencia restringida. No aparecen en directorios ni mapas del sitio. La autorización protege los archivos; `noindex` por sí solo no es una protección de acceso.
- El nombre de usuario del anuncio no queda reservado al preparar una muestra. Si otro anuncio/cuenta lo ocupa, debe corregirse antes de convertirla.
- Las muestras se eliminan automáticamente treinta días después de vencer, si no se renuevan. Eliminar una muestra ya convertida no elimina el anuncio real ni sus archivos transferidos.
- Cambios, reservas y revisiones simultáneas usan el sistema compartido de versiones y transacciones. Una revisión antigua se rechaza, no sobrescribe automáticamente lo que guardó otro administrador.
- No hay repetición automática de guardados con respuesta incierta. Se conserva el formulario y se pide comprobar el estado actual. Una subida incierta no elimina un archivo confirmado en la base de datos.

## Portadas y SEO

Se pueden editar por separado títulos, descripciones, metadatos sociales, encabezados, botones y textos de las dos portadas. El editor admite texto acotado, sin HTML o scripts. No cambia las ciudades, los destinos de los enlaces ni la estructura de encabezados.

Testing sigue siendo un **selector manual**, no un experimento que reparte visitantes entre dos variantes simultáneas. Solo la portada activa se renderiza públicamente, con una URL canónica `/`. La otra no tiene una página pública independiente que indexar. Cambiar la portada o sus metadatos puede requerir que los buscadores vuelvan a rastrearla; no garantiza nuevas posiciones ni plazos de indexación.

El tema Classic/Liquid Glass es independiente de la portada. El CSS exclusivo de Liquid Glass solo se enlaza cuando está activo. La caché distingue tema, portada, despliegue y revisión de contenido. No se cambió la selección de producción durante las pruebas.

La URL pública configurada no admite direcciones locales, rutas del PC, credenciales ni rutas de administración. El build público se comprobó sin mapas de fuentes ni rutas `C:/Users/`; sus sondeos directos se rechazan. Sin la captura original no se puede reconstruir con certeza el aviso histórico de PageSpeed.

## Interfaz

- DM Sans local y con licencia incluida. Se tomó de referencia la tipografía, los controles redondeados y el espaciado del proyecto Kuchitril, sin modificar ese proyecto.
- Acciones compartidas con iconos, separación y áreas de pulsación de al menos 44 px en los controles revisados. No se añadieron efectos de desenfoque grandes al encabezado o a los menús.
- Ambos paneles usan **← Volver al sitio web**, sin logo en la cabecera lateral. Su bloque lateral se redujo a aproximadamente 60 px de altura manteniendo el enlace pulsable.
- Se retiraron las iniciales circulares de los dos pies de menú. La identidad usa nombre de 14 px y texto secundario de 12 px; no cambia usuarios, correos, permisos ni la excepción visual de Benjamin.
- Se corrigieron el desborde móvil de las invitaciones de agencia y la alineación de tipo/número de documento en Mi cuenta.
- MILF no se combina con Hombres ni Trans: hay explicación en el formulario y validación adicional en servidor y base de datos. Un registro antiguo incompatible detectado no fue reclasificado silenciosamente; al editarlo hay que elegir la combinación correcta.

## Verificación y alcance

Pruebas automatizadas del proyecto, TypeScript, lint y build de producción; comprobación funcional local de creación, fotos, video real/falso, permisos, enlaces, revocación, caducidad, conflictos y conversión. También se comprobaron las cuatro combinaciones de portada/tema y la ausencia del contenido inactivo en el HTML y metadatos.

Se revisaron tamaños de 320, 360, 375, 390, 412, 430, 768, 1366 y 1920 px en Chrome, según la pantalla y el control, incluidas vistas de 390 × 844 de referencia para iPhone 16e. Esto es emulación de tamaños, no una prueba sobre Safari o un iPhone físico.

Se usaron las guías de Cloudflare, React y verificación de flujos para priorizar permisos en servidor, operaciones atómicas, carga condicional, controles accesibles y pruebas navegador/API/datos. No equivale a una auditoría de seguridad exhaustiva ni garantiza la ausencia de cualquier error.

Las comprobaciones de producción fueron de lectura: rutas públicas, Lalita, archivos, robots, sitemap y accesos administrativos. No se crearon cuentas ni anuncios ficticios en producción y no se contrató Workers Paid. El cambio visual no elimina los límites de CPU del plan gratuito.

Los registros detallados de pruebas y despliegue están en `outputs/qa-finish-*.log`, `outputs/qa-private-*.log` y `outputs/qa-content-production.log`, excluidos del sitio público y de Git.
