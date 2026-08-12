import type { Metadata } from "next";
import Link from "next/link";
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
  ["derechos", "Tus derechos"],
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
      code="T-02"
      version="2.0"
      updated="12 de agosto de 2026"
      summary={<p>Esta política explica qué datos trata Chile3X, para qué los utiliza, qué información puede hacerse pública y cómo ejercer tus derechos. Está redactada para el funcionamiento actual del directorio y distingue expresamente los datos públicos de los archivos privados.</p>}
      notice={<><strong>Canal de privacidad:</strong> para acceder, corregir, eliminar, bloquear o consultar por tus datos escribe a <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>. Nunca envíes tu contraseña ni documentos completos por correo salvo que el equipo te indique un canal seguro.</>}
    >
      <nav className="legal-index" aria-label="Índice de la política de privacidad">
        <strong>Contenido</strong>
        <ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
      </nav>

      <section id="responsable">
        <h2>1. Responsable, contacto y alcance</h2>
        <p><strong>Chile3X</strong>, nombre comercial del portal disponible en <strong>chile3x.cl</strong>, es responsable del tratamiento descrito en esta política. El canal oficial para consultas y ejercicio de derechos es <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>.</p>
        <p>Esta política se aplica a visitantes, personas registradas, anunciantes, agencias, responsables de arriendos, personas que aparecen en publicaciones, quienes reportan contenido y quienes interactúan con las funciones del sitio. Los servicios externos enlazados —como WhatsApp, Telegram, Instagram, Arsmate u OnlyFans— tienen políticas propias.</p>
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
          <li>datos generales de navegación y eventos únicamente si aceptas la medición opcional.</li>
        </ul>
        <h3>3.2. Cuentas</h3>
        <ul>
          <li>correo electrónico, nombre visible, nombre completo opcional, tipo y número de documento, país del documento extranjero cuando corresponda, fecha de nacimiento, ciudad y teléfono opcional;</li>
          <li>contraseña protegida mediante un resumen criptográfico; Chile3X no necesita conocer ni almacenar tu contraseña en texto legible;</li>
          <li>estado de verificación del correo, rol, estado de la cuenta, fechas de creación y actividad administrativa.</li>
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
          <li>visualizaciones de anuncios y clics en botones de contacto, agrupados por fecha y tipo de acción.</li>
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
          <li>habilitar favoritos, likes, reseñas, comentarios, bloqueos, reportes y paneles de rendimiento;</li>
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
      </section>

      <section id="exclusivo">
        <h2>10. Galería privada y autorizaciones de acceso</h2>
        <p>El material exclusivo permanece bloqueado para el público. La persona dueña del anuncio administra el acceso añadiendo el correo de una cuenta registrada. Para operar la función tratamos la relación entre anuncio, cuenta autorizada, archivos y fechas relevantes.</p>
        <p>La persona anunciante es responsable de confirmar que quien autoriza es adulta y de retirar el acceso cuando corresponda. Aunque Chile3X aplica controles técnicos, ninguna medida puede impedir por completo capturas o copias realizadas por alguien que recibió acceso legítimo. No utilizamos esa galería para entrenar sistemas de inteligencia artificial ni para publicidad.</p>
      </section>

      <section id="comunidad">
        <h2>11. Reseñas, bloqueos, reportes y evidencias</h2>
        <p>Las reseñas o comentarios aprobados pueden mostrar el nombre visible de su autor y su contenido. Favoritos, bloqueos y listas personales no se muestran públicamente. Los reportes y sus capturas son privados y accesibles para el equipo autorizado y para la cuenta que los envió dentro de su panel.</p>
        <p>Podemos utilizar esos antecedentes para investigar, contactar a las partes cuando sea seguro y necesario, moderar, preservar evidencia, prevenir reiteración y responder a una autoridad. No revelaremos la identidad de quien reporta al perfil denunciado salvo consentimiento, obligación legal o necesidad fundada de defensa, aplicando minimización.</p>
      </section>

      <section id="medicion">
        <h2>12. Cookies, almacenamiento local y medición opcional</h2>
        <h3>12.1. Funciones necesarias</h3>
        <p>Utilizamos cookies o almacenamiento equivalente para mantener la sesión, recordar la confirmación de mayoría de edad, conservar preferencias de privacidad, proteger formularios, limitar abuso, recordar historias vistas y operar funciones solicitadas. Estas tecnologías son necesarias para que ciertas partes del sitio funcionen y no se utilizan para publicidad conductual.</p>
        <h3>12.2. Google Tag Manager y Google Analytics</h3>
        <p>La medición es opcional y solo se carga si eliges <strong>“Aceptar medición”</strong> en el aviso de privacidad. Si aceptas, medimos visitas y acciones generales como registros, envíos de anuncios, clics de contacto, favoritos, likes y reseñas para entender el uso y mejorar Chile3X.</p>
        <p>No configuramos el envío a Google de nombres, correos, teléfonos, RUT, direcciones, archivos privados, texto libre ni identificadores internos de perfiles como parámetros de Analytics. Google puede tratar información técnica como dirección IP, navegador, dispositivo y señales de interacción conforme a sus propias condiciones y medidas disponibles.</p>
        <p>Si eliges <strong>“Solo necesarias”</strong>, el sitio seguirá funcionando sin cargar Google Tag Manager ni Google Analytics. Puedes retirar o cambiar tu elección en cualquier momento; el cambio no invalida el tratamiento anterior basado en tu consentimiento.</p>
        <p><a className="text-link" href="/privacidad?medicion=editar#medicion">Cambiar mi elección de medición <span aria-hidden="true">→</span></a></p>
      </section>

      <section id="proveedores">
        <h2>13. Proveedores tecnológicos y transferencias internacionales</h2>
        <p>Para operar Chile3X utilizamos proveedores que tratan datos por cuenta del portal o prestan infraestructura bajo sus propios términos:</p>
        <ul>
          <li><strong>Cloudflare:</strong> alojamiento del sitio, base de datos, almacenamiento de archivos, red de entrega, certificados, seguridad y Turnstile para combatir bots;</li>
          <li><strong>Google:</strong> correo transaccional y, solo con consentimiento, Google Tag Manager y Google Analytics;</li>
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
        <p>Conservamos datos mientras la cuenta o anuncio estén activos y después solo durante el tiempo necesario para cerrar operaciones, resolver reportes, prevenir fraude, cumplir obligaciones, ejercer o defender derechos y completar ciclos razonables de respaldo.</p>
        <ul>
          <li>Los anuncios dejan de mostrarse cuando se pausan, rechazan o eliminan, sin perjuicio de cachés externas.</li>
          <li>Las historias de imagen o video expiran públicamente a las 24 horas y se eliminan mediante los procesos programados del servicio; una copia transitoria puede subsistir brevemente en cachés o respaldos.</li>
          <li>Los estados de texto pueden conservarse hasta que su titular los elimine, expiren por configuración o la plataforma los retire.</li>
          <li>Los archivos privados se conservan mientras exista la finalidad de revisión, mientras su titular los mantenga o mientras sean necesarios para acreditar una actuación; al reemplazarlos se elimina la versión anterior del almacenamiento activo.</li>
          <li>Los reportes, evidencias y registros de seguridad pueden conservarse hasta resolver el caso y durante el plazo necesario para prevenir reiteración o atender responsabilidades legales.</li>
        </ul>
        <p>Cuando la eliminación inmediata no sea posible por respaldo, bloqueo legal o investigación, restringiremos el uso a esas finalidades y eliminaremos el dato al finalizar el motivo de conservación.</p>
      </section>

      <section id="derechos">
        <h2>16. Derechos sobre tus datos</h2>
        <p>De acuerdo con la Ley N.º 19.628 vigente, puedes solicitar información y acceso a tus datos, su rectificación cuando sean inexactos o estén desactualizados, su eliminación o cancelación cuando proceda y el bloqueo de determinados tratamientos en los casos legales.</p>
        <p>La Ley N.º 21.719, que entra en vigor el <strong>1 de diciembre de 2026</strong>, refuerza el marco chileno e incorpora de forma expresa derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo temporal, junto con reglas sobre decisiones automatizadas. Chile3X procurará aplicar anticipadamente esos estándares cuando sean compatibles con la normativa actualmente vigente y completará su adecuación antes de esa fecha.</p>
        <p>Estos derechos no son absolutos: una solicitud puede limitarse cuando sea necesario conservar antecedentes para obligaciones legales, seguridad, derechos de terceros, libertad de expresión, investigación de ilícitos o defensa de reclamaciones, explicando el fundamento aplicable.</p>
      </section>

      <section id="ejercicio">
        <h2>17. Cómo ejercer tus derechos</h2>
        <p>Puedes editar parte de tu información desde <Link href="/mi-cuenta">Mi cuenta</Link> o escribir a <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a> indicando:</p>
        <ul>
          <li>el derecho o solicitud que deseas ejercer;</li>
          <li>el correo asociado a tu cuenta y los datos necesarios para ubicar el anuncio;</li>
          <li>una explicación clara y, si corresponde, el dato correcto o el contenido cuya eliminación solicitas.</li>
        </ul>
        <p>Podemos verificar tu identidad con el método menos invasivo razonablemente disponible antes de entregar o modificar información. No envíes una contraseña. Las solicitudes se responderán dentro de los plazos de la ley vigente y serán gratuitas en los casos legalmente previstos.</p>
        <p>También puedes retirar el consentimiento de medición desde esta página, revocar accesos a la galería exclusiva, pausar anuncios, eliminar historias o solicitar el cierre de la cuenta mediante las opciones disponibles. Si consideras insatisfactoria la respuesta, puedes acudir a tribunales o a la autoridad competente, incluida la Agencia de Protección de Datos Personales una vez que ejerza sus atribuciones.</p>
      </section>

      <section id="seguridad">
        <h2>18. Medidas de seguridad y respuesta a incidentes</h2>
        <p>Aplicamos controles de acceso por rol y titularidad, almacenamiento privado para archivos sensibles, conexiones cifradas HTTPS, contraseñas resumidas criptográficamente, validación de formularios, protección anti-bot, registros de seguridad, copias de respaldo y revisión administrativa.</p>
        <p>Ningún sistema conectado a Internet es infalible. Si detectamos un incidente que afecte datos personales, investigaremos, limitaremos el daño, preservaremos evidencia y notificaremos a personas o autoridades cuando la ley lo exija o sea razonablemente necesario para reducir riesgos. Puedes informar una vulnerabilidad sin explotar ni divulgar datos ajenos escribiendo al canal oficial.</p>
      </section>

      <section id="menores">
        <h2>19. Protección de niñas, niños y adolescentes</h2>
        <p>Chile3X no está dirigido a menores de 18 años y no acepta su registro, publicación ni aparición en material. Si tomamos conocimiento o tenemos una sospecha razonable, bloquearemos el contenido o cuenta, podremos preservar la evidencia estrictamente necesaria y actuaremos conforme a la legislación y los requerimientos de las autoridades.</p>
        <p>Para reportar la posible presencia de una persona menor de edad, utiliza el botón de reporte si tienes una cuenta o escribe de inmediato a <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>. No descargues, reenvíes ni difundas el material.</p>
      </section>

      <section id="automatizacion">
        <h2>20. Moderación y decisiones automatizadas</h2>
        <p>Podemos utilizar validaciones automáticas para detectar formatos inválidos, spam, límites de carga, riesgo técnico o señales de abuso. Las decisiones relevantes de publicación, verificación y sanción contemplan revisión administrativa y no se basan exclusivamente en perfilamiento automatizado con efectos jurídicos equivalentes.</p>
        <p>Si una validación automática produce un error, puedes pedir intervención humana y revisión mediante el canal de soporte.</p>
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
