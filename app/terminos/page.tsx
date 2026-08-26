import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/app/legal/LegalPage";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Términos y condiciones de uso",
  description: "Términos de Chile3X para visitantes, cuentas, anunciantes, agencias, arriendos, publicaciones y contenido exclusivo.",
  path: "/terminos",
});

const sections = [
  ["alcance", "Alcance y aceptación"],
  ["adultos", "Acceso exclusivo para adultos"],
  ["rol", "Rol de Chile3X"],
  ["cuentas", "Cuentas y seguridad"],
  ["publicaciones", "Publicaciones y verificación"],
  ["agencias-arriendos", "Agencias y arriendos"],
  ["obligaciones", "Obligaciones del anunciante"],
  ["prohibiciones", "Prohibiciones esenciales"],
  ["comunidad", "Funciones de comunidad"],
  ["medios", "Fotos, videos e historias"],
  ["exclusivo", "Contenido exclusivo"],
  ["reportes", "Reportes y moderación"],
  ["propiedad", "Propiedad intelectual"],
  ["contacto-externo", "Contactos y enlaces externos"],
  ["disponibilidad", "Disponibilidad del servicio"],
  ["pagos-futuros", "Cobros y funciones futuras"],
  ["responsabilidad", "Responsabilidad"],
  ["termino", "Suspensión y cierre"],
  ["cambios", "Cambios de estos términos"],
  ["ley", "Ley aplicable y contacto"],
] as const;

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="DOCUMENTACIÓN LEGAL"
      title="Términos y condiciones de uso"
      summary={<p>Estas condiciones regulan el acceso y uso de <strong>chile3x.cl</strong>, un directorio para adultos con publicaciones de escorts, agencias y arriendos en Chile. Léelas antes de crear una cuenta, publicar o interactuar con un anuncio.</p>}
    >
      <nav className="legal-index" aria-label="Índice de términos y condiciones">
        <strong>Contenido</strong>
        <ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
      </nav>

      <section id="alcance">
        <h2>1. Alcance y aceptación</h2>
        <p>Estos términos constituyen el acuerdo entre quien visita, crea una cuenta o utiliza cualquier función de Chile3X (la “persona usuaria”) y Chile3X respecto del uso del sitio <strong>chile3x.cl</strong> y sus servicios asociados. La <Link href="/privacidad">Política de privacidad</Link> y las <Link href="/reglas-de-publicacion">Reglas de publicación</Link> forman parte de este marco.</p>
        <p>Crear una cuenta, enviar una publicación o utilizar funciones reservadas exige aceptar estas condiciones de manera libre e informada. La sola visita al sitio no crea una obligación de pago. Si no estás de acuerdo, no debes crear una cuenta ni utilizar funciones que requieran aceptación.</p>
      </section>

      <section id="adultos">
        <h2>2. Acceso exclusivo para personas adultas</h2>
        <p>Chile3X está destinado exclusivamente a personas de <strong>18 años o más</strong>. Al ingresar declaras cumplir esa edad y te comprometes a no mostrar el sitio, entregar credenciales ni facilitar acceso a una persona menor de edad.</p>
        <p>La confirmación de mayoría de edad del aviso de entrada no equivale por sí sola a una verificación de identidad. Chile3X puede solicitar antecedentes adicionales para determinadas cuentas o publicaciones y rechazar, suspender o eliminar accesos cuando existan dudas razonables sobre la edad o identidad.</p>
      </section>

      <section id="rol">
        <h2>3. Rol y límites de Chile3X</h2>
        <p>Chile3X es una plataforma tecnológica de publicación, búsqueda y contacto. No presta servicios personales anunciados, no representa a visitantes o anunciantes y no es parte de citas, arriendos, viajes, comunicaciones, transferencias, pagos ni acuerdos que se realicen fuera del portal.</p>
        <p>La aprobación de un anuncio, una etiqueta o un distintivo de verificación indica únicamente que Chile3X realizó una revisión administrativa con los antecedentes disponibles en ese momento. No certifica identidad permanente, conducta futura, condiciones sanitarias, disponibilidad, legalidad de un acuerdo externo ni ausencia total de riesgos.</p>
      </section>

      <section id="cuentas">
        <h2>4. Cuentas, credenciales y datos de registro</h2>
        <ul>
          <li>La información entregada debe ser veraz, actual y corresponder a la persona que crea la cuenta o a quien tenga autorización suficiente para actuar.</li>
          <li>Cada persona es responsable de mantener segura su contraseña y de las acciones efectuadas desde su cuenta. Debe avisar de inmediato si detecta un acceso no autorizado.</li>
          <li>No se permite vender, ceder, prestar ni compartir una cuenta para eludir una suspensión o permitir que otra persona se haga pasar por su titular.</li>
          <li>Chile3X puede solicitar corrección de datos, confirmación de correo, edad, identidad, autorización o representación antes de publicar o mantener un anuncio.</li>
          <li>Los datos legales y documentos privados de una cuenta no se muestran en el anuncio salvo que su titular los incorpore voluntariamente a un campo público.</li>
        </ul>
      </section>

      <section id="publicaciones">
        <h2>5. Publicaciones, revisión y distintivo de verificación</h2>
        <p>Los perfiles de escort, agencia y arriendo se envían a revisión manual antes de publicarse. Chile3X puede pedir cambios, rechazar material, limitar su alcance, pausar el anuncio o retirarlo cuando incumpla estas condiciones, las reglas de publicación, la ley o criterios razonables de seguridad.</p>
        <p>El distintivo verde de “verificado” es opcional y se concede manualmente. Refleja una comprobación adicional realizada con la información disponible al momento de la revisión; puede retirarse si los datos cambian, caducan, resultan inconsistentes o existe una alerta fundada.</p>
        <p>Una publicación aprobada puede volver a revisión cuando su titular modifica información relevante, foto principal, documentos, medios o datos que afecten la decisión original.</p>
      </section>

      <section id="agencias-arriendos">
        <h2>6. Reglas especiales para agencias y arriendos</h2>
        <h3>6.1. Agencias</h3>
        <p>Una agencia solo puede vincular a una escort con autorización expresa de esa persona. La invitación debe ser aceptada por la cuenta correspondiente; está prohibido crear relaciones aparentes, reutilizar identidades o agregar personas sin consentimiento. La agencia responde por la veracidad de su información institucional y por sus propios actos, sin adquirir propiedad ni control sobre las cuentas vinculadas.</p>
        <h3>6.2. Arriendos</h3>
        <p>Quien publica un arriendo declara tener derecho para ofrecer el espacio, entregar información veraz y cumplir las normas civiles, sanitarias, de copropiedad, seguridad y demás obligaciones aplicables. Chile3X no inspecciona inmuebles ni garantiza disponibilidad, condiciones, permisos o acuerdos entre las partes.</p>
        <p>Las categorías comerciales y etiquetas propias de escorts, como VIP, Premium, Gold, MILF, Trans, Hombres o Masajes, no se aplican a agencias ni arriendos.</p>
      </section>

      <section id="obligaciones">
        <h2>7. Obligaciones de quien publica</h2>
        <p>Quien envía un anuncio declara y garantiza que:</p>
        <ul>
          <li>es mayor de edad y actúa de forma libre, consciente y sin coacción;</li>
          <li>la descripción, ciudad, disponibilidad, servicios, precios, contactos, viajes y demás datos son auténticos y se mantienen actualizados;</li>
          <li>posee los derechos o autorizaciones necesarias sobre cada imagen, video, texto, marca y dato publicado;</li>
          <li>todas las personas identificables que aparecen en el material son adultas y autorizaron expresamente su captura y publicación;</li>
          <li>retirará o solicitará el retiro del material si pierde una autorización necesaria;</li>
          <li>no utilizará la plataforma para controlar, explotar, amenazar, endeudar, trasladar o beneficiarse abusivamente de otra persona.</li>
        </ul>
      </section>

      <section id="prohibiciones">
        <h2>8. Contenido y conductas estrictamente prohibidos</h2>
        <p>Está prohibido publicar, solicitar, enlazar, distribuir o utilizar Chile3X para:</p>
        <ul>
          <li>cualquier contenido, servicio o interacción que involucre a una persona menor de 18 años, incluso mediante apariencia simulada, edición digital o inteligencia artificial;</li>
          <li>trata de personas, explotación sexual, trabajo forzado, servidumbre, coacción, violencia, abuso de poder o aprovechamiento de vulnerabilidad o dependencia;</li>
          <li>difundir imágenes o sonidos íntimos sin autorización expresa, material obtenido de forma clandestina, “revenge porn”, sextorsión o amenazas de publicación;</li>
          <li>mostrar a una persona inconsciente, incapacitada para consentir, bajo violencia real o en una situación que razonablemente sugiera ausencia de consentimiento;</li>
          <li>suplantar identidades, crear perfiles falsos, utilizar deepfakes o contenido sintético para atribuir actos reales a otra persona, o alterar documentos;</li>
          <li>publicar datos privados de terceros, domicilios exactos no autorizados, documentos, teléfonos o información destinada a acosar, perseguir o extorsionar;</li>
          <li>ofrecer actividades con animales, armas, drogas, lesiones reales, delitos o cualquier prestación prohibida por la legislación aplicable;</li>
          <li>estafar, lavar activos, enviar spam, manipular reseñas o métricas, captar credenciales, introducir malware, vulnerar medidas de seguridad o extraer datos masivamente sin autorización;</li>
          <li>discriminar, hostigar, amenazar o incitar violencia contra una persona o grupo.</li>
        </ul>
        <p className="legal-callout">Ante indicios de minoría de edad, explotación, trata, violencia o difusión íntima no consentida, Chile3X puede retirar preventivamente el contenido, preservar antecedentes necesarios y colaborar con las autoridades competentes conforme a la ley.</p>
      </section>

      <section id="comunidad">
        <h2>9. Favoritos, likes, reseñas, comentarios, bloqueos y reportes</h2>
        <p>Las cuentas pueden utilizar funciones de comunidad de acuerdo con su disponibilidad. Las reseñas y comentarios deben referirse a experiencias reales, expresarse con respeto y no contener datos personales, amenazas, extorsión, publicidad, acusaciones deliberadamente falsas ni contenido ilícito.</p>
        <p>Bloquear un anuncio solo lo oculta para la cuenta que realizó la acción; no sanciona al anunciante. Reportar inicia una revisión, no determina culpabilidad. El uso coordinado de votos, likes, reportes o reseñas para manipular resultados está prohibido.</p>
      </section>

      <section id="medios">
        <h2>10. Fotos, videos, historias y estados</h2>
        <p>Todo material enviado queda sujeto a moderación. Chile3X puede redimensionar, comprimir, recortar técnicamente y aplicar una marca de agua para mostrarlo y protegerlo dentro del servicio, sin que ello asegure impedir toda copia por terceros.</p>
        <p>Las historias de imagen o video tienen vigencia pública limitada según la función disponible. Los estados de texto pueden conservarse por más tiempo hasta que la persona los elimine o la plataforma los retire. El contenido temporal sigue sujeto a estas condiciones durante toda su existencia.</p>
      </section>

      <section id="exclusivo">
        <h2>11. Galería de contenido exclusivo</h2>
        <p>Cuando esté habilitada, la persona anunciante puede cargar material en una galería privada y autorizar cuentas concretas mediante su correo registrado. El material se muestra bloqueado o difuminado a quienes no tengan acceso. La autorización puede revocarse, pero no permite controlar copias que una persona autorizada haya realizado fuera del portal.</p>
        <p>Chile3X no procesa actualmente el pago por ese acceso ni actúa como vendedor, comprador, representante o garante de acuerdos económicos externos. Solo puede subirse material propio, consentido y lícito. Está prohibido conceder acceso a menores de edad o compartir las credenciales de una cuenta autorizada.</p>
      </section>

      <section id="reportes">
        <h2>12. Reportes, evidencias y moderación</h2>
        <p>Una cuenta iniciada puede reportar un anuncio, explicar el motivo y adjuntar hasta el límite de evidencias informado en el formulario. Esos antecedentes son privados y se muestran al equipo autorizado y a la persona que reportó en su panel; no se publican en el anuncio.</p>
        <p>Chile3X puede solicitar información, ocultar contenido preventivamente, dejar una publicación pendiente, rechazar cambios, desactivar cuentas, revocar verificaciones o eliminar material. La gravedad, reiteración, riesgo para terceros y colaboración durante la revisión pueden considerarse. Las solicitudes de reconsideración se reciben en el canal oficial de contacto, sin perjuicio de las denuncias que correspondan ante autoridades.</p>
      </section>

      <section id="propiedad">
        <h2>13. Propiedad intelectual y licencia de publicación</h2>
        <p>Cada titular conserva los derechos sobre el contenido que aporta. Al enviarlo concede a Chile3X una licencia no exclusiva, gratuita, revocable respecto de usos futuros y limitada a operar, almacenar, respaldar, adaptar técnicamente, moderar, proteger, promocionar el propio anuncio y mostrar el contenido dentro del portal y sus vistas previas.</p>
        <p>La parte pública de un anuncio puede ser indexada por buscadores y aparecer al compartir enlaces en redes sociales. Retirar el anuncio detiene usos futuros controlados por Chile3X, pero la desindexación, cachés o copias de terceros pueden tardar y dependen de esos servicios.</p>
        <p>Las marcas, diseño, código, textos institucionales y elementos propios de Chile3X no pueden copiarse, comercializarse ni reutilizarse sin autorización. Para reclamar por uso no autorizado de material, escribe a <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a> e identifica el contenido y tu relación con él.</p>
      </section>

      <section id="contacto-externo">
        <h2>14. Contactos, redes y servicios externos</h2>
        <p>Los botones de teléfono, WhatsApp, Telegram, Instagram, Arsmate, OnlyFans y otros enlaces conducen a servicios de terceros con sus propias reglas y políticas. Chile3X no controla sus mensajes, cobros, disponibilidad, seguridad ni tratamiento de datos.</p>
        <p>La agenda de viajes es únicamente informativa: no modifica automáticamente la ciudad principal ni constituye intermediación, transporte o garantía. Está prohibido utilizarla para captar, trasladar o explotar personas o para facilitar conductas contrarias a los artículos 411 ter y 411 quáter del Código Penal u otras normas aplicables.</p>
      </section>

      <section id="disponibilidad">
        <h2>15. Disponibilidad, mantenimiento y cambios técnicos</h2>
        <p>Chile3X procura mantener el servicio disponible, pero puede realizar mantenimiento, corregir fallas, cambiar funciones, limitar cargas o suspender temporalmente áreas por seguridad, capacidad, cumplimiento legal o causas fuera de su control. No se garantiza funcionamiento continuo ni compatibilidad con todos los dispositivos.</p>
        <p>Las copias de respaldo y medidas de recuperación reducen riesgos, pero no reemplazan el deber de cada anunciante de conservar sus propios archivos y antecedentes originales.</p>
      </section>

      <section id="pagos-futuros">
        <h2>16. Publicación gratuita actual, planes y funciones futuras</h2>
        <p>Mientras Chile3X no informe expresamente lo contrario, el registro y los flujos actuales no generan un cobro automático. Los pagos integrados, suscripciones automatizadas, venta de contenido y billeteras no forman parte del servicio vigente.</p>
        <p>Si se habilitan funciones pagadas, antes de contratar se informarán de forma clara el precio en pesos chilenos, duración, renovación, medios de pago, impuestos, forma de terminación, retracto cuando legalmente proceda y condiciones particulares. La aceptación se solicitará separadamente y se entregará una confirmación que pueda conservarse, conforme a la Ley N.º 19.496 y demás normas aplicables.</p>
      </section>

      <section id="responsabilidad">
        <h2>17. Responsabilidad y seguridad personal</h2>
        <p>Las personas usuarias deben evaluar por sí mismas cualquier contacto o acuerdo externo, proteger sus datos, evitar anticipos sospechosos y adoptar medidas razonables de seguridad. Chile3X no garantiza la identidad permanente, solvencia, ubicación, conducta, calidad, salud ni cumplimiento de otra persona.</p>
        <p>Nada en estos términos excluye responsabilidades que no puedan limitarse conforme a la ley, derechos irrenunciables de consumidores cuando sean aplicables ni responsabilidad propia de Chile3X por dolo o culpa grave. La plataforma responderá dentro del alcance exigido por la legislación chilena.</p>
      </section>

      <section id="termino">
        <h2>18. Pausa, suspensión, cierre y eliminación</h2>
        <p>La persona anunciante puede pausar publicaciones y solicitar el cierre de su cuenta mediante las funciones disponibles o el canal de soporte. Chile3X puede restringir o terminar el acceso por incumplimiento, riesgo, requerimiento de autoridad, fraude, inactividad prolongada o necesidad operativa fundada.</p>
        <p>El cierre no elimina de inmediato antecedentes que deban conservarse para resolver reportes, prevenir abuso, ejercer o defender derechos, cumplir obligaciones legales o mantener respaldos transitorios. El tratamiento posterior se rige por la Política de privacidad.</p>
      </section>

      <section id="cambios">
        <h2>19. Cambios de estos términos</h2>
        <p>Chile3X puede actualizar estas condiciones por cambios funcionales, legales, técnicos o de seguridad. La versión y fecha vigentes se mostrarán en esta página. Los cambios materiales se comunicarán con una anticipación razonable por el sitio, la cuenta o correo, salvo que una medida urgente de seguridad o una obligación legal requiera aplicación inmediata.</p>
        <p>Cuando una modificación necesite un consentimiento nuevo, se solicitará antes de aplicar la función correspondiente. El uso posterior a la entrada en vigor no convalida cláusulas que legalmente requieran aceptación expresa.</p>
      </section>

      <section id="ley">
        <h2>20. Legislación chilena, autoridades y contacto</h2>
        <p>Estos términos se interpretan conforme a las leyes de la República de Chile, incluyendo, según corresponda, la Ley N.º 19.628 sobre protección de la vida privada, la Ley N.º 19.496 sobre protección de los derechos de los consumidores, la Ley N.º 19.799 sobre documentos y firma electrónica, el Código Penal y la Ley N.º 21.719 desde su entrada en vigencia el <strong>1 de diciembre de 2026</strong>.</p>
        <p>Antes de iniciar una controversia, puedes solicitar una revisión escribiendo a <a href="mailto:chile3x.site@gmail.com">chile3x.site@gmail.com</a>. Esto no limita el derecho a acudir a SERNAC, tribunales, policías, Ministerio Público, la futura Agencia de Protección de Datos Personales u otra autoridad competente.</p>
        <div className="legal-sources">
          <h3>Fuentes legales oficiales</h3>
          <ul>
            <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noreferrer">Ley N.º 19.628 sobre protección de la vida privada</a></li>
            <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=1209272" target="_blank" rel="noreferrer">Ley N.º 21.719 sobre protección de datos personales</a></li>
            <li><a href="https://www.bcn.cl/leychile/navegar?idNorma=61438" target="_blank" rel="noreferrer">Ley N.º 19.496 sobre protección de los derechos de los consumidores</a></li>
          </ul>
        </div>
      </section>
    </LegalPage>
  );
}
