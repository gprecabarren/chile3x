# Chile3X

Chile3X es un directorio nacional para adultos en Chile. Reúne anuncios de Escort, Agencia y Arriendo, con publicación moderada, cobertura por región y ciudad, filtros, canales de contacto y herramientas operativas para anunciantes y administración.

El proyecto está construido para operar en Cloudflare con Workers, D1 y R2, sin depender de WordPress ni de un hosting tradicional.

## Estado funcional

La plataforma se encuentra en beta controlada. Los pagos y la venta automatizada de contenido no se procesan dentro de Chile3X: cualquier acuerdo comercial ocurre directamente entre las personas involucradas.

Actualmente incluye:

- Registro, inicio de sesión, verificación de correo, recuperación de acceso y cambio de contraseña desde la cuenta.
- Cuenta separada de anuncio: una cuenta puede administrar anuncios, y cada anuncio conserva su propio enlace público `@usuario-del-anuncio`.
- Nombre de usuario único por cuenta, generado al crearla y editable desde `Mi cuenta > Mis datos`. No puede coincidir con otra cuenta ni con el `@` de un anuncio.
- Una cuenta puede tener un anuncio Escort y varios anuncios de Agencia o Arriendo. Una Agencia puede solicitar incorporar anuncios Escort existentes, que requieren aceptación de la persona dueña.
- Formularios específicos por tipo de anuncio, borradores, envío a revisión, pausas, reapertura y periodos controlados manualmente.
- Moderación de anuncios, foto principal, galería, documentos privados, historias, reportes, reseñas y contenido exclusivo.
- Directorio nacional con regiones ordenadas por su número oficial, páginas de ciudad, filtros combinables, búsqueda por nombre, conteos de anuncios y orden aleatorio dentro de cada categoría.
- Etiquetas y filtros para nivel VIP, Premium y Gold, además de categorías complementarias y servicios. Las etiquetas incompatibles se validan tanto en interfaz como en servidor.
- Fichas públicas con contactos directos, redes sociales, tarifas por duración, disponibilidad semanal, agenda de viajes, galería, videos, historias, favoritos, likes, reseñas y reportes.
- Historias públicas de texto o imagen, con visualización por país, ciudad y resultado filtrado. Las historias de imagen caducan y se eliminan automáticamente de la base de datos según su ciclo de vida.
- Contenido exclusivo asociado a la cuenta del anunciante: puede mostrarse al final de un único anuncio Escort, pero permanece disponible para los compradores autorizados incluso si el anuncio se pausa o se elimina.
- Biblioteca privada para compradores en `Mi cuenta > Mi contenido`, donde cada acceso se muestra con el nombre de usuario de la cuenta vendedora, sin exponer correos.
- Panel administrativo para cuentas, anuncios, medios, documentos, reportes, reseñas, SEO, contenidos, noticias, FAQ, reglas de publicación y ajustes del sitio.
- Gestión de cuentas desde administración: búsqueda simple y avanzada, filtros combinables, detalle de datos, anuncios asociados, estado, creación de anuncios asistida, contraseña temporal, enlace de recuperación, WhatsApp y llamada directa cuando existe teléfono.
- Noticias administrables con metadatos SEO, imágenes moderadas y URLs públicas.
- Páginas de términos, privacidad, reglas de publicación, FAQ, contacto y quiénes somos editables desde configuración cuando corresponda.
- Aviso para mayores de 18 años, consentimiento de medición, Turnstile en formularios sensibles y modo mantenimiento.

## Modelo operativo

### Cuenta

Una cuenta identifica a una persona que visita, compra contenido, anuncia o administra el portal. Tiene correo, contraseña, nombre visible, nombre de usuario, datos personales protegidos y un estado de acceso.

El correo y la fecha de nacimiento no se modifican desde la cuenta para evitar suplantaciones. Los cambios que requieran corrección se gestionan por soporte. La cuenta puede cambiar su contraseña sin conocer la anterior mientras ya esté autenticada.

### Anuncio

Un anuncio es la publicación visible dentro del directorio. Tiene tipo, ciudad, perfil público, galería, estado de moderación, atributos, contactos y un identificador propio `@usuario-del-anuncio`.

- **Escort:** una por cuenta. Puede tener categorías, atributos, servicios, historias, agenda de viajes y una biblioteca de contenido exclusivo vinculada.
- **Agencia:** una cuenta puede crear varias. Puede invitar anuncios Escort existentes mediante un flujo de aceptación.
- **Arriendo:** una cuenta puede crear varios. No utiliza categorías reservadas a Escort.

Cambiar el tipo de un anuncio ya creado no está permitido. Si se necesita otro tipo, se crea un anuncio nuevo: así se conservan sus reglas, revisión y datos específicos de forma coherente.

### Moderación

Los anuncios no se muestran públicamente hasta que queden aprobados. La administración revisa el anuncio antes de aprobar sus medios. Los documentos de identidad y exámenes médicos, cuando se entregan, son privados y solo se muestran al equipo autorizado.

Una fotografía principal se modera por separado de la galería. Las nuevas fotos de la galería pública pueden recibir una marca Chile3X sutil según el ajuste del portal. Quien publica puede pedir difuminado de rostros por imagen; el procesamiento ocurre en su navegador antes de cargar el archivo. Foto principal, videos, historias y contenido exclusivo no se transforman. Los videos se validan por formato, peso y duración antes de quedar pendientes de revisión.

### Contenido exclusivo

Cada cuenta tiene una sola biblioteca privada. La persona anunciante puede:

1. Vincularla a uno de sus anuncios Escort o dejarla sin enlace público.
2. Subir fotos y videos privados que pasan por revisión.
3. Autorizar o retirar personas por `@nombre-de-usuario` o correo.
4. Ver únicamente el nombre de usuario de las personas autorizadas luego de otorgar acceso.

Las personas autorizadas encuentran ese material en `Mi cuenta > Mi contenido`. El acceso no depende del estado del anuncio vinculado: pausar o eliminar el anuncio no borra la biblioteca ni elimina el acceso otorgado. El anunciante puede retirarlo cuando corresponda.

Los archivos heredados de la antigua galería privada se migran a este modelo sin copiar ni duplicar los objetos de R2.

## Seguridad y privacidad

- Sesiones protegidas por cookies seguras y contraseñas derivadas con PBKDF2.
- GitHub OAuth solo para administración del sitio.
- Autorización comprobada en servidor en todas las rutas privadas de cuentas, archivos, moderación y contenido exclusivo.
- R2 no expone un bucket público: cada archivo se entrega mediante una ruta que comprueba propietario, administrador, estado de moderación y permiso de acceso.
- Documentos privados, evidencias de reportes y contenido exclusivo no se incluyen en respuestas públicas ni en sitemap.
- Turnstile protege registro, acceso y flujos sensibles contra automatización.
- Las claves y servicios externos se guardan como secretos de Cloudflare, nunca en el navegador, D1 ni Git.
- Se controla una cuota interna de medios antes del margen gratuito de R2 para evitar exceder almacenamiento de forma accidental.

## SEO, redes e indexación

- Títulos, descripciones, canonical, Open Graph, X Cards, favicon y datos estructurados por ruta.
- Un H1 por página y jerarquía semántica de encabezados para páginas públicas.
- URLs de ciudad orientadas a intención de búsqueda, enlazado interno, textos de cobertura y sitemap dinámico.
- `robots.txt`, `sitemap.xml`, `llms.txt`, imágenes con texto alternativo y rutas 404 propias.
- Metadatos sociales específicos para páginas públicas y anuncios compartibles.
- Google Tag Manager y Google Analytics se cargan únicamente tras el consentimiento de medición.
- El enlace de fuente preferida de Google se ubica en el pie de página y conserva una presentación discreta para no competir con la navegación principal.

## Infraestructura

- **Aplicación:** React y Vinext sobre Cloudflare Workers.
- **Base de datos:** Cloudflare D1 con Drizzle ORM y migraciones versionadas en `drizzle/`.
- **Archivos:** Cloudflare R2, con metadatos y permisos en D1.
- **Correo transaccional:** relay de Google Apps Script configurado como secreto de Cloudflare para verificación, restablecimiento de contraseña y avisos operativos.
- **Analítica:** Google Tag Manager, Google Analytics y Search Console, sujetos al consentimiento correspondiente.

Las uniones de infraestructura están definidas en [`.openai/hosting.json`](.openai/hosting.json): `DB` para D1 y `MEDIA` para R2. Los secretos nunca deben añadirse al repositorio.

## Procesos principales

### Crear y publicar un anuncio

1. La persona crea o inicia sesión en una cuenta.
2. Completa el formulario del anuncio y puede guardarlo como borrador.
3. Al enviar a revisión, el anuncio queda pendiente y puede completar documentos privados, foto principal y galería.
4. La administración revisa los datos, documentos y medios desde el panel.
5. Tras aprobarlo, el anuncio se incorpora a su ciudad, filtros y rutas públicas.

### Revisar una cuenta desde administración

1. Abrir `Administración > Cuentas`.
2. Buscar por nombre, correo, teléfono, ciudad, documento o usar filtros avanzados.
3. Abrir el detalle para revisar datos protegidos, anuncios asociados, estado y recuperación de acceso.
4. Desde la ficha se puede crear un anuncio en nombre de la cuenta, abrir sus anuncios pendientes, contactar por WhatsApp o llamada y cambiar el estado de acceso.

### Moderar medios

1. Abrir `Administración > Medios`.
2. Revisar los archivos agrupados por anuncio y las bibliotecas exclusivas agrupadas por cuenta.
3. Aprobar, cancelar aprobación o eliminar. La cancelación devuelve el archivo a revisión sin borrarlo.
4. Verificar primero el anuncio y después sus documentos y medios relacionados.

### Preparar fotos de la galería pública

1. La persona abre su anuncio y elige archivos en **Galería pública**.
2. Para cada foto puede activar **Difuminar rostros** si el administrador tiene la función disponible.
3. El navegador indica preparación, detección de rostros, marca de agua y carga. Si la detección no puede ejecutarse, esa foto no se carga hasta que se desactive esa opción o se intente con otra imagen.
4. La marca de agua y el difuminado se ajustan en `Administración > Configuración > Fotos de galería`; los cambios solo afectan futuras fotos.

### Operar contenido exclusivo

1. La persona anunciante abre `Mi cuenta > Mi contenido`.
2. Elige su único anuncio Escort vinculado si quiere que la sección bloqueada aparezca públicamente.
3. Sube archivos y espera la moderación.
4. Autoriza compradores por usuario o correo. Después de autorizar, solo ve `@usuario` en su lista.
5. El comprador abre `Mi cuenta > Mi contenido` para ver sus bibliotecas desbloqueadas.

## Desarrollo local

Requiere Node.js 22.13 o superior y pnpm.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm db:generate
pnpm build
```

Al cambiar [`db/schema.ts`](db/schema.ts), generar la migración, revisar el SQL y mantenerla dentro de `drizzle/` antes de publicar. Las migraciones de datos deben preservar registros y archivos existentes.

## Publicación

La rama principal se publica en el Worker configurado para Chile3X. Antes de cada despliegue se debe comprobar como mínimo:

1. `pnpm lint` sin errores.
2. `pnpm build` sin errores.
3. Migración de D1 generada e inspeccionada si hubo cambios de esquema.
4. Prueba manual de registro, sesión, creación de anuncio, moderación, permisos de contenido exclusivo y una vista móvil.
5. Revisión de `https://chile3x.cl/sitemap.xml`, `https://chile3x.cl/robots.txt` y una URL pública representativa.

## Límites y decisiones pendientes

- Los pagos, cobros, suscripciones automatizadas y venta interna de contenido no están habilitados. La biblioteca exclusiva funciona como control de acceso manual otorgado por el anunciante.
- La verificación de identidad y salud es manual. Los archivos son privados, pero la decisión final corresponde al equipo administrador.
- El orden de anuncios se aleatoriza dentro de la misma categoría para distribuir exposición; los niveles VIP, Premium y Gold mantienen su prioridad.
- Antes de abrir masivamente el registro, conviene revisar el flujo completo en móvil y escritorio con cuentas de prueba y definir tiempos operativos de aprobación.
