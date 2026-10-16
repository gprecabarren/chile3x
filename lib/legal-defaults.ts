import type { LegalDocument } from './legal-document';
// Exact mechanical import of the published 2026.10.14.3 texts. Not new legal advice.
export const DEFAULT_LEGAL_DOCUMENTS = {
  "terms": {
    "title": "Términos y condiciones de uso",
    "description": "Términos de Chile3X para visitantes, cuentas, anunciantes, agencias, arriendos, publicaciones y contenido exclusivo.",
    "summary": "Estas condiciones regulan el acceso y uso de **chile3x.cl**, un directorio para adultos con publicaciones de escorts, agencias y arriendos en Chile. Su lectura es necesaria antes de crear una cuenta, publicar o interactuar con un anuncio.",
    "notice": "",
    "sections": [
      {
        "id": "alcance",
        "title": "Alcance y aceptación",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Estos términos constituyen el acuerdo entre quien visita, crea una cuenta o utiliza cualquier función de Chile3X (la “persona usuaria”) y Chile3X respecto del uso del sitio **chile3x.cl** y sus servicios asociados. La [Política de privacidad](/privacidad) y las [Reglas de publicación](/reglas-de-publicacion) forman parte de este marco."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Crear una cuenta, enviar una publicación o utilizar funciones reservadas exige aceptar estas condiciones de manera libre e informada. La sola visita al sitio no crea una obligación de pago. Quien no acepte estas condiciones deberá abstenerse de utilizar funciones que requieran su aceptación."
          }
        ]
      },
      {
        "id": "adultos",
        "title": "Acceso exclusivo para personas adultas",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X está destinado exclusivamente a personas de **18 años o más**. Al ingresar, la persona usuaria declara cumplir esa edad y se obliga a no facilitar el acceso ni entregar sus credenciales a personas menores de edad."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La confirmación de mayoría de edad del aviso de entrada no equivale por sí sola a una verificación de identidad. Chile3X puede solicitar antecedentes adicionales para determinadas cuentas o publicaciones y rechazar, suspender o eliminar accesos cuando existan dudas razonables sobre la edad o identidad."
          }
        ]
      },
      {
        "id": "rol",
        "title": "Rol y límites de Chile3X",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X es una plataforma tecnológica de publicación, búsqueda y contacto. No presta servicios personales anunciados, no representa a visitantes o anunciantes y no es parte de citas, arriendos, viajes, comunicaciones, transferencias, pagos ni acuerdos que se realicen fuera del portal."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La aprobación de un anuncio, una etiqueta o un distintivo de verificación indica únicamente que Chile3X realizó una revisión administrativa con los antecedentes disponibles en ese momento. No certifica identidad permanente, conducta futura, condiciones sanitarias, disponibilidad, legalidad de un acuerdo externo ni ausencia total de riesgos."
          }
        ]
      },
      {
        "id": "cuentas",
        "title": "Cuentas, credenciales y datos de registro",
        "blocks": [
          {
            "id": "block-2",
            "type": "list",
            "text": "",
            "items": [
              "La información entregada debe ser veraz, actual y corresponder a la persona que crea la cuenta o a quien tenga autorización suficiente para actuar.",
              "Cada persona es responsable de mantener segura su contraseña y de las acciones efectuadas desde su cuenta. Debe avisar de inmediato si detecta un acceso no autorizado.",
              "No se permite vender, ceder, prestar ni compartir una cuenta para eludir una suspensión o permitir que otra persona se haga pasar por su titular.",
              "Chile3X puede solicitar corrección de datos, confirmación de correo, edad, identidad, autorización o representación antes de publicar o mantener un anuncio.",
              "Los accesos federados admitidos deben corresponder a una identidad compatible y respetar las validaciones de registro. Google se encuentra disponible; Apple y X permanecen preparados e inactivos mientras no se habiliten expresamente. Las identidades administrativas continúan separadas e ingresan mediante GitHub.",
              "La desvinculación de un proveedor exige configurar y confirmar una contraseña de acceso. No elimina la cuenta ni deja sin verificar un correo previamente verificado. Los cambios de método de acceso se registran para su consulta por la persona titular y administración autorizada.",
              "Los datos legales y documentos privados de una cuenta no se muestran en el anuncio salvo que su titular los incorpore voluntariamente a un campo público."
            ],
            "ordered": false
          }
        ]
      },
      {
        "id": "publicaciones",
        "title": "Publicaciones, revisión y distintivo de verificación",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Los perfiles de escort, agencia y arriendo se envían a revisión manual antes de publicarse. Chile3X puede pedir cambios, rechazar material, limitar su alcance, pausar el anuncio o retirarlo cuando incumpla estas condiciones, las reglas de publicación, la ley o criterios razonables de seguridad."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "El distintivo verde de “verificado” es opcional y se concede manualmente. Refleja una comprobación adicional realizada con la información disponible al momento de la revisión; puede retirarse si los datos cambian, caducan, resultan inconsistentes o existe una alerta fundada."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "La revisión del anuncio y la aprobación de sus archivos son controles distintos. Los archivos nuevos o reemplazados se someten a su revisión correspondiente; su carga no implica, por sí sola, que toda la publicación cambie de estado. El equipo puede revisar, limitar o retirar un anuncio cuando existan cambios o antecedentes que lo justifiquen."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "La persona titular y administración autorizada pueden consultar una vista previa privada de anuncios no publicados. Esa vista no constituye aprobación ni permite su acceso público. Administración puede editar datos, revisar documentos privados y publicar historias por cuenta del anunciante dentro de sus permisos; estas actuaciones deben responder a una solicitud, autorización o finalidad operativa legítima y quedan registradas."
          }
        ]
      },
      {
        "id": "agencias-arriendos",
        "title": "Reglas especiales para agencias y arriendos",
        "blocks": [
          {
            "id": "block-2",
            "type": "subheading",
            "text": "Agencias",
            "numbered": true
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Una agencia solo puede vincular a una escort con autorización expresa de esa persona. La invitación debe ser aceptada por la cuenta correspondiente; está prohibido crear relaciones aparentes, reutilizar identidades o agregar personas sin consentimiento. La agencia responde por la veracidad de su información institucional y por sus propios actos, sin adquirir propiedad ni control sobre las cuentas vinculadas."
          },
          {
            "id": "block-6",
            "type": "subheading",
            "text": "Arriendos",
            "numbered": true
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "Quien publica un arriendo declara tener derecho para ofrecer el espacio, entregar información veraz y cumplir las normas civiles, sanitarias, de copropiedad, seguridad y demás obligaciones aplicables. Chile3X no inspecciona inmuebles ni garantiza disponibilidad, condiciones, permisos o acuerdos entre las partes."
          },
          {
            "id": "block-10",
            "type": "paragraph",
            "text": "Las categorías de visibilidad y etiquetas propias de escorts, como VIP, Premium, Bronze, MILF, Trans, Hombres o Masajes, no se aplican a agencias ni arriendos."
          }
        ]
      },
      {
        "id": "obligaciones",
        "title": "Obligaciones de quien publica",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Quien envía un anuncio declara y garantiza que:"
          },
          {
            "id": "block-4",
            "type": "list",
            "text": "",
            "items": [
              "es mayor de edad y actúa de forma libre, consciente y sin coacción;",
              "la descripción, ciudad, disponibilidad, servicios, precios, contactos, viajes y demás datos son auténticos y se mantienen actualizados;",
              "posee los derechos o autorizaciones necesarias sobre cada imagen, video, texto, marca y dato publicado;",
              "todas las personas identificables que aparecen en el material son adultas y autorizaron expresamente su captura y publicación;",
              "retirará o solicitará el retiro del material si pierde una autorización necesaria;",
              "no utilizará la plataforma para controlar, explotar, amenazar, endeudar, trasladar o beneficiarse abusivamente de otra persona."
            ],
            "ordered": false
          }
        ]
      },
      {
        "id": "prohibiciones",
        "title": "Contenido y conductas estrictamente prohibidos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Está prohibido publicar, solicitar, enlazar, distribuir o utilizar Chile3X para:"
          },
          {
            "id": "block-4",
            "type": "list",
            "text": "",
            "items": [
              "cualquier contenido, servicio o interacción que involucre a una persona menor de 18 años, incluso mediante apariencia simulada, edición digital o inteligencia artificial;",
              "trata de personas, explotación sexual, trabajo forzado, servidumbre, coacción, violencia, abuso de poder o aprovechamiento de vulnerabilidad o dependencia;",
              "difundir imágenes o sonidos íntimos sin autorización expresa, material obtenido de forma clandestina, “revenge porn”, sextorsión o amenazas de publicación;",
              "mostrar a una persona inconsciente, incapacitada para consentir, bajo violencia real o en una situación que razonablemente sugiera ausencia de consentimiento;",
              "suplantar identidades, crear perfiles falsos, utilizar deepfakes o contenido sintético para atribuir actos reales a otra persona, o alterar documentos;",
              "publicar datos privados de terceros, domicilios exactos no autorizados, documentos, teléfonos o información destinada a acosar, perseguir o extorsionar;",
              "ofrecer actividades con animales, armas, drogas, lesiones reales, delitos o cualquier prestación prohibida por la legislación aplicable;",
              "estafar, lavar activos, enviar spam, manipular reseñas o métricas, captar credenciales, introducir malware, vulnerar medidas de seguridad o extraer datos masivamente sin autorización;",
              "discriminar, hostigar, amenazar o incitar violencia contra una persona o grupo."
            ],
            "ordered": false
          },
          {
            "id": "block-6",
            "type": "callout",
            "text": "Ante indicios de minoría de edad, explotación, trata, violencia o difusión íntima no consentida, Chile3X puede retirar preventivamente el contenido, preservar antecedentes necesarios y colaborar con las autoridades competentes conforme a la ley."
          }
        ]
      },
      {
        "id": "comunidad",
        "title": "Favoritos, likes, reseñas, mensajes, Telegram, bloqueos y reportes",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Las cuentas pueden utilizar funciones de comunidad de acuerdo con su disponibilidad. Las reseñas y comentarios deben referirse a experiencias reales, expresarse con respeto y no contener datos personales, amenazas, extorsión, publicidad, acusaciones deliberadamente falsas ni contenido ilícito."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Bloquear un anuncio solo lo oculta para la cuenta que realizó la acción; no sanciona al anunciante. Reportar inicia una revisión, no determina culpabilidad. El uso coordinado de votos, likes, reportes o reseñas para manipular resultados está prohibido."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "El chat interno vincula cada conversación con un anuncio y exige una cuenta activa. Está prohibido usarlo para spam, acoso, amenazas, suplantación, captación ilícita, envío de malware o intercambio de contenido ilegal. Silenciar detiene avisos; bloquear impide mensajes nuevos y mantiene el historial disponible mientras corresponda. Si una cuenta se deshabilita o elimina, su identidad visible se reemplaza por “Usuario de Chile3X” para el otro participante y no se admiten mensajes nuevos. Esta sustitución no garantiza la anonimización del contenido previo: los propios mensajes podrían contener referencias identificables."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "El centro de ayuda beta, denominado “Johnny Sins”, es un bot de búsqueda guiada basado en documentación revisada del sitio. No constituye atención humana, asesoría profesional ni inteligencia artificial generativa; sus respuestas pueden contener errores y no ejecutan modificaciones de cuentas. La persona usuaria debe verificar los pasos y recurrir a los canales oficiales cuando no se resuelva su consulta. El nombre y la imagen no implican participación, afiliación ni respaldo del actor."
          },
          {
            "id": "block-10",
            "type": "paragraph",
            "text": "El foro se encuentra en una beta privada accesible exclusivamente a administración autorizada. No admite participación de usuarios generales ni constituye una sección pública. Publicar exige confirmar las normas vigentes, que pueden consultarse en su sección propia. Sus temas, respuestas y adjuntos están sujetos a las prohibiciones de estos términos: no se permite incluir documentos privados ni datos personales de terceros. Todo adjunto requiere derechos de publicación y consentimiento de las personas adultas representadas, queda pendiente de revisión y está sujeto a límites de frecuencia, tamaño y almacenamiento. Una aprobación administrativa no certifica identidad, legalidad ni ausencia de riesgos."
          },
          {
            "id": "block-12",
            "type": "paragraph",
            "text": "Las herramientas del foro permiten solicitar revisión o rectificación de mensajes, registrar decisiones de moderación y seguir temas con notificaciones internas propias, sin correos automáticos. Los adjuntos retirados, rechazados o asociados a mensajes o temas en papelera se depuran tras 30 días; las notificaciones, tras 90 días, y las denuncias cerradas, tras 180 días, conforme a la Política de privacidad y sus excepciones fundadas. Una apertura posterior requerirá informar previamente sus reglas y condiciones y revisar expresamente los permisos de acceso."
          },
          {
            "id": "block-14",
            "type": "paragraph",
            "text": "La comunidad pública de Telegram puede utilizarse sin cuenta Chile3X. El acceso al espacio privado de Miembros requiere una cuenta activa, correo verificado y vinculación voluntaria con el bot. Los mensajes quedan sujetos a las reglas de la comunidad, a las condiciones de Telegram y a moderación manual o automática por spam, fraude, amenazas, acoso, contenido ilícito o reincidencia. Una medida en Telegram no reemplaza por sí sola una decisión sobre la cuenta del sitio."
          }
        ]
      },
      {
        "id": "medios",
        "title": "Fotos, videos, historias y estados",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Todo material enviado queda sujeto a moderación. El sistema puede redimensionar, comprimir y convertir técnicamente archivos para su publicación. La marca de agua en fotos y videos y el difuminado de rostros en fotografías se aplican cuando se seleccionan las opciones correspondientes; el difuminado de videos no se encuentra habilitado. La preparación se realiza en el dispositivo cuando la función lo permite y se almacena el archivo final, sin conservar una segunda copia del original por ese procesamiento. Estas medidas no garantizan impedir copias ni ocultar correctamente todos los rostros; el resultado debe revisarse antes de enviarlo."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La galería del anuncio admite fotografías finales de hasta 10 MB y videos finales de hasta 12 MB y 15 segundos. Las historias admiten hasta cinco fotografías finales de 5 MB, cinco estados de texto y tres videos de hasta 12 MB y 15 segundos activos por anuncio. Los formularios informan los formatos y demás restricciones aplicables; documentos privados y otros tipos de archivo tienen controles específicos."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Las historias de fotografía, video y texto expiran públicamente a las 24 horas. Una tarea programada elimina los archivos y registros vencidos del almacenamiento activo; su ejecución puede demorarse ante errores técnicos o acumulación de tareas, sin prolongar el acceso público. Las copias transitorias de respaldo o caché se rigen por la Política de privacidad. El contenido temporal sigue sujeto a estas condiciones durante toda su existencia."
          }
        ]
      },
      {
        "id": "exclusivo",
        "title": "Galería de contenido exclusivo",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Cuando esté habilitada, la persona anunciante puede cargar material en una galería privada y autorizar cuentas concretas mediante su correo registrado. El material se muestra bloqueado o difuminado a quienes no tengan acceso. La autorización puede revocarse, pero no permite controlar copias que una persona autorizada haya realizado fuera del portal."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Chile3X no procesa actualmente el pago por ese acceso ni actúa como vendedor, comprador, representante o garante de acuerdos económicos externos. Solo puede subirse material propio, consentido y lícito. Está prohibido conceder acceso a menores de edad o compartir las credenciales de una cuenta autorizada."
          }
        ]
      },
      {
        "id": "reportes",
        "title": "Reportes, evidencias y moderación",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Una cuenta iniciada puede reportar un anuncio, explicar el motivo y adjuntar hasta el límite de evidencias informado en el formulario. Esos antecedentes son privados y se muestran al equipo autorizado y a la persona que reportó en su panel; no se publican en el anuncio."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Chile3X puede solicitar información, ocultar contenido preventivamente, dejar una publicación pendiente, rechazar cambios, desactivar cuentas, revocar verificaciones o eliminar material. La gravedad, reiteración, riesgo para terceros y colaboración durante la revisión pueden considerarse. Las solicitudes de reconsideración se reciben en el canal oficial de contacto, sin perjuicio de las denuncias que correspondan ante autoridades."
          }
        ]
      },
      {
        "id": "propiedad",
        "title": "Propiedad intelectual y licencia de publicación",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Cada titular conserva los derechos sobre el contenido que aporta. Al enviarlo concede a Chile3X una licencia no exclusiva, gratuita, revocable respecto de usos futuros y limitada a operar, almacenar, respaldar, adaptar técnicamente, moderar, proteger, promocionar el propio anuncio y mostrar el contenido dentro del portal y sus vistas previas."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La parte pública de un anuncio puede ser indexada por buscadores y aparecer al compartir enlaces en redes sociales. Retirar el anuncio detiene usos futuros controlados por Chile3X, pero la desindexación, cachés o copias de terceros pueden tardar y dependen de esos servicios."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Las marcas, diseño, código, textos institucionales y elementos propios de Chile3X no pueden copiarse, comercializarse ni reutilizarse sin autorización. Las reclamaciones por uso no autorizado de material se reciben en [chile3x.site@gmail.com](mailto:chile3x.site@gmail.com), indicando el contenido y la relación de quien reclama con él."
          }
        ]
      },
      {
        "id": "contacto-externo",
        "title": "Contactos, redes y servicios externos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Los botones de teléfono, WhatsApp, Telegram, Instagram, Arsmate, OnlyFans y otros enlaces conducen a servicios de terceros con sus propias reglas y políticas. Chile3X no controla sus mensajes, cobros, disponibilidad, seguridad ni tratamiento de datos."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Dentro de un anuncio con contacto disponible, el panel de WhatsApp distingue y presenta primero al anunciante, seguido de los canales del equipo de Chile3X. Soporte y marketing no representan al anunciante ni coordinan sus servicios. Los contadores registran pulsaciones, no mensajes enviados ni una garantía de contacto efectivo."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Cuando una persona vincula Telegram, el bot puede comprobar su identidad del sitio, administrar invitaciones, sincronizar Novedades y aplicar las medidas descritas en las reglas. Chile3X no solicita la contraseña de Telegram. El botón de Apple permanece inactivo mientras no exista una configuración completa; si se habilita, la autenticación se realizará en los servidores de Apple y el correo asociado quedará bloqueado en Chile3X."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "La agenda de viajes y los horarios son información declarada por el anunciante. Mostrar “24/7” resume una configuración de atención durante las 24 horas de los siete días y no acredita disponibilidad real en cada momento. La agenda no modifica automáticamente la ciudad principal ni constituye intermediación, transporte o garantía. Está prohibido utilizarla para captar, trasladar o explotar personas o facilitar conductas contrarias a los artículos 411 ter y 411 quáter del Código Penal u otras normas aplicables."
          }
        ]
      },
      {
        "id": "disponibilidad",
        "title": "Disponibilidad, mantenimiento y cambios técnicos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X procura mantener el servicio disponible, pero puede realizar mantenimiento, corregir fallas, cambiar funciones, limitar cargas o suspender temporalmente áreas por seguridad, capacidad, cumplimiento legal o causas fuera de su control. No se garantiza funcionamiento continuo ni compatibilidad con todos los dispositivos."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Las copias de respaldo y medidas de recuperación reducen riesgos, pero no reemplazan el deber de cada anunciante de conservar sus propios archivos y antecedentes originales."
          }
        ]
      },
      {
        "id": "pagos-futuros",
        "title": "Publicación gratuita actual, planes y funciones futuras",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Mientras Chile3X no informe expresamente lo contrario, el registro y los flujos actuales no generan un cobro automático. Los pagos integrados, suscripciones automatizadas, venta de contenido y billeteras no forman parte del servicio vigente."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Si se habilitan funciones pagadas, antes de contratar se informarán de forma clara el precio en pesos chilenos, duración, renovación, medios de pago, impuestos, forma de terminación, retracto cuando legalmente proceda y condiciones particulares. La aceptación se solicitará separadamente y se entregará una confirmación que pueda conservarse, conforme a la Ley N.º 19.496 y demás normas aplicables."
          }
        ]
      },
      {
        "id": "responsabilidad",
        "title": "Responsabilidad y seguridad personal",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Las personas usuarias deben evaluar por sí mismas cualquier contacto o acuerdo externo, proteger sus datos, evitar anticipos sospechosos y adoptar medidas razonables de seguridad. Chile3X no garantiza la identidad permanente, solvencia, ubicación, conducta, calidad, salud ni cumplimiento de otra persona."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Nada en estos términos excluye responsabilidades que no puedan limitarse conforme a la ley, derechos irrenunciables de consumidores cuando sean aplicables ni responsabilidad propia de Chile3X por dolo o culpa grave. La plataforma responderá dentro del alcance exigido por la legislación chilena."
          }
        ]
      },
      {
        "id": "termino",
        "title": "Pausa, suspensión, cierre y eliminación",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "La persona anunciante puede ocultar temporalmente sus publicaciones y solicitar el cierre de su cuenta mediante las funciones disponibles o el canal de soporte. Chile3X puede restringir o terminar el acceso por incumplimiento, riesgo, requerimiento de autoridad, fraude, inactividad prolongada o necesidad operativa fundada."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "El cierre no elimina de inmediato antecedentes que deban conservarse para resolver reportes, prevenir abuso, ejercer o defender derechos, cumplir obligaciones legales o mantener respaldos transitorios. El tratamiento posterior se rige por la Política de privacidad."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Los plazos ordinarios de conservación se describen en la [sección 15 de la Política de privacidad](/privacidad#conservacion): documentos de identidad hasta 90 días, archivos médicos hasta 30 días, reportes resueltos hasta 180 días, conversaciones sin nuevos mensajes y auditoría hasta 365 días. Las historias conservan su duración de 24 horas. La transición de la nueva depuración no posterga solicitudes de eliminación ni permite mantener una historia vencida visible."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "Una sesión del navegador no puede operar simultáneamente como cuenta pública y como identidad administrativa. Iniciar sesión en otro panel cierra la sesión anterior de ese navegador; los correos administrativos reservados no pueden utilizarse para crear o recuperar cuentas públicas. Los accesos contradictorios se rechazan y requieren una nueva autenticación."
          },
          {
            "id": "block-10",
            "type": "paragraph",
            "text": "Deshabilitar o eliminar una cuenta revoca su acceso al espacio privado de Telegram. Cuando una cuenta creada con Apple se elimine permanentemente y el proveedor esté activo, Chile3X intentará además revocar la autorización externa antes de borrar localmente la identidad."
          }
        ]
      },
      {
        "id": "cambios",
        "title": "Cambios de estos términos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X puede actualizar estas condiciones por cambios funcionales, legales, técnicos o de seguridad. La versión y fecha vigentes se mostrarán en esta página. Los cambios materiales se comunicarán con una anticipación razonable por el sitio, la cuenta o correo, salvo que una medida urgente de seguridad o una obligación legal requiera aplicación inmediata."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Cuando una modificación necesite un consentimiento nuevo, se solicitará antes de aplicar la función correspondiente. El uso posterior a la entrada en vigor no convalida cláusulas que legalmente requieran aceptación expresa."
          }
        ]
      },
      {
        "id": "ley",
        "title": "Legislación chilena, autoridades y contacto",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Estos términos se interpretan conforme a las leyes de la República de Chile, incluyendo, según corresponda, la Ley N.º 19.628 sobre protección de la vida privada, la Ley N.º 19.496 sobre protección de los derechos de los consumidores, la Ley N.º 19.799 sobre documentos y firma electrónica, el Código Penal y la Ley N.º 21.719 desde su entrada en vigencia el **1 de diciembre de 2026**."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Antes de iniciar una controversia, puede solicitarse una revisión escribiendo a [chile3x.site@gmail.com](mailto:chile3x.site@gmail.com). Esto no limita el derecho a acudir a SERNAC, tribunales, policías, Ministerio Público, la Agencia de Protección de Datos Personales cuando ejerza sus atribuciones u otra autoridad competente."
          },
          {
            "id": "block-6",
            "type": "sources",
            "text": "Fuentes legales oficiales",
            "items": [
              "[Ley N.º 19.628 sobre protección de la vida privada](https://www.bcn.cl/leychile/navegar?idNorma=141599)",
              "[Ley N.º 21.719 sobre protección de datos personales](https://www.bcn.cl/leychile/navegar?idNorma=1209272)",
              "[Ley N.º 19.496 sobre protección de los derechos de los consumidores](https://www.bcn.cl/leychile/navegar?idNorma=61438)"
            ]
          }
        ]
      }
    ]
  },
  "privacy": {
    "title": "Política de privacidad y tratamiento de datos",
    "description": "Cómo Chile3X recopila, utiliza, protege, publica y elimina datos de visitantes, cuentas y anunciantes.",
    "summary": "Esta política informa los datos tratados por Chile3X, sus finalidades, la información que puede hacerse pública y los mecanismos para ejercer los derechos de sus titulares. Describe el funcionamiento actual del directorio y distingue los datos públicos de los archivos privados.",
    "notice": "**Canal de privacidad:** las solicitudes de acceso, rectificación, eliminación, bloqueo y consultas se reciben en [chile3x.site@gmail.com](mailto:chile3x.site@gmail.com). No deben enviarse contraseñas ni documentos completos por correo; si se requieren antecedentes, el equipo deberá indicar un canal adecuado.",
    "sections": [
      {
        "id": "responsable",
        "title": "Responsable, contacto y alcance",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "**Chile3X**, nombre comercial del portal disponible en **chile3x.cl**, es responsable del tratamiento descrito en esta política. El canal oficial para consultas y ejercicio de derechos es [chile3x.site@gmail.com](mailto:chile3x.site@gmail.com)."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Esta política se aplica a visitantes, personas registradas, anunciantes, agencias, responsables de arriendos, personas que aparecen en publicaciones, quienes reportan contenido y quienes interactúan con las funciones del sitio. Los servicios externos enlazados, como WhatsApp, Telegram, Instagram, Arsmate u OnlyFans, tienen políticas propias."
          }
        ]
      },
      {
        "id": "principios",
        "title": "Principios que aplicamos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X procura tratar datos de forma lícita, leal y transparente; limitar su uso a finalidades informadas; solicitar solo lo necesario; mantenerlos razonablemente actualizados; protegerlos frente a accesos no autorizados y conservarlos únicamente mientras exista una finalidad legítima o una obligación aplicable."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "No vendemos bases de datos personales. Tampoco utilizamos documentos de identidad, antecedentes médicos, mensajes de reportes ni contenido privado para publicidad dirigida."
          }
        ]
      },
      {
        "id": "datos",
        "title": "Categorías de datos que tratamos",
        "blocks": [
          {
            "id": "block-2",
            "type": "subheading",
            "text": "Visitantes",
            "numbered": true
          },
          {
            "id": "block-4",
            "type": "list",
            "text": "",
            "items": [
              "dirección IP, fecha y hora, ruta solicitada, navegador, dispositivo, registros de error y señales técnicas de seguridad;",
              "confirmación de mayoría de edad, preferencias de privacidad y datos mínimos para mantener la sesión;",
              "datos generales de navegación y eventos únicamente con consentimiento de medición opcional."
            ],
            "ordered": false
          },
          {
            "id": "block-6",
            "type": "subheading",
            "text": "Cuentas",
            "numbered": true
          },
          {
            "id": "block-8",
            "type": "list",
            "text": "",
            "items": [
              "correo electrónico, nombre visible, nombre completo opcional, tipo y número de documento, país del documento extranjero cuando corresponda, fecha de nacimiento, ciudad y teléfono opcional;",
              "contraseña protegida mediante un resumen criptográfico; Chile3X no almacena contraseñas en texto legible;",
              "estado de verificación del correo, rol, estado de la cuenta, fechas de creación y actividad administrativa;",
              "historial de cambios en métodos de acceso y desvinculación de proveedores, sin contraseñas ni secretos legibles."
            ],
            "ordered": false
          },
          {
            "id": "block-10",
            "type": "subheading",
            "text": "Anuncios",
            "numbered": true
          },
          {
            "id": "block-12",
            "type": "list",
            "text": "",
            "items": [
              "tipo de perfil, nombre público, alias, URL personalizada, ciudad y región, descripción, características, servicios, idiomas, horarios, precios, agenda de viajes y disponibilidad;",
              "teléfono, WhatsApp y las redes o plataformas que el anunciante decida publicar;",
              "foto de perfil, galería, videos, historias, estados, archivos privados y contenido exclusivo;",
              "estado de publicación, revisión, verificación, moderación, pausa y relaciones autorizadas entre agencias y escorts."
            ],
            "ordered": false
          },
          {
            "id": "block-14",
            "type": "subheading",
            "text": "Interacciones y seguridad",
            "numbered": true
          },
          {
            "id": "block-16",
            "type": "list",
            "text": "",
            "items": [
              "favoritos, likes, bloqueos, reseñas, comentarios y su estado de moderación;",
              "reportes, motivo, texto y capturas de evidencia, además de las actuaciones administrativas asociadas;",
              "visualizaciones de anuncios y clics en botones de contacto, agrupados por fecha y tipo de acción, incluyendo el número agregado de pulsaciones. Solo con consentimiento de medición, un clic de WhatsApp puede asociarse a la cuenta iniciada y agregar país, región o ciudad aproximada entregada por Cloudflare, tipo de dispositivo y ruta de origen. Sin ese permiso se conserva únicamente un identificador opaco para el conteo diario y nunca se guarda la IP en ese registro;",
              "mensajes privados enviados dentro de Chile3X, anuncio de origen, participantes, fecha, estado de lectura, silencio y bloqueos necesarios para mantener el historial y prevenir abuso;",
              "última actividad reciente de cuentas con anuncios, utilizada únicamente para mostrar un indicador temporal “Online”; el público no recibe la fecha exacta;",
              "si se vincula Telegram: identificador numérico, usuario y nombre que Telegram comparte, estado de vinculación y membresía, invitaciones, medidas de moderación y registros técnicos necesarios para operar el bot;",
              "si se elige Apple una vez habilitado: identificador estable, correo verificado —incluido un posible correo privado de retransmisión—, nombre compartido la primera vez y autorización cifrada necesaria para revocar el acceso al eliminar la cuenta;",
              "actuaciones administrativas: identidad de quien intervino, fecha, operación, elemento afectado, resultado y cambios relevantes. Incluyen aprobación de archivos, modificaciones de anuncios, publicación de historias por administración y configuración. No se duplican archivos de identidad, contraseñas, secretos ni cuerpos de historias en esos registros;",
              "en el foro privado beta: identificador y nombre administrativo de autoría, sección, título, texto, fechas, estados de edición y moderación, versión de las normas aceptadas, declaración de derechos y consentimiento para adjuntos, temas seguidos, notificaciones internas propias y denuncias con su decisión. Esta información no se publica ni se ofrece a usuarios generales; no se deben cargar documentos privados."
            ],
            "ordered": false
          }
        ]
      },
      {
        "id": "sensibles",
        "title": "Datos sensibles, íntimos y de especial protección",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Por la naturaleza del directorio, una publicación puede revelar o permitir inferir información sobre vida sexual, identidad o expresión de género, preferencias, apariencia y salud. Además, un anunciante puede cargar voluntariamente antecedentes médicos o material íntimo. Chile3X trata estas categorías con acceso restringido y para las finalidades concretas descritas en esta política."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Publicar una etiqueta, descripción o imagen es una decisión de la persona titular del anuncio. Los documentos de identidad, fechas de nacimiento, antecedentes médicos, reportes y galerías exclusivas **no se hacen públicos por defecto**. La persona puede retirar contenido público o solicitar su revisión, sin afectar tratamientos anteriores realizados lícitamente."
          }
        ]
      },
      {
        "id": "origen",
        "title": "De dónde obtenemos los datos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Recibimos datos directamente de la persona que visita, se registra, publica, comenta o reporta; de una agencia cuando invita a vincular un perfil, sujeto a aceptación de la escort; del funcionamiento técnico del sitio; y de proveedores que confirman entregas de correo, seguridad o funcionamiento."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Si alguien entrega datos de otra persona, declara tener autorización suficiente y debe informarle este tratamiento. Chile3X puede solicitar prueba de esa autorización y eliminar el contenido si no se acredita."
          }
        ]
      },
      {
        "id": "finalidades",
        "title": "Para qué utilizamos la información",
        "blocks": [
          {
            "id": "block-2",
            "type": "list",
            "text": "",
            "items": [
              "crear, autenticar, recuperar, administrar, suspender o cerrar cuentas;",
              "comprobar mayoría de edad y, cuando corresponda, revisar identidad o antecedentes voluntarios;",
              "crear borradores, moderar cambios, publicar, ordenar, buscar, pausar y mostrar anuncios;",
              "gestionar historias, galerías, medios, relaciones agencia–escort y accesos exclusivos;",
              "habilitar favoritos, likes, reseñas, comentarios, mensajería privada, bloqueos, reportes y paneles de rendimiento;",
              "ordenar anuncios según la ciudad o comuna de cobertura seleccionada manualmente; la persona usuaria puede borrar esa preferencia y volver a Todo Chile. Esta función no solicita coordenadas GPS;",
              "vincular voluntariamente Telegram, administrar el acceso a Miembros, sincronizar Novedades, moderar la comunidad y avisar al equipo sobre medidas relevantes;",
              "enviar correos transaccionales como verificación, recuperación, aprobación, rechazo, suspensión y avisos importantes de la cuenta;",
              "prevenir fraude, spam, suplantación, explotación, contenido ilícito, ataques y uso indebido;",
              "resolver solicitudes, cumplir obligaciones legales, colaborar con autoridades competentes y ejercer o defender derechos;",
              "medir y mejorar el sitio con datos generales cuando exista consentimiento para Analytics."
            ],
            "ordered": false
          }
        ]
      },
      {
        "id": "bases",
        "title": "Fundamentos del tratamiento",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Según el dato y la finalidad, el tratamiento se apoya en el consentimiento de su titular; la ejecución de las funciones solicitadas al crear una cuenta o publicación; el cumplimiento de obligaciones legales; y la necesidad de proteger la seguridad, prevenir abuso y ejercer o defender derechos, dentro de los límites admitidos por la legislación aplicable."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "El consentimiento para medición es separado y opcional. La carga voluntaria de documentos médicos o material íntimo requiere una decisión afirmativa de quien lo aporta y puede retirarse para usos futuros. Cuando la ley exija una autorización específica adicional, Chile3X la solicitará antes del tratamiento correspondiente."
          }
        ]
      },
      {
        "id": "publicos",
        "title": "Perfiles públicos, buscadores y redes sociales",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Una publicación aprobada puede mostrar su nombre público, alias, ciudad, descripción, atributos, disponibilidad, precios, agenda, contactos, imágenes, videos, historias, distintivos, reseñas aprobadas y demás campos que el anunciante haya destinado al perfil público."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Las páginas públicas pueden ser encontradas por buscadores, guardadas en caché y generar vistas previas al compartir enlaces. Incluso después de despublicar o modificar una página, Google, redes sociales y otros terceros pueden tardar en actualizar o eliminar sus copias. Chile3X puede solicitar una actualización, pero no controla esos plazos."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "No publicamos el número de documento, fecha de nacimiento, nombre legal opcional, teléfono privado de la cuenta, carnet, antecedentes médicos ni evidencia de reportes, salvo que la propia persona incorpore voluntariamente un dato equivalente en un campo público."
          }
        ]
      },
      {
        "id": "documentos",
        "title": "Documentos de identidad y antecedentes médicos opcionales",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Una persona anunciante puede adjuntar voluntariamente imágenes o PDF de identidad y/o antecedentes médicos para revisión interna. Estos archivos se almacenan de forma privada, no tienen una URL pública de listado, no se indexan y solo pueden ser consultados por la persona dueña del anuncio y administradores autorizados que los necesiten para revisar."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Un archivo nuevo puede reemplazar al anterior y la persona puede eliminarlo desde las funciones disponibles o pedir su retiro. Chile3X no diagnostica, no certifica vigencia médica ni garantiza que un documento refleje el estado actual de una persona. El resultado de una revisión puede conservarse separadamente como registro de moderación."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "El acceso a documentos y las actuaciones de carga, reemplazo o eliminación se registran para trazabilidad. El historial no contiene una segunda copia del documento. Los permisos administrativos se asignan por función; disponer de acceso general al panel no autoriza por sí solo la consulta de todos los archivos privados."
          }
        ]
      },
      {
        "id": "exclusivo",
        "title": "Galería privada y autorizaciones de acceso",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "El material exclusivo permanece bloqueado para el público. La persona dueña del anuncio administra el acceso añadiendo el correo de una cuenta registrada. Para operar la función tratamos la relación entre anuncio, cuenta autorizada, archivos y fechas relevantes."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La persona anunciante es responsable de confirmar que quien autoriza es adulta y de retirar el acceso cuando corresponda. Aunque Chile3X aplica controles técnicos, ninguna medida puede impedir por completo capturas o copias realizadas por alguien que recibió acceso legítimo. No utilizamos esa galería para entrenar sistemas de inteligencia artificial ni para publicidad."
          }
        ]
      },
      {
        "id": "comunidad",
        "title": "Reseñas, Telegram, bloqueos, reportes y evidencias",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Las reseñas o comentarios aprobados por el anunciante pueden mostrar el nombre visible de su autor y su contenido. Antes de aprobarse solo pueden consultarlos su autor, el propietario del anuncio y administración. El autor puede retirar su reseña pendiente; el anunciante puede aprobarla, rechazarla o eliminarla, y administración puede consultarla o eliminarla. Favoritos, bloqueos y listas personales no se muestran públicamente. Los reportes y sus capturas son privados y accesibles para el equipo autorizado y para la cuenta que los envió dentro de su panel."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Podemos utilizar esos antecedentes para investigar, contactar a las partes cuando sea seguro y necesario, moderar, preservar evidencia, prevenir reiteración y responder a una autoridad. No revelaremos la identidad de quien reporta al perfil denunciado salvo consentimiento, obligación legal o necesidad fundada de defensa, aplicando minimización."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Vincular Telegram es opcional. El sitio conserva la relación entre la cuenta y el identificador que entrega Telegram para comprobar acceso, crear invitaciones individuales y aplicar o retirar medidas. Los mensajes procesados por el bot pueden conservarse temporalmente para evitar duplicados, detectar envíos masivos o spam y ejecutar las tareas pendientes; una evidencia breve y la medida aplicada pueden mantenerse mientras sea necesario para revisar el caso y prevenir reincidencia. Desvincular, deshabilitar o eliminar la cuenta retira el acceso a Miembros, pero Telegram puede conservar mensajes conforme a sus propias reglas."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "El chat interno requiere sesión. Cada participante puede silenciar o bloquear la conversación. Si una de las cuentas se deshabilita o elimina, la otra puede conservar el texto del historial, pero Chile3X sustituye la identidad visible de la persona retirada por “Usuario de Chile3X” y bloquea mensajes nuevos; las relaciones directas con la cuenta eliminada se desprenden de la conversación. Si ya no queda ningún participante con acceso, la conversación se elimina. Los indicadores de no leído y los avisos del navegador se usan solo para comunicar mensajes; Chile3X puede aplicar límites automáticos de frecuencia para reducir spam. No deben enviarse contraseñas, códigos, documentos ni datos bancarios."
          },
          {
            "id": "block-10",
            "type": "paragraph",
            "text": "La sustitución del nombre de una cuenta no anonimiza automáticamente el texto de sus mensajes. Las referencias identificables incorporadas en conversaciones se evalúan conforme a los derechos aplicables y a la finalidad de conservación del historial."
          },
          {
            "id": "block-12",
            "type": "paragraph",
            "text": "El centro de ayuda “Johnny Sins” funciona mediante búsqueda guiada en documentación revisada. Las consultas y valoraciones se mantienen únicamente en la memoria de la pestaña durante la visita; no se guardan como conversación en la base de datos ni se envían a un proveedor de IA generativa. Los enlaces de ayuda pueden referirse a anuncios pertenecientes a la cuenta, consultados con su sesión. Al abrir un WhatsApp de soporte, no se adjunta automáticamente la conversación. No deben ingresarse contraseñas, códigos, documentos ni datos privados de terceros."
          },
          {
            "id": "block-14",
            "type": "paragraph",
            "text": "El foro privado beta se utiliza para desarrollo y pruebas administrativas. Sus contenidos y archivos solo pueden ser consultados por administración habilitada para el foro. Los adjuntos requieren declaración de autorización y consentimiento, están sujetos a cuotas y quedan pendientes de revisión; esto no equivale a una certificación de identidad o legalidad. Las notificaciones se limitan a temas seguidos y a su destinatario; no se envían correos automáticos. Archivar una sección o enviar un tema a papelera no equivale a borrar inmediatamente sus datos. Las denuncias permiten solicitar revisión y rectificación; sus decisiones quedan registradas, sin duplicar los textos de las respuestas en la auditoría. Los contadores de frecuencia ayudan a limitar cargas y publicaciones abusivas."
          }
        ]
      },
      {
        "id": "medicion",
        "title": "Cookies, almacenamiento local y medición opcional",
        "blocks": [
          {
            "id": "block-2",
            "type": "subheading",
            "text": "Funciones necesarias",
            "numbered": true
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Utilizamos cookies o almacenamiento equivalente para mantener la sesión, recordar la confirmación de mayoría de edad, conservar preferencias de privacidad, proteger formularios, limitar abuso, recordar historias vistas y operar funciones solicitadas. Estas tecnologías son necesarias para que ciertas partes del sitio funcionen y no se utilizan para publicidad conductual."
          },
          {
            "id": "block-6",
            "type": "subheading",
            "text": "Inicio de sesión con Google",
            "numbered": true
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "Si se elige continuar con Google, recibimos el identificador estable de la cuenta de Google, el correo verificado y el nombre que Google comparte. Usamos el identificador y el correo para comprobar la identidad, vincular o crear la cuenta y evitar accesos duplicados; el nombre solo completa inicialmente campos editables durante el registro."
          },
          {
            "id": "block-10",
            "type": "paragraph",
            "text": "No solicitamos acceso a Gmail, Drive, contactos, archivos ni calendario, y no almacenamos tokens de acceso de Google. El correo queda vinculado y no puede modificarse desde la cuenta. Si abandonas el registro, los datos del intento se eliminan automáticamente al vencer el plazo breve de seguridad."
          },
          {
            "id": "block-12",
            "type": "paragraph",
            "text": "La persona titular puede desvincular un proveedor desde Mis datos después de configurar y confirmar una contraseña. Esto no elimina la cuenta ni revierte la verificación de su correo. Conservamos un historial de cambios de acceso, consultable por la persona titular y administración autorizada, para proteger la cuenta."
          },
          {
            "id": "block-14",
            "type": "subheading",
            "text": "Inicio de sesión con Apple preparado, aún inactivo",
            "numbered": true
          },
          {
            "id": "block-16",
            "type": "paragraph",
            "text": "Chile3X muestra un botón de Apple deshabilitado mientras el proveedor no se encuentre habilitado con una configuración completa. En ese estado no se abre Apple ni se le envían datos. Si se habilita en el futuro y la persona elige utilizarlo, recibiremos el identificador estable, correo verificado y, únicamente en la primera autorización, el nombre que Apple comparta. Esos nombres solo completarán campos editables del registro; el correo quedará bloqueado."
          },
          {
            "id": "block-18",
            "type": "paragraph",
            "text": "El flujo rechazará identidades incompatibles, incluido un correo vinculado a otro proveedor o a una identidad administrativa. La autorización de larga duración que Apple entregue se almacenará cifrada y se utilizará para revocarla cuando corresponda, incluida la eliminación permanente de la cuenta. Chile3X no recibirá la contraseña de Apple ni acceso a iCloud, fotos, contactos o archivos."
          },
          {
            "id": "block-20",
            "type": "subheading",
            "text": "Google Tag Manager y Google Analytics",
            "numbered": true
          },
          {
            "id": "block-22",
            "type": "paragraph",
            "text": "Los WhatsApp del equipo usan contadores internos agregados por día, área y acceso: aperturas del panel y clics para abrir WhatsApp. No guardan IP, cuenta, número del visitante ni el contenido de mensajes, y no acreditan que se haya enviado un mensaje. Son independientes de los contactos de anunciantes."
          },
          {
            "id": "block-24",
            "type": "paragraph",
            "text": "El contacto del anunciante destacado dentro del panel de WhatsApp utiliza el registro de contactos del anuncio, no el contador del equipo. El contador de pulsaciones de WhatsApp del anuncio es visible únicamente para administración autorizada. El equipo no recibe el contenido de las conversaciones mantenidas en WhatsApp."
          },
          {
            "id": "block-26",
            "type": "paragraph",
            "text": "La medición es opcional y solo se carga cuando la persona selecciona **“Aceptar medición”** en el aviso de privacidad. Con esa autorización se miden visitas y acciones generales como registros, envíos de anuncios, clics de contacto, favoritos, likes y reseñas para entender el uso y mejorar Chile3X."
          },
          {
            "id": "block-28",
            "type": "paragraph",
            "text": "No configuramos el envío a Google de nombres, correos, teléfonos, RUT, direcciones, archivos privados, texto libre ni identificadores internos de perfiles como parámetros de Analytics. Google puede tratar información técnica como dirección IP, navegador, dispositivo y señales de interacción conforme a sus propias condiciones y medidas disponibles."
          },
          {
            "id": "block-30",
            "type": "paragraph",
            "text": "Al seleccionar **“Solo necesarias”**, el sitio seguirá funcionando sin cargar Google Tag Manager ni Google Analytics. La elección puede retirarse o modificarse en cualquier momento; el cambio no invalida el tratamiento anterior basado en consentimiento."
          },
          {
            "id": "block-32",
            "type": "paragraph",
            "text": "[Cambiar mi elección de medición →](/privacidad?medicion=editar#medicion)"
          },
          {
            "id": "block-34",
            "type": "subheading",
            "text": "Inicio de sesión con X preparado, aún inactivo",
            "numbered": true
          },
          {
            "id": "block-36",
            "type": "paragraph",
            "text": "Mientras el acceso con X esté deshabilitado no se abre ese proveedor ni se le envían datos. Si se habilita y la persona elige utilizarlo, recibiremos su identificador estable, nombre, nombre de usuario y el correo confirmado que X autorice compartir. Si no entrega un correo confirmado, la persona deberá completar y verificar uno mediante el proceso del sitio. El nombre solo completa campos editables del registro."
          },
          {
            "id": "block-38",
            "type": "paragraph",
            "text": "No solicitamos permiso para publicar, enviar mensajes privados ni acceder a mensajes. El token se utiliza únicamente para obtener la identidad y se solicita su revocación al terminar; no se almacena como credencial permanente. X podrá desvincularse con los mismos controles de contraseña e historial que los demás proveedores."
          },
          {
            "id": "block-40",
            "type": "subheading",
            "text": "Mapas referenciales de Google Maps",
            "numbered": true
          },
          {
            "id": "block-42",
            "type": "paragraph",
            "text": "Los anuncios incluyen un mapa referencial de su ciudad, que se carga de forma diferida. Solo enviamos el nombre de la ciudad, región y país: no enviamos el nombre del anunciante, su cuenta, dirección, notas de ubicación ni coordenadas privadas. Al cargarse el mapa o abrir Maps, Google puede recibir información técnica del navegador y aplicar sus propias condiciones y política de privacidad. No solicitamos la ubicación de la persona visitante para mostrar estos mapas."
          }
        ]
      },
      {
        "id": "proveedores",
        "title": "Proveedores tecnológicos y transferencias internacionales",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Para operar Chile3X utilizamos proveedores que tratan datos por cuenta del portal o prestan infraestructura bajo sus propios términos:"
          },
          {
            "id": "block-4",
            "type": "list",
            "text": "",
            "items": [
              "**Cloudflare:** alojamiento del sitio, base de datos, almacenamiento de archivos, red de entrega, certificados, seguridad y Turnstile para combatir bots;",
              "**Google:** autenticación cuando se elige “Continuar con Google”, correo transaccional, mapas referenciales de ciudades y, solo con consentimiento, Google Tag Manager y Google Analytics;",
              "**Telegram:** comunidad pública, vinculación voluntaria de cuentas, invitaciones a Miembros, Novedades y moderación mediante el bot;",
              "**Apple:** solo si el proveedor llega a habilitarse y la persona lo elige, autenticación y revocación de la autorización asociada;",
              "**X:** solo si el acceso llega a habilitarse y la persona lo elige, autenticación e identidad autorizada para crear o vincular su cuenta;",
              "**proveedores de navegador, sistema operativo o redes externas:** únicamente cuando la persona utiliza esas aplicaciones o sigue un enlace."
            ],
            "ordered": false
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Estos servicios pueden procesar o respaldar información fuera de Chile. Chile3X procura escoger proveedores reconocidos, limitar los datos enviados, configurar accesos y aplicar salvaguardas contractuales y técnicas razonables. La ubicación de la infraestructura puede cambiar sin que ello signifique una venta de datos."
          }
        ]
      },
      {
        "id": "autoridades",
        "title": "Cuándo podemos comunicar datos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Podemos comunicar la información mínima necesaria a proveedores que operan el servicio; a asesores sujetos a deberes de confidencialidad; a autoridades judiciales, policiales, administrativas o al Ministerio Público ante una orden o requerimiento válido; o cuando sea necesario para denunciar o prevenir una amenaza seria, explotación, trata, abuso de menores, difusión íntima no consentida, fraude o ataque."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "No entregamos bases de datos a anunciantes ni permitimos que una agencia acceda a los documentos privados de una escort por el solo hecho de estar vinculadas. Una reorganización futura del negocio deberá proteger los datos, informar el cambio de responsable cuando corresponda y respetar los derechos de sus titulares."
          }
        ]
      },
      {
        "id": "conservacion",
        "title": "Conservación, publicación temporal y eliminación",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X establece los siguientes plazos operativos propios, atendiendo a la finalidad y sensibilidad de cada dato. No se presentan como plazos generales exigidos por una ley ni impiden atender antes una solicitud de eliminación procedente."
          },
          {
            "id": "block-4",
            "type": "list",
            "text": "",
            "items": [
              "**Cuenta, anuncios y medios ordinarios:** mientras la persona mantenga su cuenta y publicaciones, incluidas las pausadas o recuperables. Deshabilitar no equivale a eliminar. La eliminación definitiva retira los datos operativos y el acceso al contenido; los archivos asociados se borran al completar el proceso o mediante reintentos restringidos. No se conservan originales adicionales por aplicar marca de agua.",
              "**Historias de fotografías, videos y texto:** 24 horas desde su publicación. La limpieza de registros y archivos se ejecuta normalmente en el siguiente ciclo de cinco minutos. Ante una falla se reintenta sin prolongar su acceso público.",
              "**Archivos de identidad:** hasta 90 días desde su última carga o reemplazo. **Exámenes y certificados médicos:** hasta 30 días desde su última carga o reemplazo. Después se restringe su consulta y se elimina el archivo; el resultado y fecha de la revisión pueden mantenerse mientras exista el anuncio, sin conservar el documento original ni constituir una garantía de salud.",
              "**Reportes y pruebas adjuntas:** durante la tramitación y hasta 180 días después de su resolución o desestimación. Los casos pendientes no se eliminan por el mero transcurso de ese plazo.",
              "**Conversaciones internas:** hasta 365 días después del último mensaje, salvo una conservación excepcional fundada. La eliminación de una cuenta puede dejar a la otra persona participante su conversación con la identidad desvinculada; no autoriza conservar indefinidamente ese historial.",
              "**Foro beta privado:** los temas y textos se mantienen mientras se utilicen para el desarrollo o la moderación de la beta, sujetos a solicitudes de eliminación procedentes. Los adjuntos retirados, rechazados o asociados a mensajes o temas en papelera se eliminan al cumplir 30 días en ese estado. Las notificaciones internas se conservan hasta 90 días; las denuncias cerradas, hasta 180 días desde la decisión. Los contadores de frecuencia se depuran tras un día sin actividad. La constancia de aceptación de normas y los seguimientos se mantienen mientras la cuenta participe o siga el tema; dejar de seguirlo elimina ese seguimiento.",
              "**Auditoría administrativa:** hasta 365 días desde cada actuación. **Diagnósticos operativos propios:** hasta 30 días. Los registros de sesiones vencidas se depuran hasta 30 días después de su vencimiento; los enlaces de acceso o recuperación no amplían su vigencia al permanecer transitoriamente registrados.",
              "**Historial de correos transaccionales:** hasta 90 días desde cada intento. Registra destinatario, cuenta asociada cuando exista, asunto, tipo, fecha, servicio utilizado y resultado técnico. Su consulta se restringe a administradores autorizados para gestionar cuentas, auditoría y datos privados. No conserva el cuerpo del mensaje, contraseñas ni enlaces o tokens de recuperación. La aceptación por el servicio de envío no acredita recepción, lectura ni entrega en la bandeja principal. La eliminación definitiva de una cuenta retira los registros asociados y los del correo registrado.",
              "**Constancia mínima de eliminación de cuenta:** hasta 180 días. Contiene una huella del correo y los datos mínimos de la eliminación, no el perfil, documentos ni medios; una huella se trata como dato seudonimizado, no como anonimato absoluto.",
              "**Respaldos automáticos de la base de datos:** la ventana técnica de recuperación de Cloudflare D1 es de 7 a 30 días según el plan del proveedor. Una eliminación no borra simultáneamente cada estado de recuperación. Esos respaldos no se utilizan para volver a publicar contenido eliminado; al restaurar se deben reaplicar eliminaciones y vencimientos."
            ],
            "ordered": false
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "La política se aplica desde el 14 de octubre de 2026. La depuración ordinaria de los plazos no temporales comienza el 13 de noviembre de 2026, con una transición de 30 días para los datos existentes. Esto no cambia el vencimiento de historias ni posterga las solicitudes de eliminación definitiva realizadas mediante las funciones del sitio."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "Una orden válida, una investigación documentada o la necesidad concreta de ejercer o defender derechos puede justificar conservar únicamente los antecedentes indispensables por un período mayor. La conservación excepcional se registra, se restringe al caso y debe revisarse al cesar su fundamento. Los errores de almacenamiento pueden requerir reintentos: el contenido afectado no vuelve a quedar accesible por ese motivo."
          }
        ]
      },
      {
        "id": "derechos",
        "title": "Derechos de la persona titular",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "De acuerdo con la Ley N.º 19.628 vigente, la persona titular puede solicitar información y acceso a sus datos, su rectificación cuando sean inexactos o estén desactualizados, su eliminación o cancelación cuando proceda y el bloqueo de determinados tratamientos en los casos legales."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La Ley N.º 21.719 prevé su entrada en vigor el **1 de diciembre de 2026**, conforme al texto legal publicado consultado para esta versión. Refuerza el marco chileno e incorpora derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo temporal, junto con reglas sobre decisiones automatizadas. Su aplicación se realizará conforme a la vigencia y exigencias legales efectivas; una propuesta de modificación de plazos no altera por sí sola la ley publicada."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Estos derechos no son absolutos: una solicitud puede limitarse cuando sea necesario conservar antecedentes para obligaciones legales, seguridad, derechos de terceros, libertad de expresión, investigación de ilícitos o defensa de reclamaciones, explicando el fundamento aplicable."
          }
        ]
      },
      {
        "id": "ejercicio",
        "title": "Ejercicio de los derechos",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "La persona titular puede editar parte de su información desde [Mi cuenta](/mi-cuenta) o presentar una solicitud en [chile3x.site@gmail.com](mailto:chile3x.site@gmail.com) indicando:"
          },
          {
            "id": "block-4",
            "type": "list",
            "text": "",
            "items": [
              "el derecho o solicitud que desea ejercer;",
              "el correo asociado a su cuenta y los datos necesarios para ubicar el anuncio;",
              "una explicación clara y, si corresponde, el dato correcto o el contenido cuya eliminación solicitas."
            ],
            "ordered": false
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Podemos verificar la identidad mediante el método menos invasivo razonablemente disponible antes de entregar o modificar información. No debe enviarse una contraseña. Las solicitudes se responderán dentro de los plazos de la ley vigente y serán gratuitas en los casos legalmente previstos."
          },
          {
            "id": "block-8",
            "type": "paragraph",
            "text": "También puede retirarse el consentimiento de medición desde esta página, revocarse el acceso a la galería exclusiva, ocultarse un anuncio, eliminarse historias o solicitarse el cierre de la cuenta mediante las opciones disponibles. Si la respuesta resulta insatisfactoria, la persona titular puede acudir a tribunales o a la autoridad competente, incluida la Agencia de Protección de Datos Personales una vez que ejerza sus atribuciones."
          }
        ]
      },
      {
        "id": "seguridad",
        "title": "Medidas de seguridad y respuesta a incidentes",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Aplicamos controles de acceso por rol y titularidad, almacenamiento privado para archivos sensibles, conexiones cifradas HTTPS, contraseñas resumidas criptográficamente, validación de formularios, protección anti-bot, registros de seguridad, copias de respaldo y revisión administrativa."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Ningún sistema conectado a Internet es infalible. Si detectamos un incidente que afecte datos personales, investigaremos, limitaremos el daño, preservaremos evidencia y notificaremos a personas o autoridades cuando la ley lo exija o sea razonablemente necesario para reducir riesgos. Puedes informar una vulnerabilidad sin explotar ni divulgar datos ajenos escribiendo al canal oficial."
          }
        ]
      },
      {
        "id": "menores",
        "title": "Protección de niñas, niños y adolescentes",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Chile3X no está dirigido a menores de 18 años y no acepta su registro, publicación ni aparición en material. Si tomamos conocimiento o tenemos una sospecha razonable, bloquearemos el contenido o cuenta, podremos preservar la evidencia estrictamente necesaria y actuaremos conforme a la legislación y los requerimientos de las autoridades."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "La posible presencia de una persona menor de edad debe informarse mediante el botón de reporte, cuando se disponga de una cuenta, o inmediatamente a [chile3x.site@gmail.com](mailto:chile3x.site@gmail.com). No debe descargarse, reenviarse ni difundirse el material."
          }
        ]
      },
      {
        "id": "automatizacion",
        "title": "Moderación y decisiones automatizadas",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Podemos utilizar validaciones automáticas para detectar formatos inválidos, spam, límites de carga, riesgo técnico o señales de abuso. Las decisiones relevantes de publicación, verificación y sanción contemplan revisión administrativa y no se basan exclusivamente en perfilamiento automatizado con efectos jurídicos equivalentes."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Si una validación automática produce un error, puede solicitarse intervención humana y revisión mediante el canal de soporte."
          },
          {
            "id": "block-6",
            "type": "paragraph",
            "text": "Las respuestas del bot de ayuda son orientativas y pueden contener errores. La búsqueda guiada no decide aprobaciones, sanciones, verificaciones ni accesos, y puede ser desactivada por administración. La persona interesada puede solicitar asistencia humana por los canales oficiales."
          }
        ]
      },
      {
        "id": "cambios",
        "title": "Vigencia, cambios y legislación aplicable",
        "blocks": [
          {
            "id": "block-2",
            "type": "paragraph",
            "text": "Esta política se rige por la legislación chilena, especialmente la Ley N.º 19.628 y, desde el 1 de diciembre de 2026, sus modificaciones introducidas por la Ley N.º 21.719. También pueden resultar aplicables la Ley N.º 19.496, la Ley N.º 19.799, el Código Penal y otras normas sectoriales."
          },
          {
            "id": "block-4",
            "type": "paragraph",
            "text": "Podemos actualizar la política por cambios legales, técnicos o funcionales. Mostraremos la versión y fecha vigentes; si el cambio altera materialmente una finalidad o requiere consentimiento, lo informaremos y solicitaremos la autorización correspondiente antes de aplicarlo."
          },
          {
            "id": "block-6",
            "type": "sources",
            "text": "Fuentes legales y políticas relacionadas",
            "items": [
              "[Ley N.º 19.628 sobre protección de la vida privada](https://www.bcn.cl/leychile/navegar?idNorma=141599)",
              "[Ley N.º 21.719 sobre protección de datos personales](https://www.bcn.cl/leychile/navegar?idNorma=1209272)",
              "[Ley N.º 19.496 sobre protección de los derechos de los consumidores](https://www.bcn.cl/leychile/navegar?idNorma=61438)",
              "[Términos y condiciones de Chile3X](/terminos)",
              "[Reglas de publicación](/reglas-de-publicacion)"
            ]
          }
        ]
      }
    ]
  }
} satisfies Record<'terms'|'privacy', LegalDocument>;
