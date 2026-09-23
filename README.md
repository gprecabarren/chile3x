# Chile3X

Chile3X es un directorio nacional para adultos en Chile. Reúne anuncios de Escort, Agencia y Arriendo, con publicación moderada, cobertura por región y ciudad, filtros, canales de contacto y herramientas operativas para anunciantes y administración.

El proyecto está construido para operar en Cloudflare con Workers, D1 y R2, sin depender de WordPress ni de un hosting tradicional.

## Revisión de errores — septiembre de 2026

- La caché compartida guarda únicamente documentos anónimos. Las sesiones de usuario y administrador, los paneles y las respuestas de navegación no comparten caché; el navegador debe consultar otra vez después de ingresar o cerrar sesión. Cada despliegue usa el identificador de versión del Worker en su clave, por lo que una versión nueva nunca vuelve a entregar HTML de una versión anterior.
- Deshabilitar una cuenta oculta sus anuncios, historias y metadatos públicos sin alterar el estado de moderación guardado. Administración conserva el acceso para revisarlos. El contenido exclusivo autorizado sigue dependiendo de su biblioteca de cuenta, no del estado del anuncio.
- El inicio respeta anuncios ocultos tanto en destacados como en historias. Los accesos para anunciarse llevan al formulario de anuncio cuando ya hay sesión.
- La creación asistida de anuncios desde una cuenta vuelve a reconocer correctamente su propietario y si ya tiene un anuncio Escort.
- Un error al ingresar conserva la página de destino. Los retornos rechazan URLs externas o malformadas y mantienen filtros y anclas. Un fallo al registrar conserva los datos no sensibles; si la cuenta ya se guardó pero falló el envío de correo, permite reenviar la verificación sin intentar crearla otra vez.
- Las reseñas tienen un orden determinista incluso con fechas idénticas; todas continúan accesibles mediante «Ver más reseñas».
- Los medios públicos revalidan su disponibilidad antes de reutilizarse. Las imágenes sin cambios pueden responder con `304`, evitando descargarlas nuevamente.
- El menú móvil recupera texto legible y controles más cómodos. Hasta 480 px, Agencias y Arriendos quedan agrupados bajo «Directorio» en el menú; Regiones, Escorts e Iniciar sesión/Mi cuenta permanecen visibles. El menú tiene nombre accesible, cierre con Escape y altura limitada con desplazamiento interno. En PC, los iconos de contacto quedan alineados justo debajo de «Iniciar sesión» dentro del propio bloque de navegación, sin ocupar una fila completa ni chocar con las acciones principales.
- Las navegaciones entre el directorio y una ficha reinician el desplazamiento de inmediato. El sitio no aplica desplazamiento suave global porque un toque durante esa animación podía dejar un anuncio abierto a mitad o al final de la página en dispositivos móviles.
- Los consentimientos del registro tienen casillas de 22 px. Se retiró la carga innecesaria de la biblioteca de Google Preferred Sources, cuyo botón ya estaba desactivado.
- Las cuentas públicas distinguen la deshabilitación voluntaria del bloqueo administrativo. La primera se revierte mediante una confirmación segura al volver a iniciar sesión; la segunda solo puede retirarla el equipo administrador. Si ambos estados coinciden, prevalece el bloqueo administrativo.
- Cada persona puede ocultar y volver a mostrar sus anuncios sin borrar datos ni cambiar su aprobación. La pausa ligada a futuros períodos pagados conserva su lógica en el servidor, pero sus controles públicos permanecen deshabilitados hasta activar la facturación.
- Los cambios que afecten únicamente teléfono, WhatsApp, correo público o redes de un anuncio aprobado se publican inmediatamente. Las modificaciones editoriales, de ubicación, categorías, servicios o precios siguen regresando a revisión.
- Tanto la persona como administración pueden eliminar permanentemente una cuenta pública mediante confirmación reforzada. Se borran cuenta, anuncios, medios y relaciones identificables; solo queda una huella criptográfica sin correo legible para informar un registro posterior con la misma dirección. El otro participante puede conservar el texto de un chat previo, pero la cuenta eliminada queda desprendida y aparece únicamente como “Usuario de Chile3X”.
- `Administración > Cuentas` aplica búsqueda, estado y anuncios asociados directamente en D1 y pagina de 30 en 30. Se desactivó la precarga automática de fichas pesadas para impedir ráfagas de solicitudes RSC al abrir un listado.
- `Administración > Medios > Medios por cuenta` reúne galerías públicas y contenido exclusivo por propietario, prioriza cuentas con archivos en revisión y permite filtrar por cuenta, estado y tipo de archivo. Cada vista obtiene de D1 solo los 12 grupos de la página actual.
- Los formularios y filtros muestran un indicador global mientras procesan. Si la respuesta supera doce segundos, se presenta una advertencia explícita de demora sin volver a enviar la operación automáticamente.
- En pantallas móviles, el acceso flotante a WhatsApp queda fijado abajo a la derecha para no cubrir títulos ni controles.
- Los paneles de administración y de cuenta utilizan Manrope autohospedada como tipografía de interfaz. Los botones de acción usan texto de 13–14 px acorde con su altura táctil, manteniendo compactos los controles que solo contienen iconos.
- Las cuatro tarjetas del resumen administrativo funcionan como accesos directos a todos los anuncios, anuncios pendientes, archivos pendientes y anuncios pausados. El aviso rojo de moderación queda separado visualmente de las métricas para mejorar la jerarquía en móvil y escritorio.
- Cada cuenta pública y cada identidad administrativa puede revisar sus sesiones activas desde su resumen. Se muestran dispositivo, navegador, método de ingreso, IP, ubicación aproximada, inicio, última actividad y vencimiento; la sesión actual queda identificada y las demás se pueden cerrar por separado o en conjunto.
- Todos los niveles administrativos pueden abrir su resumen para gestionar sus propios dispositivos. Las estadísticas privadas siguen apareciendo solo a los roles autorizados y el panel operativo global queda restringido a Propietario y Administrador.
- El resumen administrativo incorpora errores registrados, correos fallidos, duración de operaciones y una revisión agregada de D1/R2. La comparación de almacenamiento es manual, tiene un límite seguro de 20.000 objetos, no elimina archivos y conserva solo cantidades y tamaños, nunca claves privadas de R2.
- La explicación interna sobre cómo se priorizan o destacan anuncios en el inicio solo aparece cuando existe una sesión pública o administrativa; los visitantes anónimos continúan viendo los anuncios destacados, pero no ese criterio operativo ni su estado vacío.
- En pantallas móviles, seleccionar cualquier enlace de «Secciones de administración» o «Secciones de mi cuenta» repliega el menú en el acto para que la página elegida quede visible y el cambio de sección sea evidente.
- Se incorporó el ecosistema de Telegram de Chile3X: una sola Comunidad con un espacio público y otro privado para Miembros, vinculación segura de identidades, invitaciones temporales, moderación automática conservadora y auditoría administrativa.
- `Novedades` es un canal separado del blog editorial. Una publicación creada en `Administración > Telegram` se envía mediante un outbox durable al tema configurado, y una publicación enviada por un administrador autorizado desde Telegram aparece en `/novedades` sin duplicarse.
- El acceso a Miembros exige una cuenta activa con correo verificado y una identidad Telegram vinculada. No requiere un anuncio aprobado y nunca se restablece automáticamente después de deshabilitar, reactivar o desvincular una cuenta: la persona debe usar «Volver a entrar».
- Deshabilitar o eliminar una cuenta revoca su acceso a Telegram. Administración puede vetar o retirar el veto desde la ficha de la cuenta; `/unban` solo modifica vínculos que estén realmente vetados y no puede revertir una desvinculación voluntaria.
- Los permisos de Telegram respetan las mismas funciones granulares del panel: `telegram.view`, `telegram.publish`, `telegram.moderate` y `telegram.manage`. Ser administrador de un chat no permite usar al bot para exceder la función asignada en Chile3X.
- El webhook valida un secreto con comparación segura, mide el cuerpo real en bytes, deduplica por `update_id`, procesa mediante Cloudflare Queues y borra el contenido del evento después de completarlo. Las tomas de trabajos de webhook y outbox son atómicas para soportar entregas repetidas.
- El enlace público de Telegram se configura una sola vez desde administración y alimenta el encabezado, pie de página y paneles. La ruta pública `/novedades` se incluye en el sitemap.
- El encabezado muestra Telegram como un acceso compacto junto a WhatsApp y correo, reutilizando el mismo icono del footer. Después de iniciar sesión, `Mi cuenta` ofrece el botón largo destacado y una guía visual de tres pasos para vincularse y entrar a Miembros.
- El panel de Telegram consulta la salud real del webhook, muestra actualizaciones pendientes y el último error informado por Telegram, documenta el recorrido completo y permite filtrar moderación por texto, estado, medida y gravedad.
- La vinculación administrativa muestra un recorrido numerado y su estado pendiente, puede abrirse desde la propia fila del administrador y no activa el aviso global de demora al entregar el control a Telegram. El aviso de demora tampoco muestra el logotipo, evitando la versión deformada que producía el contenedor estrecho.
- Los accesos compactos del encabezado conservan un ancho cuadrado fijo para que WhatsApp, Telegram y correo no se aplasten cuando comparten espacio con la sesión o la navegación.
- El perfil del bot, su ayuda privada y los menús de comandos se administran mediante la Bot API: `/start` y `/help` explican el acceso, `/rules` queda disponible para toda la comunidad y los comandos sensibles siguen limitados a administradores vinculados y autorizados.
- «Iniciar con Apple» quedó implementado de extremo a extremo y visible, pero deliberadamente deshabilitado hasta contar con Apple Developer. El panel permite guardar los identificadores sin publicar el acceso, comprueba por separado los secretos de Cloudflare y no permite activar una configuración incompleta.
- El botón Apple deshabilitado conserva la misma jerarquía visual que Google sin mostrar junto a él el texto técnico sobre Apple Developer; la explicación y la configuración permanecen únicamente en el panel administrativo y esta documentación.
- El flujo Apple valida firma, emisor, audiencia, vigencia, nonce, correo verificado e identificador estable; impide reutilizar correos de Google o administración, conserva el correo bloqueado, precarga nombres editables y cifra la autorización necesaria para revocarla al eliminar la cuenta.
- `/patrocinadores` publica la nueva guía **Sitios asociados** con un H1 único, grupos múltiples con H2, canonical, metadatos sociales, `CollectionPage`/`ItemList` y entrada condicional en el sitemap. Mientras exista un único grupo, su nombre genérico no ocupa espacio visual; al crear un segundo, aparecen los encabezados editables de todos los grupos. El acceso queda deliberadamente discreto en el footer y al final del menú hamburguesa; no se añadió una tarjeta de Paradisse.
- `Administración > Sitios asociados` permite publicar u ocultar toda la página, crear grupos desplegables, ordenar grupos y tarjetas, cargar o reemplazar fondos y logos en R2, marcar enlaces compensados y mantener cada tarjeta sin título o subtítulo visible. El botón ofrece `Contactar` y `Conocer más` como sugerencias, pero acepta cualquier texto breve personalizado.
- La selección inicial contiene ocho sitios autorizados tomados como referencia visual de Paradisse y los tres directorios ya presentes en el footer: Open Adult Directory, AngelisNET y Foro La EstoKada. Los banners horizontales usan un modo de marca centrado para conservar la imagen completa en escritorio y móvil.
- Cada anuncio público real ofrece un chat interno a cuentas con sesión. La bandeja conserva el anuncio de origen y el historial, muestra mensajes sin leer en la navegación, admite silencio y bloqueo, limita envíos repetidos y advierte antes de compartir contraseñas, códigos, documentos o datos bancarios. Al deshabilitar o eliminar una cuenta, el otro participante ve “Usuario de Chile3X”, sin foto, enlace ni nombre que identifique a la persona, y no puede enviarle nuevos mensajes. Los avisos del navegador son voluntarios y funcionan mientras Chile3X permanece abierto.
- El indicador `Online` se deriva de actividad reciente y visible de la cuenta propietaria. El navegador envía como máximo un pulso cada 45 segundos cuando existe interacción; el indicador público vence aproximadamente a los tres minutos y nunca expone la hora exacta.
- El selector completo de región y ciudad aparece solo dentro de los directorios, categorías y filtros. La portada muestra una referencia compacta de la ciudad priorizada y sus cercanas, sin recargar la cabecera. Si se usa geolocalización, la comparación con las ciudades cubiertas ocurre en el navegador y Chile3X guarda solamente el identificador de la ciudad preferida, nunca las coordenadas GPS.
- Los clics de WhatsApp mantienen el conteo diario anónimo existente. Cuenta, ubicación aproximada de Cloudflare, dispositivo y ruta solo se agregan cuando la persona aceptó la medición; no se conserva la IP en ese registro. Administración puede revisar los últimos eventos desde `Administración > Actividad`.
- `Administración > Actividad` incluye además un centro filtrable de notificaciones para cuentas registradas y anuncios creados o modificados, con estados leído/no leído y vínculos directos a la ficha correspondiente.
- Una cuenta deshabilitada conserva sus anuncios para revisión administrativa, pero no puede crear ni aprobar publicaciones y sus anuncios no se entregan públicamente. El panel identifica expresamente estos casos.
- Si una identidad Telegram vinculada cambia su `@usuario` o nombre, el webhook actualiza los datos mostrados en el panel con el siguiente mensaje o evento recibido de esa persona.
- Manrope se sirve desde el mismo dominio mediante WOFF2, sin rutas locales de Windows. Los módulos de privacidad y progreso se cargan después del contenido principal y Google Tag Manager se posterga hasta una interacción o doce segundos para reducir JavaScript no utilizado durante la carga crítica.
- La revisión de PageSpeed Insights del 23 de septiembre de 2026 obtuvo 87/100 en rendimiento móvil y 96/100 en escritorio, con 100/100 en accesibilidad, buenas prácticas y SEO. El logo visible usa una variante WebP ajustada a su tamaño real, el banner principal bajó de 94 KiB a unos 16 KiB y la insignia de AngelisNET se sirve localmente para eliminar su caché e imagen externas. El Worker añade `Cross-Origin-Opener-Policy: same-origin-allow-popups`, compatible con el acceso de Google.
- Las alertas restantes de Lighthouse asociadas a `beacon.min.js` de Cloudflare Web Analytics dependen de ese proveedor. La aplicación no duplica el script ni intenta falsear su caché; los mapas de origen permanecen fuera de producción para no publicar el código fuente. La CSP bloquea atributos de script en línea y conserva únicamente la compatibilidad mínima que necesita el arranque de React/vinext; migrarla a nonces y Trusted Types requiere soporte completo del runtime antes de retirar `unsafe-inline`.

Verificación reproducible:

```sh
pnpm lint
pnpm typecheck
pnpm test
```

Las 67 pruebas automáticas cubren el Worker compilado, aislamiento de caché por versión y por preferencia territorial, fallos de caché, retornos seguros, datos de reintento sin contraseñas, la criptografía y los estados de Apple, mensajería privada y anonimización, presencia reciente, ubicación minimizada, clics de contacto consentidos, notificaciones administrativas, cuentas deshabilitadas, actualización de identidad Telegram, Manrope autohospedada, la entrega de los flujos de vinculación a Telegram sin falsos avisos de espera, las protecciones de interfaz para la cabecera y el desplazamiento entre el directorio y una ficha, y el CRUD, SEO, visibilidad, orden y almacenamiento del catálogo de sitios asociados. Con `pnpm dev` y las migraciones aplicadas **solo a la D1 local**, `node scripts/qa-local.mjs` comprueba paneles, creación asistida, cuentas deshabilitadas, anuncios ocultos, paginación de reseñas y revocación de sesión usando cuentas ficticias. Después se ejecuta `node scripts/qa-local.mjs cleanup`, que elimina únicamente esas cuentas y anuncios locales. Nunca ejecutar estas pruebas contra producción ni subir los estados temporales de `outputs/`.

La caché de documentos anónimos dura hasta 600 segundos dentro de una misma versión: una moderación puede tardar ese intervalo en reflejarse en una página ya cacheada, pero un despliegue invalida de inmediato el contenido anterior. Las páginas con sesión, los paneles y las respuestas de navegación no utilizan esa caché compartida. Las pruebas de tamaños móviles no sustituyen una comprobación en un iPhone físico ni una prueba de carga sostenida en Cloudflare.

## Estado funcional

La plataforma se encuentra en beta controlada. Los pagos y la venta automatizada de contenido no se procesan dentro de Chile3X: cualquier acuerdo comercial ocurre directamente entre las personas involucradas.

Actualmente incluye:

- Registro, inicio de sesión, verificación de correo, recuperación de acceso y cambio de contraseña desde la cuenta. Como alternativa, el botón oficial de Google permite vincular un correo verificado sin guardar tokens de acceso ni solicitar Gmail, Drive, contactos o calendario. El acceso con Apple está preparado con la misma lógica y se muestra deshabilitado hasta completar su configuración externa.
- Cuenta separada de anuncio: una cuenta puede administrar anuncios, y cada anuncio conserva su propio enlace público `@usuario-del-anuncio`.
- Nombre de usuario único por cuenta, generado al crearla y editable desde `Mi cuenta > Mis datos`. No puede coincidir con otra cuenta ni con el `@` de un anuncio.
- Una cuenta puede tener un anuncio Escort y varios anuncios de Agencia o Arriendo. Una Agencia puede solicitar incorporar anuncios Escort existentes, que requieren aceptación de la persona dueña.
- Formularios específicos por tipo de anuncio, borradores, envío a revisión y ocultamiento reversible. La pausa y los períodos pagados están preparados pero deshabilitados en la interfaz hasta activar la facturación.
- Moderación de anuncios, foto principal, galería, documentos privados, historias, reportes, reseñas y contenido exclusivo.
- Directorio nacional con regiones ordenadas por su número oficial, páginas de ciudad, filtros combinables, búsqueda por nombre, conteos de anuncios y orden aleatorio dentro de cada categoría.
- Etiquetas y filtros para nivel VIP, Premium y Gold, además de categorías complementarias y servicios. Las etiquetas incompatibles se validan tanto en interfaz como en servidor.
- Fichas públicas con contactos directos, redes sociales, tarifas por duración, disponibilidad semanal, agenda de viajes, galería, videos, historias, favoritos, likes, reseñas, reportes y un botón para compartir por las opciones del dispositivo o mediante WhatsApp, Telegram, correo y copia de enlace.
- Chat privado asociado al anuncio, con historial, bandeja, no leídos, silencio, bloqueo, límites anti-spam y avisos voluntarios del navegador; las fotografías públicas usan esquinas levemente redondeadas y los anuncios muestran `Online` solo durante actividad reciente.
- Selector rápido de región y ciudad dentro de los directorios. En la portada solo aparece un resumen compacto después del bloque principal. La geolocalización es voluntaria, se resuelve localmente contra la cobertura disponible y solo persiste la ciudad elegida para priorizar resultados.
- El distintivo de verificación abre una explicación con foto, fecha de aprobación e información sobre la revisión de identidad y documento. Las cantidades de favoritos y «Me gusta» permanecen visibles junto a cada acción.
- Una cuenta con sesión iniciada puede solicitar avisos para las ciudades que ya tienen anuncios públicos. Si el anuncio cambia a esa ciudad y administración vuelve a aprobarlo, recibe un correo único; su dirección nunca se expone al anunciante.
- Historias públicas de texto o imagen, con visualización por país, ciudad y resultado filtrado. Las historias de imagen caducan y se eliminan automáticamente de la base de datos según su ciclo de vida.
- Contenido exclusivo asociado a la cuenta del anunciante: puede mostrarse al final de un único anuncio Escort, pero permanece disponible para los compradores autorizados incluso si el anuncio se pausa o se elimina.
- Biblioteca privada para compradores en `Mi cuenta > Mi contenido`, donde cada acceso se muestra con el nombre de usuario de la cuenta vendedora, sin exponer correos.
- Panel administrativo para cuentas, anuncios, medios, documentos, reportes, reseñas, SEO, contenidos, noticias, FAQ, reglas de publicación y ajustes del sitio.
- Administración de sesiones y dispositivos dentro de los resúmenes existentes, disponible para cuentas visitantes, anunciantes, testers y todos los niveles administrativos, sin crear una sección adicional.
- Panel operativo desplegable en el resumen administrativo, con filtros por período, área y resultado, historial de eventos, entrega de correos y auditorías agregadas de D1/R2.
- Comunidad Telegram administrable desde `Administración > Telegram`, con chats descubiertos, asignación de roles, normas, límites anti-spam, vinculación administrativa, casos de moderación, auditoría y Novedades bidireccionales.
- Integración de cuenta en `Mi cuenta > Telegram`, con vínculo de doble confirmación, acceso manual a Miembros, revocación y mensajes claros para cuentas vetadas o deshabilitadas.
- Página pública de sitios asociados administrada íntegramente desde el panel, con grupos, orden, imágenes propias en R2, textos opcionales, enlaces externos trazables y desactivación completa sin dejar enlaces públicos ni URLs indexables.
- Pestaña **Administradores** para autorizar usuarios exactos de GitHub, asignar funciones, cerrar sus sesiones y revocar o reactivar accesos sin tocar el repositorio.
- Cada invitación administrativa reserva desde el inicio un correo verificado de GitHub. Ese correo no puede coexistir con una cuenta de anunciante o tester, y GitHub debe confirmarlo durante el primer acceso.
- Historial administrativo separado y paginado: identifica a cada administrador por su cuenta interna y GitHub, registra fecha/hora, resultado, objeto afectado y valores anteriores/posteriores, con filtros por administrador, área, acción, objeto, resultado y rango de fechas.
- Gestión de cuentas desde administración: búsqueda simple y avanzada, filtros combinables, detalle de datos, anuncios asociados, estado, creación de anuncios asistida, contraseña temporal, enlace de recuperación, WhatsApp y llamada directa cuando existe teléfono.
- Noticias administrables con metadatos SEO, imágenes moderadas y URLs públicas.
- Páginas de términos, privacidad, reglas de publicación, FAQ, contacto y quiénes somos editables desde configuración cuando corresponda.
- Aviso para mayores de 18 años, consentimiento de medición, Turnstile en formularios sensibles y modo mantenimiento.
- Transición de carga global liviana, basada solo en CSS y dos corazones abstractos —sin el logotipo—, con demora breve para no parpadear en navegaciones rápidas ni agregar peticiones externas. Los formularios usan únicamente un indicador circular y texto de estado.

## Modelo operativo

### Cuenta

Una cuenta identifica a una persona que visita, compra contenido, anuncia o administra el portal. Tiene correo, contraseña, nombre visible, nombre de usuario, datos personales protegidos y un estado de acceso.

El correo y la fecha de nacimiento no se modifican desde la cuenta para evitar suplantaciones. Los cambios que requieran corrección se gestionan por soporte. Una cuenta vinculada a Google o Apple conserva permanentemente el correo verificado con el que se creó. La cuenta puede cambiar su contraseña sin conocer la anterior mientras ya esté autenticada.

Desde `Mi cuenta > Mis datos`, la persona puede deshabilitar temporalmente su acceso o eliminarlo permanentemente. Una cuenta deshabilitada voluntariamente conserva sus datos y ofrece restablecimiento confirmado en el siguiente ingreso. Un bloqueo administrativo impide ese restablecimiento hasta que Chile3X lo retire. La eliminación permanente no conserva anuncios, medios, accesos ni datos personales y crea una cuenta completamente nueva si el correo vuelve a registrarse.

### Anuncio

Un anuncio es la publicación visible dentro del directorio. Tiene tipo, ciudad, perfil público, galería, estado de moderación, atributos, contactos y un identificador propio `@usuario-del-anuncio`.

`Mi cuenta > Mis anuncios` y la pantalla de edición permiten ocultar o volver a mostrar la publicación inmediatamente. Esto es independiente del estado de moderación y de la futura pausa de un período pagado. Actualizar solo los contactos públicos también es inmediato; cualquier otro cambio sustantivo vuelve a revisión administrativa.

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
- Cada inicio guarda únicamente los datos necesarios para reconocer la sesión: método, agente del navegador, IP y ubicación aproximada entregada por Cloudflare. No se guardan coordenadas, GPS ni una ubicación precisa; los registros se eliminan al cerrar o invalidar la sesión y dejan de ser válidos al vencer.
- Cerrar dispositivos exige una sesión autenticada, origen válido y coincidencia de propietario en el servidor. Una cuenta nunca puede cerrar ni consultar sesiones ajenas desde la interfaz pública.
- GitHub OAuth solo para administración del sitio.
- Google Identity Services se utiliza solo para cuentas públicas. El servidor valida la firma RS256, emisor, audiencia, vigencia, nonce, correo verificado e identificador estable `sub` antes de crear una sesión; no acepta el correo enviado directamente por el navegador como prueba de identidad.
- Sign in with Apple está preparado solo para cuentas públicas. Usa estado y nonce de un solo uso guardados en D1, valida el `id_token` RS256 con las claves públicas de Apple, crea el secreto de cliente ES256 por solicitud y cifra con AES-GCM cualquier autorización de revocación; los secretos permanecen exclusivamente en Cloudflare.
- Solo la identidad propietaria protegida —GitHub `gprecabarren` con `genaropiedra@hotmail.com` verificado por GitHub— puede abrir **Administradores**, agregar o eliminar accesos y cambiar sus niveles. Ser colaborador del repositorio no concede acceso al panel.
- Cada GitHub autorizado queda vinculado a una cuenta administrativa independiente; nunca se reutiliza la identidad de otro administrador. El historial conserva una copia del nombre, correo y usuario de GitHub usados en el momento de cada acción, incluso si más adelante cambia la cuenta.
- Un correo verificado solo puede pertenecer al panel administrativo o a una cuenta pública de anunciante/tester, nunca a ambos. Tampoco puede dividirse entre Google y Apple: los conflictos se rechazan al registrar, al crear cuentas desde administración, al vincular un proveedor y al primer ingreso administrativo con GitHub.
- Los niveles disponibles son Administrador (todo salvo gestionar administradores), Moderación, Noticias y Soporte. La autorización se consulta en D1 en cada petición; revocar un acceso invalida sus sesiones inmediatamente. La identidad propietaria no puede revocarse, degradarse ni modificarse desde la web.
- Contraseñas, hashes, tokens, secretos y claves de R2 se eliminan automáticamente de las capturas del historial administrativo.
- Autorización comprobada en servidor en todas las rutas privadas de cuentas, archivos, moderación y contenido exclusivo.
- R2 no expone un bucket público: cada archivo se entrega mediante una ruta que comprueba propietario, administrador, estado de moderación y permiso de acceso.
- Documentos privados, evidencias de reportes y contenido exclusivo no se incluyen en respuestas públicas ni en sitemap.
- Turnstile protege registro, acceso y flujos sensibles contra automatización.
- Las claves y servicios externos se guardan como secretos de Cloudflare, nunca en el navegador, D1 ni Git.
- Telegram valida cada webhook con `TELEGRAM_WEBHOOK_SECRET`; `TELEGRAM_BOT_TOKEN` se usa solo en solicitudes HTTPS salientes a la Bot API. Ninguno se guarda en D1, respuestas, HTML o registros del repositorio.
- Las identidades públicas de Telegram y las identidades administrativas permanecen en tablas separadas. Una acción administrativa iniciada en Telegram exige un acceso GitHub vigente, una vinculación activa, la capacidad granular del sitio y permisos reales de administrador en el chat.
- Se controla una cuota interna de medios antes del margen gratuito de R2 para evitar exceder almacenamiento de forma accidental.

## SEO, redes e indexación

- Títulos y descripciones orientados de forma natural a búsquedas como «escorts», «damas de compañía» y sus variantes locales, sin repetir términos de manera artificial.
- Canonical, Open Graph, X Cards y favicon oficial con versiones para navegador, Apple y manifiesto web.
- Un H1 por página y jerarquía semántica de encabezados para páginas públicas.
- URLs de ciudad orientadas a intención de búsqueda, enlazado interno, textos de cobertura y sitemap XML dinámico en `/sitemap.xml`. La portada expone cada ciudad mediante un `ItemList` con enlaces válidos a su página local; una página HTML normal nunca debe enviarse a Search Console como sitemap.
- `/patrocinadores` usa contenido semántico y datos estructurados de colección. Cuando administración la oculta, desaparece del footer, del menú móvil y del sitemap; visitantes reciben `404` y los metadatos de la vista administrativa indican `noindex` y `noarchive`.
- `robots.txt`, `sitemap.xml`, `llms.txt`, imágenes con texto alternativo y rutas 404 propias.
- Metadatos sociales específicos para páginas públicas y anuncios compartibles.
- Google Tag Manager y Google Analytics se cargan únicamente tras el consentimiento de medición.
- El antiguo enlace de fuente preferida de Google permanece desactivado y no se muestra en el encabezado ni en el pie de página.

## Infraestructura

- **Aplicación:** React y Vinext sobre Cloudflare Workers.
- **Base de datos:** Cloudflare D1 con Drizzle ORM y migraciones versionadas en `drizzle/`.
- **Archivos:** Cloudflare R2, con metadatos y permisos en D1.
- **Correo transaccional:** relay de Google Apps Script configurado como secreto de Cloudflare para verificación, restablecimiento de contraseña y avisos operativos.
- **Analítica:** Google Tag Manager, Google Analytics y Search Console, sujetos al consentimiento correspondiente.
- **Observabilidad interna:** eventos operativos agregados en D1 para entregas de correo, autenticación, errores controlados y revisiones de almacenamiento. No se guardan destinatarios, tokens, IP de visitantes ni claves de objetos en este historial.
- **Autenticación pública opcional:** Google Identity Services con un cliente web configurado por ID público en `Administración > Configuración > Google`; el secreto de cliente no se usa ni se almacena en Chile3X. Apple está preparado en `Administración > Configuración > Inicio con Apple`, pero permanece deshabilitado hasta configurar una membresía, los identificadores y dos secretos del Worker.
- **Telegram:** webhook y Bot API ejecutados por el mismo Worker, tablas D1 versionadas, cola principal `chile3x-telegram`, cola de mensajes no procesables `chile3x-telegram-dlq` y cron cada cinco minutos para recuperar trabajos interrumpidos y limpiar datos temporales.
- **Sitios asociados:** grupos, orden, visibilidad y textos en D1; imágenes principales y logos en el bucket R2 existente bajo el prefijo protegido `sponsors/`. La auditoría operativa cuenta estos archivos sin exponer sus claves.

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
3. Abrir el detalle para revisar datos protegidos, anuncios asociados, deshabilitación voluntaria, bloqueo administrativo, registros anteriores del mismo correo y recuperación de acceso.
4. Desde la ficha se puede crear un anuncio en nombre de la cuenta, abrir sus anuncios pendientes, contactar por WhatsApp o llamada, aplicar o retirar únicamente el bloqueo administrativo y eliminar permanentemente la cuenta con confirmación.

### Moderar medios

1. Abrir `Administración > Medios`.
2. Elegir galerías por anuncio, contenido exclusivo por cuenta o **Medios por cuenta**. Esta última vista muestra primero las cuentas con pendientes y permite buscar por correo, usuario o nombre, además de filtrar estado y fotos/videos.
3. Aprobar, cancelar aprobación o eliminar. La cancelación devuelve el archivo a revisión sin borrarlo.
4. Verificar primero el anuncio y después sus documentos y medios relacionados.

### Revisar el historial administrativo

1. Abrir `Administración > Actividad`.
2. Buscar por administrador, cuenta, anuncio, correo o identificador, o combinar filtros de área, acción, objeto, resultado y fechas.
3. Abrir el detalle de un evento para comparar los valores anteriores y posteriores. Los eventos de eliminación conservan solo metadatos seguros, nunca el archivo ni sus claves privadas.
4. Seguir el enlace del objeto afectado para volver a la cuenta, anuncio, reporte, noticia, medio o ajuste relacionado.

### Administrar sesiones y dispositivos

1. Una cuenta abre `Mi cuenta > Mis anuncios`; una identidad administrativa abre el resumen de `Administración`.
2. En **Sesiones y dispositivos**, comprueba la sesión actual, IP y ubicación aproximada.
3. Abre **Ver otros dispositivos** para revisar accesos adicionales.
4. Cierra una sesión concreta o todas las demás. La sesión actual también puede cerrarse con el control habitual del encabezado.

### Revisar la salud operativa

1. Propietario o Administrador abre el resumen de `Administración`.
2. Consulta errores, correos fallidos, duración interna y la última fotografía de D1/R2.
3. Abre **Ver más** para filtrar eventos por período, área y resultado.
4. Usa **Actualizar revisión D1/R2** para comparar objetos reales con referencias de la base. La revisión es de solo lectura: informa archivos huérfanos o faltantes, pero nunca los elimina automáticamente.

El registro comienza desde la migración que habilita esta función; no inventa ni reconstruye acciones históricas anteriores. Se registran inicios y cierres de sesión administrativa, cambios de cuentas y contraseñas, creación y estados de anuncios, moderación y eliminación de medios, reseñas, reportes, noticias, configuración, respuestas a testers y aperturas explícitas de documentos o evidencias privadas. Las visitas normales entre páginas del panel no generan eventos para evitar ruido y escrituras innecesarias.

### Gestionar administradores

1. La persona propietaria abre `Administración > Administradores`.
2. Ingresa el usuario exacto de GitHub, sin `@`, y asigna Administrador, Moderación, Noticias o Soporte.
3. En el primer ingreso con GitHub se exige un correo verificado, se comprueba que no pertenezca a un anunciante/tester y se crea una identidad administrativa independiente vinculada permanentemente al identificador numérico entregado por GitHub.
4. Desde la misma pantalla puede cambiar el nivel, cerrar todas las sesiones, revocar o reactivar el acceso. Todos estos cambios quedan en el historial administrativo.
5. Si GitHub cambia el nombre de usuario, el identificador numérico conserva la vinculación. La cuenta propietaria además debe demostrar en cada nuevo inicio que GitHub mantiene verificado `genaropiedra@hotmail.com`.

### Registrarse o ingresar con Google

1. En `Registro` o `Ingresar`, la persona pulsa el botón oficial de Google. Google autentica en una ventana propia y Chile3X recibe únicamente un comprobante de identidad de corta duración.
2. Si el identificador de Google ya está vinculado, o el correo verificado coincide con una cuenta pública todavía no vinculada, Chile3X crea la sesión y abre el destino solicitado.
3. Si no existe la cuenta, se abre el registro normal con correo bloqueado y nombres sugeridos por Google; nombre visible y nombre completo siguen siendo editables, y los demás campos y consentimientos continúan siendo obligatorios según sus reglas.
4. Al completar el registro se crea la cuenta, se elimina el intento temporal y se inicia sesión. Si se abandona, el intento vence a los diez minutos y se elimina en la siguiente limpieza.
5. Si el correo pertenece a una identidad administrativa, la vinculación se rechaza. Las personas administradoras continúan ingresando exclusivamente mediante GitHub.

### Usar mensajes, presencia y ubicación

1. Una persona con cuenta abre un anuncio público real y pulsa **Chat interno**. Si no inició sesión, vuelve primero al ingreso y luego al anuncio; las fichas de demostración y el anuncio propio no generan conversaciones.
2. `Mi cuenta > Mensajes` separa cada conversación por anuncio, conserva el historial y muestra los mensajes pendientes también en la navegación del panel. El bloqueo impide nuevos envíos sin borrar lo anterior; el silencio solo desactiva avisos. Una cuenta deshabilitada o eliminada se anonimiza como “Usuario de Chile3X” y pierde la posibilidad de seguir recibiendo mensajes.
3. Los mensajes son texto plano de hasta 1.200 caracteres. El servidor vuelve a comprobar que la cuenta participe en la conversación, que el anuncio siga público, que nadie haya bloqueado el chat y que se respeten los límites de frecuencia.
4. **Activar avisos** solicita el permiso propio del navegador. El aviso se muestra mientras Chile3X y la bandeja estén abiertos; no existe todavía un servicio de notificaciones push en segundo plano.
5. Una cuenta propietaria aparece `Online` únicamente mientras el sitio está visible y hubo interacción reciente. Al quedar inactiva, cerrar la pestaña o perder sesión, el estado vence por sí solo.
6. Dentro de los directorios, el selector acepta una ciudad manual o **Usar mi ubicación**. Esta segunda opción abre el permiso del navegador, calcula la ciudad cubierta más cercana localmente y guarda solo esa ciudad para ordenar primero los resultados correspondientes. La portada se limita a indicar la prioridad territorial y las ciudades cercanas.
7. `Administración > Actividad` muestra los últimos clics únicos de WhatsApp. Los datos adicionales solo aparecen si la persona aceptó la medición; sin consentimiento se mantiene únicamente el conteo diario opaco.

### Activar el acceso con Apple cuando existan credenciales

La integración está terminada en código y permanece en estado `Deshabilitado`. No inicia solicitudes hacia Apple ni genera costos mientras siga así.

1. Contratar Apple Developer Program y crear un App ID principal con la capacidad **Sign in with Apple**.
2. Crear un Services ID para la web, asociarlo al App ID principal y registrar el dominio `chile3x.cl` y la URL de retorno exacta `https://chile3x.cl/api/auth/apple/callback`.
3. Crear una clave de Sign in with Apple y conservar una sola vez el archivo privado `.p8`, además del Team ID y Key ID. Si se utilizará el correo privado de retransmisión de Apple, registrar también los remitentes del correo transaccional de Chile3X.
4. Guardar Services ID, Team ID, Key ID y App ID principal en `Administración > Configuración > Inicio con Apple`, todavía con estado `Deshabilitado`.
5. Cargar la clave `.p8` y una clave aleatoria independiente de 32 bytes como secretos del Worker. El panel solo muestra si existen; nunca permite leerlos ni guardarlos en D1.
6. Volver al panel, comprobar los dos indicadores en verde y cambiar el estado a `Activado`. El servidor rechazará la activación si falta cualquier requisito.

Después de activarlo, una identidad Apple ya vinculada inicia sesión. Una identidad nueva continúa en el registro con correo verificado y bloqueado, nombre visible y nombre completo editables y el resto de los campos manuales. Si el correo ya pertenece a Google o a administración, el flujo informa el conflicto y no crea otra identidad. Apple puede entregar un correo privado de retransmisión; Chile3X lo trata como el correo estable de esa cuenta.

### Operar la comunidad de Telegram

1. El propietario configura el bot, la URL pública, las normas y los límites de moderación en `Administración > Telegram`. El mismo panel informa la URL efectiva del webhook, su cola pendiente y el último error comunicado por Telegram.
2. El bot descubre los espacios donde participa. Desde el panel se asigna exactamente uno como Comunidad pública y uno como Miembros privado; ambos se reúnen en la Comunidad nativa de Telegram. El identificador de Miembros nunca se incluye en páginas públicas.
3. Una cuenta activa y verificada inicia la vinculación desde `Mi cuenta > Telegram`, abre el enlace temporal del bot y confirma en la misma sesión web la identidad que Telegram devolvió. La invitación a Miembros es individual, expira y no se reutiliza.
4. Las Novedades pueden publicarse desde el panel o mediante `/novedad` —o el tema configurado— por una identidad administrativa con `telegram.publish`. Las ediciones se sincronizan usando la identidad persistida de la publicación.
5. La moderación automática elimina spam claro, restringe temporalmente señales de estafa y veta únicamente reglas graves o acumulación configurada. Cada acción crea un caso revisable en el panel y el bot intenta avisar por mensaje privado a administradores vinculados con permiso de moderación.
6. `/start` y `/help` explican en privado cómo vincularse; `/rules` puede usarlo cualquier integrante. Los comandos `/status`, `/warn`, `/mute 30m|24h|7d`, `/unmute`, `/ban` y `/unban` se usan respondiendo al mensaje de la persona. Para retirar una publicación sincronizada desde Telegram se responde a ella con `/eliminar_novedad`; borrarla manualmente desde el cliente de Telegram no produce un evento Bot API y por eso no puede sincronizarse automáticamente. El bot vuelve a comprobar la función administrativa del sitio antes de actuar.
7. Deshabilitar, eliminar o desvincular una cuenta la retira de Miembros. Reactivar la cuenta no la reincorpora; la persona debe solicitar una invitación nueva con «Volver a entrar».

La Comunidad nativa de producción se llama `Chile3X` y agrupa `Chile3X | Comunidad` como chat visible, `Chile3X | Miembros` como chat oculto y `@Chile3XBot` como acceso visible. Se muestra como un solo chat y solo sus administradores pueden añadir espacios. `@prgec` y `@chile3x_soporte` administran la Comunidad nativa; el vínculo con el perfil administrativo del sitio se confirma individualmente desde la sesión GitHub de cada persona y su estado aparece en `Administración > Administradores`.

La estructura temática mantiene `Novedades` para publicaciones sincronizadas. El espacio público usa iconos para General, Novedades, Ayuda, Sugerencias, Seguridad, Regiones y Mejoras y próximas funciones. Miembros los usa para General, Novedades, Mi cuenta, Publicaciones, Soporte, Seguridad, Sugerencias y Alertas y estado del sitio. Este último se destina únicamente a fallos graves que afecten a la plataforma. Las alertas internas de infraestructura o moderación no crean un tercer grupo.

Telegram no ofrece un campo de descripción individual para cada tema y ordena los temas de un foro según su actividad reciente. Por eso las orientaciones se mantienen en la descripción del espacio, las normas de General y mensajes introductorios; el orden visual puede cambiar cuando alguien publica y no significa que la estructura esté dañada.

Estado verificado el 14 de septiembre de 2026: `@Chile3XBot` conserva la privacidad de grupos deshabilitada en BotFather, es administrador de los dos foros activos y recibió los once mensajes introductorios acordados —cinco en Comunidad y seis en Miembros—. D1 registró 69 actualizaciones del webhook, todas procesadas, sin trabajos de outbox pendientes o fallidos ni casos de moderación abiertos. La orientación publicada en el tema público `Novedades` apareció en `/novedades`, confirmando el recorrido Telegram → sitio; los antiguos chats separados permanecen inactivos y sin rol en D1.

### Administrar Sitios asociados

1. Abrir `Administración > Sitios asociados`. El interruptor superior publica u oculta la página completa; ocultarla también la retira del sitemap, footer y menú móvil.
2. Crear uno o más grupos y asignar su orden vertical. Un grupo oculto conserva sus tarjetas, pero no se entrega públicamente.
3. Crear la tarjeta con nombre interno, enlace HTTPS, descripción accesible e imagen principal. El título visible y el subtítulo son opcionales; el logo también lo es.
4. Elegir el diseño: texto sobre imagen, imagen protagonista o logo/banner centrado. Seleccionar `Contactar`, `Conocer más` o escribir un texto propio para el botón.
5. Ordenar las tarjetas con números como 10, 20 y 30. Marcar el enlace como pagado o patrocinado cuando exista compensación para añadir `rel="sponsored"`.
6. Previsualizar y probar el enlace antes de dejar la tarjeta activa. Reemplazar una imagen elimina de R2 la versión anterior después de que D1 haya guardado correctamente la nueva referencia.

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

### Recibir un aviso de cambio de ciudad

1. La persona inicia sesión y abre un anuncio Escort público que no le pertenece.
2. Al final de la ficha elige una ciudad que ya tenga anuncios publicados y activa el aviso. Puede tener varios avisos y quitarlos desde el mismo recuadro.
3. El anunciante modifica la ciudad de su anuncio; el cambio vuelve a revisión como cualquier edición relevante.
4. Cuando administración aprueba nuevamente el anuncio en la ciudad solicitada, el sistema envía el correo y marca ese aviso como completado para no repetirlo.
5. Un visitante sin sesión, la cuenta propietaria del anuncio o una ciudad inexistente son rechazados también por el servidor, no solo por la interfaz.

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

Para Telegram, los secretos se cargan directamente en Cloudflare y nunca en archivos locales versionados:

```bash
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN
pnpm exec wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Cuando exista la cuenta de Apple Developer, cargar sus secretos sin copiarlos al repositorio. El primer comando lee directamente el archivo descargado; el segundo genera y envía una clave nueva sin guardarla en un archivo:

```powershell
Get-Content -Raw -LiteralPath 'C:\ruta\AuthKey_XXXXXXXXXX.p8' | pnpm exec wrangler secret put APPLE_PRIVATE_KEY --config wrangler.json
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | pnpm exec wrangler secret put APPLE_TOKEN_ENCRYPTION_KEY --config wrangler.json
```

Las migraciones `0026_slim_white_tiger.sql` y `0027_messy_robbie_robertson.sql` crean la configuración, identidades, espacios, Novedades, moderación, auditoría, webhook, outbox y membresías. `0028_telegram_two_space_architecture.sql` retira el rol heredado de Alertas para conservar únicamente Comunidad y Miembros. `0029_dazzling_blockbuster.sql` agrega de forma aditiva las identidades Apple, los intentos anti-repetición y los registros temporales de alta. `0030_brave_falcon.sql` crea grupos y tarjetas de sitios asociados, `0031_lowly_changeling.sql` añade el título visible opcional y los tres directorios del footer, `0032_black_kulan_gath.sql` incorpora presencia reciente, conversaciones privadas, mensajes, preferencias de silencio/bloqueo y el enriquecimiento consentido de clics de contacto, y `0033_huge_selene.sql` preserva esos mensajes de forma anonimizada al retirar una cuenta y agrega las notificaciones administrativas de registros y anuncios. Antes de desplegar Telegram deben existir las colas declaradas en `wrangler.json` y la instalación del webhook debe terminarse desde `Administración > Telegram`.

## Publicación

La rama principal se publica en el Worker configurado para Chile3X. Antes de cada despliegue se debe comprobar como mínimo:

```bash
pnpm deploy
```

Este script fuerza el uso del `wrangler.json` del repositorio y conserva las variables configuradas en Cloudflare. No reutilizar configuraciones ni recursos del proyecto JurisConecta.

El despliegue verificado el 23 de septiembre de 2026 corresponde a la versión del Worker `a238a89d-3df5-467b-8ccb-aa5676385fce`. La unión `CF_VERSION_METADATA` se usa únicamente para aislar la caché pública de cada despliegue. D1 remoto contiene las migraciones hasta `0033_huge_selene.sql` y no informa relaciones inválidas. La comprobación visual en producción confirmó una cabecera de escritorio compacta con los contactos debajo de la sesión, navegación móvil sin desbordamiento horizontal, resumen territorial después del hero, selector completo solo dentro del directorio, textos legibles a 390 px, perfiles sin recortes, Manrope autohospedada, centro de notificaciones, estadísticas de WhatsApp y control de eliminación sincronizada de Novedades en el panel de Telegram. `/patrocinadores` conserva sus 11 tarjetas adaptables, sitemap canónico y ausencia de enlaces a Paradisse.

1. `pnpm lint` sin errores.
2. `pnpm build` sin errores.
3. Migración de D1 generada e inspeccionada si hubo cambios de esquema.
4. Prueba manual de registro, sesión, creación de anuncio, moderación, permisos de contenido exclusivo y una vista móvil.
5. Revisión de `https://chile3x.cl/sitemap.xml`, `https://chile3x.cl/robots.txt` y una URL pública representativa.

Cuando el despliegue incluye Telegram, comprobar además que D1 no tenga migraciones pendientes, que ambas colas existan, que los dos secretos estén configurados, que el bot sea administrador de los chats asignados y que `getWebhookInfo` no informe errores de entrega.

Cuando se active Apple, comprobar además que el Services ID, dominio, retorno y App ID estén registrados en Apple, que ambos secretos existan, que el botón ya no aparezca deshabilitado y que funcionen ingreso, registro nuevo, correo privado de retransmisión, conflicto con Google y eliminación permanente. Antes de disponer de credenciales reales, las pruebas locales verifican la criptografía y los estados, pero no pueden sustituir una autorización real en los servidores de Apple.

## Historial de implementación — septiembre de 2026

- `b44e42b` — controles de ciclo de vida de cuentas y anuncios.
- `099212a` — posición móvil segura del acceso flotante a WhatsApp.
- `e17679a` — reserva de correos para identidades administrativas.
- `48c3826` — tipografía Manrope, tamaños de acciones y navegación del resumen.
- `89f23c2` — sesiones, dispositivos y panel operativo.
- `b542633` — comunidad Telegram, Novedades bidireccionales, moderación, D1, Queues y paneles.
- `ab3077c` — estructura Telegram corregida a Comunidad + Miembros, avisos administrativos privados y migración de retiro del chat de Alertas.
- `6b0b875` — guía operativa y verificación de la estructura nativa de Telegram.
- `890eeaa` — identidades de Telegram visibles y vinculables en la administración de accesos.
- `f3bf6e6` — recorrido de Miembros, perfil y ayuda del bot, salud del webhook y filtros de moderación.
- `13faa29` — documentación operativa final de Telegram y estado de los vínculos administrativos.
- `a02ebc1` — acceso compacto a Telegram en el encabezado y llamado amplio dentro de la cuenta.
- `84779a9` — Apple preparado y deshabilitado, migración 0029, documentos legales/FAQ, SEO de Quiénes somos y caché pública aislada por versión.
- `09e97e2` — guía de activación futura de Apple y requisitos de dominio, retorno, retransmisión de correo y secretos.
- `4e80413` — vinculación administrativa de Telegram sin falso timeout, guía escalable, logo retirado del error, botones Apple simplificados e iconos compactos corregidos.
- `fc93569` — documentación final de las correcciones de interfaz y vinculación.
- `2350a51` — registro de la versión de producción verificada del Worker.
- `39d5ca7` — navegación inmediata al inicio de cada ficha para impedir que un toque interrumpa el desplazamiento móvil.
- `2338e14` — fila independiente de contactos en la cabecera de escritorio, sin colisión con sesión ni acciones principales.
- `d17f69f` — cabecera de escritorio nuevamente compacta, con contactos debajo de «Iniciar sesión» sin alterar móvil.
- `d5c50e4` — la vinculación de Telegram entrega una respuesta JSON y abre explícitamente la app, el enlace universal o Telegram Web según el dispositivo, evitando que un redireccionamiento posterior al formulario quede ignorado.
- `644d7a0` — catálogo administrable de Sitios asociados, migraciones 0030/0031, CRUD y orden, imágenes R2, SEO condicional, 11 tarjetas iniciales y pruebas de escritorio/móvil.
- `98f4792` — portada de Sitios asociados simplificada: se retiró el párrafo solicitado y el encabezado del grupo único solo reaparece cuando exista más de una sección.
- `9c95f33` — Quiénes somos ampliado como carta de presentación emergente, gratuita y orientada a SEO, junto con el ajuste de visibilidad solicitado en Novedades.
- `9174e16` — refinamiento responsive y editorial final de Quiénes somos.
- `56cf748` — chat privado y anonimización, presencia Online, preferencias territoriales, analítica consentida de WhatsApp, notificaciones operativas, borrado sincronizado de Novedades, Manrope autohospedada y migraciones 0032/0033.
- `c5bd80e` — cierre responsive del selector territorial: textos móviles completos, una sola acción de geolocalización en el directorio y resumen de portada ubicado después del hero.
- `506619f` — documentación del despliegue de mensajería, presencia, ubicación y notificaciones operativas.
- `6df6052` — optimización PageSpeed de logos, banner e insignia asociada, junto con aislamiento COOP compatible con Google.

## Límites y decisiones pendientes

- Los pagos, cobros, suscripciones automatizadas y venta interna de contenido no están habilitados. La biblioteca exclusiva funciona como control de acceso manual otorgado por el anunciante.
- La verificación de identidad y salud es manual. Los archivos son privados, pero la decisión final corresponde al equipo administrador.
- El orden de anuncios se aleatoriza dentro de la misma categoría para distribuir exposición; los niveles VIP, Premium y Gold mantienen su prioridad.
- Antes de abrir masivamente el registro, conviene revisar el flujo completo en móvil y escritorio con cuentas de prueba y definir tiempos operativos de aprobación.
- «Iniciar con Apple» no puede habilitarse todavía: la implementación ya existe, pero faltan una membresía pagada de Apple Developer y credenciales reales. El botón permanece visible y no seleccionable, el servidor bloquea cualquier inicio accidental y Chile3X no ha contratado ni cobrado este servicio.
