import type { Metadata } from "next";
import Link from "@/app/NavigationLink";
import { LegalPage } from "@/app/legal/LegalPage";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Política de privacidad y tratamiento de datos",
  description: "Cómo Chile3X recopila, utiliza, protege, publica y elimina datos de visitantes, cuentas y anunciantes.",
  path: "/privacidad",
});

const sections = [
  ["responsable", "Responsable y alcance"],
  ["principios", "Principios de tratamiento"],
  ["datos", "Datos que tratamos"],
  ["sensibles", "Datos sensibles y privados"],
  ["origen", "Origen de los datos"],
  ["finalidades", "Para qué los usamos"],
  ["bases", "Fundamentos del tratamiento"],
  ["publicos", "Perfiles públicos e indexación"],
  ["documentos", "Documentos de verificación"],
  ["exclusivo", "Galería exclusiva"],
  ["comunidad", "Comunidad y reportes"],
  ["medicion", "Cookies y medición"],
  ["proveedores", "Proveedores y transferencias"],
  ["autoridades", "Comunicaciones de datos"],
  ["conservacion", "Conservación y eliminación"],
  ["derechos", "Derechos de la persona titular"],
  ["ejercicio", "Cómo ejercerlos"],
  ["seguridad", "Seguridad"],
  ["menores", "Protección de menores"],
  ["automatizacion", "Decisiones automatizadas"],
  ["cambios", "Vigencia y cambios"],
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="DOCUMENTACIÓN LEGAL"
      title="Política de privacidad y tratamiento de datos"
      version="2026.10.14.3"
      updatedAt="2026-10-14"
      summary={<p>Esta política informa los datos tratados por Chile3X, sus finalidades, la información que puede hacerse pública y los mecanismos para ejercer los derechos de sus titulares. Describe el funcionamiento actual del directorio y distingue los datos públicos de los archivos privados.</p>}
      notice={<><strong>Canal de privacidad:</strong> las solicitudes de acceso, rectificación, eliminación, bloqueo y consultas se reciben en <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>. No deben enviarse contraseñas ni documentos completos por correo; si se requieren antecedentes, el equipo deberá indicar un canal adecuado.</>}
    >
      <nav className="legal-index" aria-label="Índice de la política de privacidad">
        <strong>Contenido</strong>
        <ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
      </nav>

      <section id="responsable">
        <h2>1. Responsable, contacto y alcance</h2>
        <p><strong>Chile3X</strong>, nombre comercial del portal disponible en <strong>chile3x.cl</strong>, es responsable del tratamiento descrito en esta política. El canal oficial para consultas y ejercicio de derechos es <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>.</p>
        <p>Esta política se aplica a visitantes, personas registradas, anunciantes, agencias, responsables de arriendos, personas que aparecen en publicaciones, quienes reportan contenido y quienes interactúan con las funciones del sitio. Los servicios externos enlazados, como WhatsApp, Telegram, Instagram, Arsmate u OnlyFans, tienen políticas propias.</p>
      </section>

      <section id="principios">
        <h2>2. Principios que aplicamos</h2>
        <p>Chile3X procura tratar datos de forma lícita, leal y transparente; limitar su uso a finalidades informadas; solicitar solo lo necesario; mantenerlos razonablemente actualizados; protegerlos frente a accesos no autorizados y conservarlos únicamente mientras exista una finalidad legítima o una obligación aplicable.</p>
        <p>No vendemos bases de datos personales. Tampoco utilizamos documentos de identidad, antecedentes médicos, mensajes de reportes ni contenido privado para publicidad dirigida.</p>
      </section>

      <section id="datos">
        <h2>3. Categorías de datos que tratamos</h2>
        <h3>3.1. Visitantes</h3>
        <ul>
          <li>dirección IP, fecha y hora, ruta solicitada, navegador, dispositivo, registros de error y señales técnicas de seguridad;</li>
          <li>confirmación de mayoría de edad, preferencias de privacidad y datos mínimos para mantener la sesión;</li>
          <li>datos generales de navegación y eventos únicamente con consentimiento de medición opcional.</li>
        </ul>
        <h3>3.2. Cuentas</h3>
        <ul>
          <li>correo electrónico, nombre visible, nombre completo opcional, tipo y número de documento, país del documento extranjero cuando corresponda, fecha de nacimiento, ciudad y teléfono opcional;</li>
          <li>contraseña protegida mediante un resumen criptográfico; Chile3X no almacena contraseñas en texto legible;</li>
          <li>estado de verificación del correo, rol, estado de la cuenta, fechas de creación y actividad administrativa;</li>
          <li>historial de cambios en métodos de acceso y desvinculación de proveedores, sin contraseñas ni secretos legibles.</li>
        </ul>
        <h3>3.3. Anuncios</h3>
        <ul>
          <li>tipo de perfil, nombre público, alias, URL personalizada, ciudad y región, descripción, características, servicios, idiomas, horarios, precios, agenda de viajes y disponibilidad;</li>
          <li>teléfono, WhatsApp y las redes o plataformas que el anunciante decida publicar;</li>
          <li>foto de perfil, galería, videos, historias, estados, archivos privados y contenido exclusivo;</li>
          <li>estado de publicación, revisión, verificación, moderación, pausa y relaciones autorizadas entre agencias y escorts.</li>
        </ul>
        <h3>3.4. Interacciones y seguridad</h3>
        <ul>
          <li>favoritos, likes, bloqueos, reseñas, comentarios y su estado de moderación;</li>
          <li>reportes, motivo, texto y capturas de evidencia, además de las actuaciones administrativas asociadas;</li>
          <li>visualizaciones de anuncios y clics en botones de contacto, agrupados por fecha y tipo de acción, incluyendo el número agregado de pulsaciones. Solo con consentimiento de medición, un clic de WhatsApp puede asociarse a la cuenta iniciada y agregar país, región o ciudad aproximada entregada por Cloudflare, tipo de dispositivo y ruta de origen. Sin ese permiso se conserva únicamente un identificador opaco para el conteo diario y nunca se guarda la IP en ese registro;</li>
          <li>mensajes privados enviados dentro de Chile3X, anuncio de origen, participantes, fecha, estado de lectura, silencio y bloqueos necesarios para mantener el historial y prevenir abuso;</li>
          <li>última actividad reciente de cuentas con anuncios, utilizada únicamente para mostrar un indicador temporal “Online”; el público no recibe la fecha exacta;</li>
          <li>si se vincula Telegram: identificador numérico, usuario y nombre que Telegram comparte, estado de vinculación y membresía, invitaciones, medidas de moderación y registros técnicos necesarios para operar el bot;</li>
          <li>si se elige Apple una vez habilitado: identificador estable, correo verificado —incluido un posible correo privado de retransmisión—, nombre compartido la primera vez y autorización cifrada necesaria para revocar el acceso al eliminar la cuenta;</li>
          <li>actuaciones administrativas: identidad de quien intervino, fecha, operación, elemento afectado, resultado y cambios relevantes. Incluyen aprobación de archivos, modificaciones de anuncios, publicación de historias por administración y configuración. No se duplican archivos de identidad, contraseñas, secretos ni cuerpos de historias en esos registros;</li>
          <li>en el foro privado beta: identificador y nombre administrativo de autoría, sección, título, texto, fechas, estados de edición y moderación, versión de las normas aceptadas, declaración de derechos y consentimiento para adjuntos, temas seguidos, notificaciones internas propias y denuncias con su decisión. Esta información no se publica ni se ofrece a usuarios generales; no se deben cargar documentos privados.</li>
        </ul>
      </section>

      <section id="sensibles">
        <h2>4. Datos sensibles, íntimos y de especial protección</h2>
        <p>Por la naturaleza del directorio, una publicación puede revelar o permitir inferir información sobre vida sexual, identidad o expresión de género, preferencias, apariencia y salud. Además, un anunciante puede cargar voluntariamente antecedentes médicos o material íntimo. Chile3X trata estas categorías con acceso restringido y para las finalidades concretas descritas en esta política.</p>
        <p>Publicar una etiqueta, descripción o imagen es una decisión de la persona titular del anuncio. Los documentos de identidad, fechas de nacimiento, antecedentes médicos, reportes y galerías exclusivas <strong>no se hacen públicos por defecto</strong>. La persona puede retirar contenido público o solicitar su revisión, sin afectar tratamientos anteriores realizados lícitamente.</p>
      </section>

      <section id="origen">
        <h2>5. De dónde obtenemos los datos</h2>
        <p>Recibimos datos directamente de la persona que visita, se registra, publica, comenta o reporta; de una agencia cuando invita a vincular un perfil, sujeto a aceptación de la escort; del funcionamiento técnico del sitio; y de proveedores que confirman entregas de correo, seguridad o funcionamiento.</p>
        <p>Si alguien entrega datos de otra persona, declara tener autorización suficiente y debe informarle este tratamiento. Chile3X puede solicitar prueba de esa autorización y eliminar el contenido si no se acredita.</p>
      </section>

      <section id="finalidades">
        <h2>6. Para qué utilizamos la información</h2>
        <ul>
          <li>crear, autenticar, recuperar, administrar, suspender o cerrar cuentas;</li>
          <li>comprobar mayoría de edad y, cuando corresponda, revisar identidad o antecedentes voluntarios;</li>
          <li>crear borradores, moderar cambios, publicar, ordenar, buscar, pausar y mostrar anuncios;</li>
          <li>gestionar historias, galerías, medios, relaciones agencia–escort y accesos exclusivos;</li>
          <li>habilitar favoritos, likes, reseñas, comentarios, mensajería privada, bloqueos, reportes y paneles de rendimiento;</li>
          <li>ordenar anuncios según la ciudad o comuna de cobertura seleccionada manualmente; la persona usuaria puede borrar esa preferencia y volver a Todo Chile. Esta función no solicita coordenadas GPS;</li>
          <li>vincular voluntariamente Telegram, administrar el acceso a Miembros, sincronizar Novedades, moderar la comunidad y avisar al equipo sobre medidas relevantes;</li>
          <li>enviar correos transaccionales como verificación, recuperación, aprobación, rechazo, suspensión y avisos importantes de la cuenta;</li>
          <li>prevenir fraude, spam, suplantación, explotación, contenido ilícito, ataques y uso indebido;</li>
          <li>resolver solicitudes, cumplir obligaciones legales, colaborar con autoridades competentes y ejercer o defender derechos;</li>
          <li>medir y mejorar el sitio con datos generales cuando exista consentimiento para Analytics.</li>
        </ul>
      </section>

      <section id="bases">
        <h2>7. Fundamentos del tratamiento</h2>
        <p>Según el dato y la finalidad, el tratamiento se apoya en el consentimiento de su titular; la ejecución de las funciones solicitadas al crear una cuenta o publicación; el cumplimiento de obligaciones legales; y la necesidad de proteger la seguridad, prevenir abuso y ejercer o defender derechos, dentro de los límites admitidos por la legislación aplicable.</p>
        <p>El consentimiento para medición es separado y opcional. La carga voluntaria de documentos médicos o material íntimo requiere una decisión afirmativa de quien lo aporta y puede retirarse para usos futuros. Cuando la ley exija una autorización específica adicional, Chile3X la solicitará antes del tratamiento correspondiente.</p>
      </section>

      <section id="publicos">
        <h2>8. Perfiles públicos, buscadores y redes sociales</h2>
        <p>Una publicación aprobada puede mostrar su nombre público, alias, ciudad, descripción, atributos, disponibilidad, precios, agenda, contactos, imágenes, videos, historias, distintivos, reseñas aprobadas y demás campos que el anunciante haya destinado al perfil público.</p>
        <p>Las páginas públicas pueden ser encontradas por buscadores, guardadas en caché y generar vistas previas al compartir enlaces. Incluso después de despublicar o modificar una página, Google, redes sociales y otros terceros pueden tardar en actualizar o eliminar sus copias. Chile3X puede solicitar una actualización, pero no controla esos plazos.</p>
        <p>No publicamos el número de documento, fecha de nacimiento, nombre legal opcional, teléfono privado de la cuenta, carnet, antecedentes médicos ni evidencia de reportes, salvo que la propia persona incorpore voluntariamente un dato equivalente en un campo público.</p>
      </section>

      <section id="documentos">
        <h2>9. Documentos de identidad y antecedentes médicos opcionales</h2>
        <p>Una persona anunciante puede adjuntar voluntariamente imágenes o PDF de identidad y/o antecedentes médicos para revisión interna. Estos archivos se almacenan de forma privada, no tienen una URL pública de listado, no se indexan y solo pueden ser consultados por la persona dueña del anuncio y administradores autorizados que los necesiten para revisar.</p>
        <p>Un archivo nuevo puede reemplazar al anterior y la persona puede eliminarlo desde las funciones disponibles o pedir su retiro. Chile3X no diagnostica, no certifica vigencia médica ni garantiza que un documento refleje el estado actual de una persona. El resultado de una revisión puede conservarse separadamente como registro de moderación.</p>
        <p>El acceso a documentos y las actuaciones de carga, reemplazo o eliminación se registran para trazabilidad. El historial no contiene una segunda copia del documento. Los permisos administrativos se asignan por función; disponer de acceso general al panel no autoriza por sí solo la consulta de todos los archivos privados.</p>
      </section>

      <section id="exclusivo">
        <h2>10. Galería privada y autorizaciones de acceso</h2>
        <p>El material exclusivo permanece bloqueado para el público. La persona dueña del anuncio administra el acceso añadiendo el correo de una cuenta registrada. Para operar la función tratamos la relación entre anuncio, cuenta autorizada, archivos y fechas relevantes.</p>
        <p>La persona anunciante es responsable de confirmar que quien autoriza es adulta y de retirar el acceso cuando corresponda. Aunque Chile3X aplica controles técnicos, ninguna medida puede impedir por completo capturas o copias realizadas por alguien que recibió acceso legítimo. No utilizamos esa galería para entrenar sistemas de inteligencia artificial ni para publicidad.</p>
      </section>

      <section id="comunidad">
        <h2>11. Reseñas, Telegram, bloqueos, reportes y evidencias</h2>
        <p>Las reseñas o comentarios aprobados por el anunciante pueden mostrar el nombre visible de su autor y su contenido. Antes de aprobarse solo pueden consultarlos su autor, el propietario del anuncio y administración. El autor puede retirar su reseña pendiente; el anunciante puede aprobarla, rechazarla o eliminarla, y administración puede consultarla o eliminarla. Favoritos, bloqueos y listas personales no se muestran públicamente. Los reportes y sus capturas son privados y accesibles para el equipo autorizado y para la cuenta que los envió dentro de su panel.</p>
        <p>Podemos utilizar esos antecedentes para investigar, contactar a las partes cuando sea seguro y necesario, moderar, preservar evidencia, prevenir reiteración y responder a una autoridad. No revelaremos la identidad de quien reporta al perfil denunciado salvo consentimiento, obligación legal o necesidad fundada de defensa, aplicando minimización.</p>
        <p>Vincular Telegram es opcional. El sitio conserva la relación entre la cuenta y el identificador que entrega Telegram para comprobar acceso, crear invitaciones individuales y aplicar o retirar medidas. Los mensajes procesados por el bot pueden conservarse temporalmente para evitar duplicados, detectar envíos masivos o spam y ejecutar las tareas pendientes; una evidencia breve y la medida aplicada pueden mantenerse mientras sea necesario para revisar el caso y prevenir reincidencia. Desvincular, deshabilitar o eliminar la cuenta retira el acceso a Miembros, pero Telegram puede conservar mensajes conforme a sus propias reglas.</p>
        <p>El chat interno requiere sesión. Cada participante puede silenciar o bloquear la conversación. Si una de las cuentas se deshabilita o elimina, la otra puede conservar el texto del historial, pero Chile3X sustituye la identidad visible de la persona retirada por “Usuario de Chile3X” y bloquea mensajes nuevos; las relaciones directas con la cuenta eliminada se desprenden de la conversación. Si ya no queda ningún participante con acceso, la conversación se elimina. Los indicadores de no leído y los avisos del navegador se usan solo para comunicar mensajes; Chile3X puede aplicar límites automáticos de frecuencia para reducir spam. No deben enviarse contraseñas, códigos, documentos ni datos bancarios.</p>
        <p>La sustitución del nombre de una cuenta no anonimiza automáticamente el texto de sus mensajes. Las referencias identificables incorporadas en conversaciones se evalúan conforme a los derechos aplicables y a la finalidad de conservación del historial.</p>
        <p>El centro de ayuda “Johnny Sins” funciona mediante búsqueda guiada en documentación revisada. Las consultas y valoraciones se mantienen únicamente en la memoria de la pestaña durante la visita; no se guardan como conversación en la base de datos ni se envían a un proveedor de IA generativa. Los enlaces de ayuda pueden referirse a anuncios pertenecientes a la cuenta, consultados con su sesión. Al abrir un WhatsApp de soporte, no se adjunta automáticamente la conversación. No deben ingresarse contraseñas, códigos, documentos ni datos privados de terceros.</p>
        <p>El foro privado beta se utiliza para desarrollo y pruebas administrativas. Sus contenidos y archivos solo pueden ser consultados por administración habilitada para el foro. Los adjuntos requieren declaración de autorización y consentimiento, están sujetos a cuotas y quedan pendientes de revisión; esto no equivale a una certificación de identidad o legalidad. Las notificaciones se limitan a temas seguidos y a su destinatario; no se envían correos automáticos. Archivar una sección o enviar un tema a papelera no equivale a borrar inmediatamente sus datos. Las denuncias permiten solicitar revisión y rectificación; sus decisiones quedan registradas, sin duplicar los textos de las respuestas en la auditoría. Los contadores de frecuencia ayudan a limitar cargas y publicaciones abusivas.</p>
      </section>

      <section id="medicion">
        <h2>12. Cookies, almacenamiento local y medición opcional</h2>
        <h3>12.1. Funciones necesarias</h3>
        <p>Utilizamos cookies o almacenamiento equivalente para mantener la sesión, recordar la confirmación de mayoría de edad, conservar preferencias de privacidad, proteger formularios, limitar abuso, recordar historias vistas y operar funciones solicitadas. Estas tecnologías son necesarias para que ciertas partes del sitio funcionen y no se utilizan para publicidad conductual.</p>
        <h3>12.2. Inicio de sesión con Google</h3>
        <p>Si se elige continuar con Google, recibimos el identificador estable de la cuenta de Google, el correo verificado y el nombre que Google comparte. Usamos el identificador y el correo para comprobar la identidad, vincular o crear la cuenta y evitar accesos duplicados; el nombre solo completa inicialmente campos editables durante el registro.</p>
        <p>No solicitamos acceso a Gmail, Drive, contactos, archivos ni calendario, y no almacenamos tokens de acceso de Google. El correo queda vinculado y no puede modificarse desde la cuenta. Si abandonas el registro, los datos del intento se eliminan automáticamente al vencer el plazo breve de seguridad.</p>
        <p>La persona titular puede desvincular un proveedor desde Mis datos después de configurar y confirmar una contraseña. Esto no elimina la cuenta ni revierte la verificación de su correo. Conservamos un historial de cambios de acceso, consultable por la persona titular y administración autorizada, para proteger la cuenta.</p>
        <h3>12.3. Inicio de sesión con Apple preparado, aún inactivo</h3>
        <p>Chile3X muestra un botón de Apple deshabilitado mientras el proveedor no se encuentre habilitado con una configuración completa. En ese estado no se abre Apple ni se le envían datos. Si se habilita en el futuro y la persona elige utilizarlo, recibiremos el identificador estable, correo verificado y, únicamente en la primera autorización, el nombre que Apple comparta. Esos nombres solo completarán campos editables del registro; el correo quedará bloqueado.</p>
        <p>El flujo rechazará identidades incompatibles, incluido un correo vinculado a otro proveedor o a una identidad administrativa. La autorización de larga duración que Apple entregue se almacenará cifrada y se utilizará para revocarla cuando corresponda, incluida la eliminación permanente de la cuenta. Chile3X no recibirá la contraseña de Apple ni acceso a iCloud, fotos, contactos o archivos.</p>
        <h3>12.4. Google Tag Manager y Google Analytics</h3>
        <p>Los WhatsApp del equipo usan contadores internos agregados por día, área y acceso: aperturas del panel y clics para abrir WhatsApp. No guardan IP, cuenta, número del visitante ni el contenido de mensajes, y no acreditan que se haya enviado un mensaje. Son independientes de los contactos de anunciantes.</p>
        <p>El contacto del anunciante destacado dentro del panel de WhatsApp utiliza el registro de contactos del anuncio, no el contador del equipo. El contador de pulsaciones de WhatsApp del anuncio es visible únicamente para administración autorizada. El equipo no recibe el contenido de las conversaciones mantenidas en WhatsApp.</p>
        <p>La medición es opcional y solo se carga cuando la persona selecciona <strong>“Aceptar medición”</strong> en el aviso de privacidad. Con esa autorización se miden visitas y acciones generales como registros, envíos de anuncios, clics de contacto, favoritos, likes y reseñas para entender el uso y mejorar Chile3X.</p>
        <p>No configuramos el envío a Google de nombres, correos, teléfonos, RUT, direcciones, archivos privados, texto libre ni identificadores internos de perfiles como parámetros de Analytics. Google puede tratar información técnica como dirección IP, navegador, dispositivo y señales de interacción conforme a sus propias condiciones y medidas disponibles.</p>
        <p>Al seleccionar <strong>“Solo necesarias”</strong>, el sitio seguirá funcionando sin cargar Google Tag Manager ni Google Analytics. La elección puede retirarse o modificarse en cualquier momento; el cambio no invalida el tratamiento anterior basado en consentimiento.</p>
        <p><a className="text-link" href="/privacidad?medicion=editar#medicion">Cambiar mi elección de medición <span aria-hidden="true">→</span></a></p>
        <h3>12.5. Inicio de sesión con X preparado, aún inactivo</h3>
        <p>Mientras el acceso con X esté deshabilitado no se abre ese proveedor ni se le envían datos. Si se habilita y la persona elige utilizarlo, recibiremos su identificador estable, nombre, nombre de usuario y el correo confirmado que X autorice compartir. Si no entrega un correo confirmado, la persona deberá completar y verificar uno mediante el proceso del sitio. El nombre solo completa campos editables del registro.</p>
        <p>No solicitamos permiso para publicar, enviar mensajes privados ni acceder a mensajes. El token se utiliza únicamente para obtener la identidad y se solicita su revocación al terminar; no se almacena como credencial permanente. X podrá desvincularse con los mismos controles de contraseña e historial que los demás proveedores.</p>
        <h3>12.6. Mapas referenciales de Google Maps</h3>
        <p>Los anuncios incluyen un mapa referencial de su ciudad, que se carga de forma diferida. Solo enviamos el nombre de la ciudad, región y país: no enviamos el nombre del anunciante, su cuenta, dirección, notas de ubicación ni coordenadas privadas. Al cargarse el mapa o abrir Maps, Google puede recibir información técnica del navegador y aplicar sus propias condiciones y política de privacidad. No solicitamos la ubicación de la persona visitante para mostrar estos mapas.</p>
      </section>

      <section id="proveedores">
        <h2>13. Proveedores tecnológicos y transferencias internacionales</h2>
        <p>Para operar Chile3X utilizamos proveedores que tratan datos por cuenta del portal o prestan infraestructura bajo sus propios términos:</p>
        <ul>
          <li><strong>Cloudflare:</strong> alojamiento del sitio, base de datos, almacenamiento de archivos, red de entrega, certificados, seguridad y Turnstile para combatir bots;</li>
          <li><strong>Google:</strong> autenticación cuando se elige “Continuar con Google”, correo transaccional, mapas referenciales de ciudades y, solo con consentimiento, Google Tag Manager y Google Analytics;</li>
          <li><strong>Telegram:</strong> comunidad pública, vinculación voluntaria de cuentas, invitaciones a Miembros, Novedades y moderación mediante el bot;</li>
          <li><strong>Apple:</strong> solo si el proveedor llega a habilitarse y la persona lo elige, autenticación y revocación de la autorización asociada;</li>
          <li><strong>X:</strong> solo si el acceso llega a habilitarse y la persona lo elige, autenticación e identidad autorizada para crear o vincular su cuenta;</li>
          <li><strong>proveedores de navegador, sistema operativo o redes externas:</strong> únicamente cuando la persona utiliza esas aplicaciones o sigue un enlace.</li>
        </ul>
        <p>Estos servicios pueden procesar o respaldar información fuera de Chile. Chile3X procura escoger proveedores reconocidos, limitar los datos enviados, configurar accesos y aplicar salvaguardas contractuales y técnicas razonables. La ubicación de la infraestructura puede cambiar sin que ello signifique una venta de datos.</p>
      </section>

      <section id="autoridades">
        <h2>14. Cuándo podemos comunicar datos</h2>
        <p>Podemos comunicar la información mínima necesaria a proveedores que operan el servicio; a asesores sujetos a deberes de confidencialidad; a autoridades judiciales, policiales, administrativas o al Ministerio Público ante una orden o requerimiento válido; o cuando sea necesario para denunciar o prevenir una amenaza seria, explotación, trata, abuso de menores, difusión íntima no consentida, fraude o ataque.</p>
        <p>No entregamos bases de datos a anunciantes ni permitimos que una agencia acceda a los documentos privados de una escort por el solo hecho de estar vinculadas. Una reorganización futura del negocio deberá proteger los datos, informar el cambio de responsable cuando corresponda y respetar los derechos de sus titulares.</p>
      </section>

      <section id="conservacion">
        <h2>15. Conservación, publicación temporal y eliminación</h2>
        <p>Chile3X establece los siguientes plazos operativos propios, atendiendo a la finalidad y sensibilidad de cada dato. No se presentan como plazos generales exigidos por una ley ni impiden atender antes una solicitud de eliminación procedente.</p>
        <ul>
          <li><strong>Cuenta, anuncios y medios ordinarios:</strong> mientras la persona mantenga su cuenta y publicaciones, incluidas las pausadas o recuperables. Deshabilitar no equivale a eliminar. La eliminación definitiva retira los datos operativos y el acceso al contenido; los archivos asociados se borran al completar el proceso o mediante reintentos restringidos. No se conservan originales adicionales por aplicar marca de agua.</li>
          <li><strong>Historias de fotografías, videos y texto:</strong> 24 horas desde su publicación. La limpieza de registros y archivos se ejecuta normalmente en el siguiente ciclo de cinco minutos. Ante una falla se reintenta sin prolongar su acceso público.</li>
          <li><strong>Archivos de identidad:</strong> hasta 90 días desde su última carga o reemplazo. <strong>Exámenes y certificados médicos:</strong> hasta 30 días desde su última carga o reemplazo. Después se restringe su consulta y se elimina el archivo; el resultado y fecha de la revisión pueden mantenerse mientras exista el anuncio, sin conservar el documento original ni constituir una garantía de salud.</li>
          <li><strong>Reportes y pruebas adjuntas:</strong> durante la tramitación y hasta 180 días después de su resolución o desestimación. Los casos pendientes no se eliminan por el mero transcurso de ese plazo.</li>
          <li><strong>Conversaciones internas:</strong> hasta 365 días después del último mensaje, salvo una conservación excepcional fundada. La eliminación de una cuenta puede dejar a la otra persona participante su conversación con la identidad desvinculada; no autoriza conservar indefinidamente ese historial.</li>
          <li><strong>Foro beta privado:</strong> los temas y textos se mantienen mientras se utilicen para el desarrollo o la moderación de la beta, sujetos a solicitudes de eliminación procedentes. Los adjuntos retirados, rechazados o asociados a mensajes o temas en papelera se eliminan al cumplir 30 días en ese estado. Las notificaciones internas se conservan hasta 90 días; las denuncias cerradas, hasta 180 días desde la decisión. Los contadores de frecuencia se depuran tras un día sin actividad. La constancia de aceptación de normas y los seguimientos se mantienen mientras la cuenta participe o siga el tema; dejar de seguirlo elimina ese seguimiento.</li>
          <li><strong>Auditoría administrativa:</strong> hasta 365 días desde cada actuación. <strong>Diagnósticos operativos propios:</strong> hasta 30 días. Los registros de sesiones vencidas se depuran hasta 30 días después de su vencimiento; los enlaces de acceso o recuperación no amplían su vigencia al permanecer transitoriamente registrados.</li>
          <li><strong>Historial de correos transaccionales:</strong> hasta 90 días desde cada intento. Registra destinatario, cuenta asociada cuando exista, asunto, tipo, fecha, servicio utilizado y resultado técnico. Su consulta se restringe a administradores autorizados para gestionar cuentas, auditoría y datos privados. No conserva el cuerpo del mensaje, contraseñas ni enlaces o tokens de recuperación. La aceptación por el servicio de envío no acredita recepción, lectura ni entrega en la bandeja principal. La eliminación definitiva de una cuenta retira los registros asociados y los del correo registrado.</li>
          <li><strong>Constancia mínima de eliminación de cuenta:</strong> hasta 180 días. Contiene una huella del correo y los datos mínimos de la eliminación, no el perfil, documentos ni medios; una huella se trata como dato seudonimizado, no como anonimato absoluto.</li>
          <li><strong>Respaldos automáticos de la base de datos:</strong> la ventana técnica de recuperación de Cloudflare D1 es de 7 a 30 días según el plan del proveedor. Una eliminación no borra simultáneamente cada estado de recuperación. Esos respaldos no se utilizan para volver a publicar contenido eliminado; al restaurar se deben reaplicar eliminaciones y vencimientos.</li>
        </ul>
        <p>La política se aplica desde el 14 de octubre de 2026. La depuración ordinaria de los plazos no temporales comienza el 13 de noviembre de 2026, con una transición de 30 días para los datos existentes. Esto no cambia el vencimiento de historias ni posterga las solicitudes de eliminación definitiva realizadas mediante las funciones del sitio.</p>
        <p>Una orden válida, una investigación documentada o la necesidad concreta de ejercer o defender derechos puede justificar conservar únicamente los antecedentes indispensables por un período mayor. La conservación excepcional se registra, se restringe al caso y debe revisarse al cesar su fundamento. Los errores de almacenamiento pueden requerir reintentos: el contenido afectado no vuelve a quedar accesible por ese motivo.</p>
      </section>

      <section id="derechos">
        <h2>16. Derechos de la persona titular</h2>
        <p>De acuerdo con la Ley N.º 19.628 vigente, la persona titular puede solicitar información y acceso a sus datos, su rectificación cuando sean inexactos o estén desactualizados, su eliminación o cancelación cuando proceda y el bloqueo de determinados tratamientos en los casos legales.</p>
        <p>La Ley N.º 21.719 prevé su entrada en vigor el <strong>1 de diciembre de 2026</strong>, conforme al texto legal publicado consultado para esta versión. Refuerza el marco chileno e incorpora derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo temporal, junto con reglas sobre decisiones automatizadas. Su aplicación se realizará conforme a la vigencia y exigencias legales efectivas; una propuesta de modificación de plazos no altera por sí sola la ley publicada.</p>
        <p>Estos derechos no son absolutos: una solicitud puede limitarse cuando sea necesario conservar antecedentes para obligaciones legales, seguridad, derechos de terceros, libertad de expresión, investigación de ilícitos o defensa de reclamaciones, explicando el fundamento aplicable.</p>
      </section>

      <section id="ejercicio">
        <h2>17. Ejercicio de los derechos</h2>
        <p>La persona titular puede editar parte de su información desde <Link href="/mi-cuenta">Mi cuenta</Link> o presentar una solicitud en <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a> indicando:</p>
        <ul>
          <li>el derecho o solicitud que desea ejercer;</li>
          <li>el correo asociado a su cuenta y los datos necesarios para ubicar el anuncio;</li>
          <li>una explicación clara y, si corresponde, el dato correcto o el contenido cuya eliminación solicitas.</li>
        </ul>
        <p>Podemos verificar la identidad mediante el método menos invasivo razonablemente disponible antes de entregar o modificar información. No debe enviarse una contraseña. Las solicitudes se responderán dentro de los plazos de la ley vigente y serán gratuitas en los casos legalmente previstos.</p>
        <p>También puede retirarse el consentimiento de medición desde esta página, revocarse el acceso a la galería exclusiva, ocultarse un anuncio, eliminarse historias o solicitarse el cierre de la cuenta mediante las opciones disponibles. Si la respuesta resulta insatisfactoria, la persona titular puede acudir a tribunales o a la autoridad competente, incluida la Agencia de Protección de Datos Personales una vez que ejerza sus atribuciones.</p>
      </section>

      <section id="seguridad">
        <h2>18. Medidas de seguridad y respuesta a incidentes</h2>
        <p>Aplicamos controles de acceso por rol y titularidad, almacenamiento privado para archivos sensibles, conexiones cifradas HTTPS, contraseñas resumidas criptográficamente, validación de formularios, protección anti-bot, registros de seguridad, copias de respaldo y revisión administrativa.</p>
        <p>Ningún sistema conectado a Internet es infalible. Si detectamos un incidente que afecte datos personales, investigaremos, limitaremos el daño, preservaremos evidencia y notificaremos a personas o autoridades cuando la ley lo exija o sea razonablemente necesario para reducir riesgos. Puedes informar una vulnerabilidad sin explotar ni divulgar datos ajenos escribiendo al canal oficial.</p>
      </section>

      <section id="menores">
        <h2>19. Protección de niñas, niños y adolescentes</h2>
        <p>Chile3X no está dirigido a menores de 18 años y no acepta su registro, publicación ni aparición en material. Si tomamos conocimiento o tenemos una sospecha razonable, bloquearemos el contenido o cuenta, podremos preservar la evidencia estrictamente necesaria y actuaremos conforme a la legislación y los requerimientos de las autoridades.</p>
        <p>La posible presencia de una persona menor de edad debe informarse mediante el botón de reporte, cuando se disponga de una cuenta, o inmediatamente a <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>. No debe descargarse, reenviarse ni difundirse el material.</p>
      </section>

      <section id="automatizacion">
        <h2>20. Moderación y decisiones automatizadas</h2>
        <p>Podemos utilizar validaciones automáticas para detectar formatos inválidos, spam, límites de carga, riesgo técnico o señales de abuso. Las decisiones relevantes de publicación, verificación y sanción contemplan revisión administrativa y no se basan exclusivamente en perfilamiento automatizado con efectos jurídicos equivalentes.</p>
        <p>Si una validación automática produce un error, puede solicitarse intervención humana y revisión mediante el canal de soporte.</p>
        <p>Las respuestas del bot de ayuda son orientativas y pueden contener errores. La búsqueda guiada no decide aprobaciones, sanciones, verificaciones ni accesos, y puede ser desactivada por administración. La persona interesada puede solicitar asistencia humana por los canales oficiales.</p>
      </section>

      <section id="cambios">
        <h2>21. Vigencia, cambios y legislación aplicable</h2>
        <p>Esta política se rige por la legislación chilena, especialmente la Ley N.º 19.628 y, desde el 1 de diciembre de 2026, sus modificaciones introducidas por la Ley N.º 21.719. También pueden resultar aplicables la Ley N.º 19.496, la Ley N.º 19.799, el Código Penal y otras normas sectoriales.</p>
        <p>Podemos actualizar la política por cambios legales, técnicos o funcionales. Mostraremos la versión y fecha vigentes; si el cambio altera materialmente una finalidad o requiere consentimiento, lo informaremos y solicitaremos la autorización correspondiente antes de aplicarlo.</p>
        <div className="legal-sources">
          <h3>Fuentes legales y políticas relacionadas</h3>
          <ul>
            <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noreferrer">Ley N.º 19.628 sobre protección de la vida privada</a></li>
            <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=1209272" target="_blank" rel="noreferrer">Ley N.º 21.719 sobre protección de datos personales</a></li>
            <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=61438" target="_blank" rel="noreferrer">Ley N.º 19.496 sobre protección de los derechos de los consumidores</a></li>
            <li><Link href="/terminos">Términos y condiciones de Chile3X</Link></li>
            <li><Link href="/reglas-de-publicacion">Reglas de publicación</Link></li>
          </ul>
        </div>
      </section>
    </LegalPage>
  );
}
