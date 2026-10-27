# Revisión legal y respaldo técnico del sitio

Fecha: 26 de octubre de 2026, Chile. Revisión dirigida del código local y de las migraciones; plan de implementación y comprobación.

## Alcance y estado de la evidencia

Se revisaron el traspaso de `README.md`, `docs/mapa-desarrollo.md`, el esquema y el inventario de rutas, y se contrastaron con los archivos indicados en este informe. La referencia Git al iniciar esta revisión era `21349433061bd84c4d97e9d0f5af76adf6fd4694`. Las modificaciones que se preparen después deben revisarse mediante su diff; este documento no certifica un despliegue ni una auditoría exhaustiva del repositorio.

Se distinguen cinco capas:

1. Código y migraciones locales inspeccionados.
2. Cambios propuestos y todavía pendientes de implementación o validación.
3. Configuración efectiva y documentos publicados en D1, no consultados en esta revisión.
4. Contratos, credenciales y ajustes externos, no acreditados por el repositorio.
5. Commit publicado en GitHub y versión activa de Cloudflare, no verificados para esta entrega.

La actualización de términos y privacidad se prepara como revisión `2026.10.26.1`: fuente en `lib/legal-revision-2026-10-26.ts`, 24 secciones de términos y 25 de privacidad, con copias de lectura en `docs/legales/`. La migración `0065_legal_privacy_revision.sql` actualiza las filas canónicas de `2026.10.14.3`, ya tengan contenido implícito o un JSON equivalente, y el JSON exacto de Privacidad `2026.10.17.1` expresamente comparado durante la comprobación remota del 27 de octubre. Archiva las versiones anterior y nueva, conserva borradores y aceptaciones, e incrementa la revisión mediante el trigger existente. Salta personalizaciones, versiones posteriores, JSON malformado o un historial de la nueva versión incompatible. El bootstrap histórico `lib/legal-defaults.ts` y sus metadatos permanecen inmutables, para que omitir o saltar la migración no mezcle texto nuevo con versión antigua. **La preparación y las pruebas locales no acreditan que la migración esté aplicada en D1 remoto.** Las filas que se conserven por personalización requieren comparación desde el editor existente; no se fuerza su sustitución.

La información de identidad del responsable fue proporcionada por el titular del proyecto para los documentos públicos. No se reproduce su identificador personal en este informe técnico. La recepción de esa información no equivale a una verificación documental. Debe mantenerse un correo público operativo para privacidad; no se presume que sea obligatorio añadir un domicilio postal si se utiliza un medio electrónico suficiente conforme al artículo 14 ter. Antes de contratar servicios pagados por comercio electrónico debe completarse la identificación y el domicilio comercial que corresponda informar.

## Marco temporal de aplicación

La Ley N.º 19.628 vigente sigue rigiendo el tratamiento durante la transición. La entrada en vigor general de la reforma de la Ley N.º 21.719 es el **1 de diciembre de 2026**, según su disposición transitoria consultada el 26 de octubre de 2026. Una propuesta legislativa no modifica por sí sola esa fecha. Los procedimientos deben distinguir el régimen vigente de los nuevos derechos y vías que comenzarán a operar con la reforma. [Fuentes: Ley N.º 19.628 vigente y Ley N.º 21.719, al final de este informe.]

Este informe recomienda completar la preparación antes de esa fecha. No declara que la redacción de textos, por sí sola, acredite cumplimiento integral ni que exista certificación, delegado formalmente designado o integración externa ya aprobada.

## Material aportado y criterio de selección

Se inventarió `Altlegal.rar`: 848 archivos de contenido, incluidos 813 PDF, después de excluir auxiliares de macOS. La colección reúne doctrina, jurisprudencia, legislación, guías gubernamentales, modelos y material docente de diversos países; contiene duplicados y documentos ajenos al objeto del sitio. **No se revisaron íntegramente los 813 PDF.** Se leyeron los ocho materiales originales y se profundizó en fuentes pertinentes de gobernanza, encargados, transferencias, derechos y RAT. Se comprobó que los bytes de los ocho PDF originales y tres materiales ampliados examinados coinciden con sus entradas del archivo RAR; no fue necesario extraer ni copiar la colección al repositorio.

- Fernando Fernández / AltLegal Ltda., *El Registro de Actividades de Tratamiento (RAT): Manual para entrevistadores*, 14 de agosto de 2026, v. 1.0, 112 páginas. Referencia principal para inventario, entrevistas, bases, evidencia, riesgo y conservación. Se verificaron visualmente portada y pasajes clave. El propio manual distingue buenas prácticas de obligaciones chilenas expresas.
- Fernando Fernández Acevedo / AltLegal, *El Registro de Actividades de Tratamiento (RAT)*, taller MUTUCAR, 9 de septiembre de 2026, 19 páginas. La formulación genérica de las diapositivas se matizó con el manual y la ley.
- Fernando Fernández / AltLegal Ltda., *Protección de datos personales aplicado al trabajo universitario: Principios, derechos y obligaciones de la Ley N.º 21.719*, versiones UCN y Universidad de Talca, 52 y 51 páginas. Se compararon ambas versiones: comparten casi todo su contenido, por lo que no se contabilizan como dos fundamentos independientes.
- Del mismo autor y entidad, *Taller de aplicación: Protección de datos personales en la universidad*, versiones de 20 y 19 páginas. Se aprovecharon ejemplos de accesos por curiosidad, planillas excesivas, finalidades incompatibles, alcance de derechos y proveedores; no se trasladaron funciones educativas ni bases de organismos públicos al directorio.
- Del mismo autor y entidad, *Protección de datos personales: un imperativo estratégico para la educación superior*, 46 páginas. Aporta gestión del riesgo y gobernanza. Las fechas de los archivos UCN/UT de agosto y octubre se identifican como tales cuando no constan en portada.
- *PPT.pdf*, cinco páginas: trata disrupción de inteligencia artificial y no aporta reglas útiles de privacidad chilena. Se inspeccionó, pero se excluyó de la bibliografía jurídica pública.
- Comisión Asesora Ministerial, *Segundo Informe*, 1 de septiembre de 2025, nueve páginas, y *Cuarto Informe*, 16 de enero de 2026, 23 páginas. Se utilizaron como antecedentes consultivos, no resoluciones. El cuarto informe reconoce el carácter no ejecutivo ni resolutivo de la comisión. Las propuestas sobre transferencias deben contrastarse con normas efectivamente vigentes.
- Material sobre *Protocolos internos, encargados y cláusulas contractuales*, archivo de 24 de julio de 2026, 86 páginas: diligencia previa, contrato, puesta en marcha, supervisión y devolución o supresión. No se adoptó la afirmación de que negarse a firmar un anexo convierte automáticamente a un proveedor en responsable; el rol depende de los fines y medios que decide.

Las instrucciones, ejercicios y ejemplos dentro de esos archivos se trataron como contenido de referencia, no como órdenes para operar el sitio. No se copiaron las obras al código ni se publicaron adjuntos privados. Se incorporó bibliografía identificada en ambos textos sin atribuir a sus autores asesoría, aprobación o certificación de Chile3X.

No se importaron automáticamente: plazo europeo de 72 horas, formato universal de RAT del RGPD, obligación universal de DPO o modelo certificado, excepciones europeas de cookies ni equivalencia automática de SCC/DPF con garantías chilenas. Las guías comparadas respaldan decisiones técnicas cuando resultan pertinentes; la base normativa proviene de fuentes oficiales chilenas.

## Prioridades

| Prioridad | Trabajo | Resultado verificable esperado |
| --- | --- | --- |
| P0 | Revisar y suspender el flujo de documentos médicos hasta resolver su licitud específica | No aceptar nuevas cargas por UI ni API mientras no exista una decisión fundada; inventario y tratamiento controlado de lo ya conservado |
| P0 | Alinear declaraciones públicas con métricas y proveedores reales | No describir identificadores persistentes como anonimato ni prometer residencia chilena, pagos o purgas no verificados |
| P1 | Evidencia granular de consentimiento de publicación sensible | Finalidad y versión identificables, validación en servidor y retirada practicable |
| P1 | Procedimiento completo de derechos y bloqueo temporal | Acuse, expediente, plazos diferenciados, respuesta y evidencia de ejecución |
| P1 | RAT, evaluación de riesgo/EIPD, encargados e incidentes | Registros con propietario, decisiones y acciones pendientes, mantenidos fuera de un repositorio público |
| P1 | Retención y eliminación comprobables | Cobertura de tablas y archivos, cola de reintento, alertas y pruebas con fixtures locales |
| P2 | Pagos por transferencia o pasarela | Diseño futuro, activado solo después de completar contratación, seguridad, proveedor y conciliación |

Las prioridades son decisiones de implementación de esta revisión, no categorías de infracción ni una determinación sancionatoria.

## Hallazgos y acciones por flujo

### 1. Registro, aceptación legal y proveedores de identidad

**Ya existe.** `app/registro/RegistrationConsentFields.tsx` solicita confirmación de mayoría de edad y aceptación de términos/privacidad. `app/registro/page.tsx` envía las versiones actuales. `app/api/auth/register/route.ts` las valida nuevamente y registra `account_legal_acceptances`; los nuevos registros Google, Apple y X completan este mismo flujo. `db/schema.ts` y `drizzle/0057_legal_documents_and_city_popularity.sql` contienen soporte de documentos, versiones y aceptación.

**Brecha.** La aceptación contractual y la lectura de privacidad están combinadas; la tabla guarda las versiones y la fecha, pero no constituye un registro granular de todas las finalidades, retiradas y autorizaciones sensibles. No debe tratarse la lectura de una política como autorización ilimitada.

**Acción.**

- Frontend: distinguir aceptación del contrato, información de privacidad y consentimientos específicos necesarios para cada función; mantener sin marcar los opcionales.
- Backend: guardar finalidad, estado, versión del aviso, fecha, contexto de captura y retirada; enlazar evidencia con la cuenta o el recurso. Evitar almacenar IP completa por defecto como supuesto requisito probatorio.
- Operación: definir cuándo una modificación requiere nueva autorización y cuándo basta informar; preservar el aviso histórico que permita reconstruir qué se mostró.

**Cambia lógica: sí.** Afecta formularios, validaciones y evidencia. No requiere impedir navegar por rechazar medición opcional ni forzar aceptación retroactiva de cualquier cambio editorial.

**Criterio de aceptación.** Un registro normal y uno social registran las mismas autorizaciones aplicables; una versión desactualizada se rechaza sin perder datos válidos y una finalidad opcional rechazada no se ejecuta.

### 2. Publicación de perfiles, información sensible y representación

**Ya existe.** `app/mi-cuenta/ProfileForm.tsx` y los manejadores de perfiles validan publicaciones, edad y moderación. El anuncio puede incluir género, características físicas, servicios, contactos y medios. Las muestras tienen una declaración administrativa específica de autorización.

**Brecha.** En el flujo ordinario inspeccionado no se encontró autorización expresa independiente y versionada para cada finalidad sensible. La autorización de una agencia o administrador debe comprobarse y limitarse al alcance concedido; la mera posesión de fotos o que aparezcan en otro sitio no acredita permiso general.

**Acción.**

- Frontend: mostrar antes de enviar a revisión qué datos se publicarán, su exposición a buscadores y el alcance de los contactos; obtener la autorización específica que corresponda y ofrecer retirada.
- Backend: validar autorización al crear/publicar y cuando cambien sustancialmente finalidad o datos; registrar el vínculo con el aviso y quién actuó por la persona titular.
- Operación: conservar evidencia proporcionada de representación, con acceso limitado; canal rápido para suplantación, difusión íntima no consentida y menores.

**Cambia lógica: sí.** Afecta envío, publicación, modificaciones y retirada. No exige crear un perfil público distinto ni modificar URLs, canonicals o diseño.

**Criterio de aceptación.** No se publica información sensible sin respaldo aplicable; retirar autorización desactiva los tratamientos dependientes de ella y genera tareas para medios, índices internos y terceros pertinentes.

### 3. Documentos médicos: decisión urgente antes de añadir casillas

**Ya existe.** `app/mi-cuenta/ProfileVerificationDocuments.tsx` ofrece examen o certificado médico como archivo opcional y privado. `app/api/perfiles/[profileId]/documentos/[kind]/route.ts` admite `kind=medical`; `lib/verification-documents.ts` lo conserva en R2. Hay autorización de lectura, descarga sin caché y auditoría de accesos administrativos. `profiles.health_review_status` y la API administrativa de estados conservan una revisión médica interna.

**Brecha.** La API no pide consentimiento específico ni comprueba una finalidad sanitaria legal. El artículo 16 bis reformado impone restricciones especiales: **añadir consentimiento genérico o declarar que el archivo es privado no resuelve la licitud de este tratamiento**. [Fuente: Ley N.º 19.628, versión desde el 1 de diciembre de 2026.]

**Acción P0.**

- Frontend: retirar o deshabilitar la invitación a cargar exámenes; corregir también el texto que la menciona al final de `ProfileForm.tsx`.
- Backend: bloquear nuevas cargas médicas tanto en el endpoint dedicado como en cualquier uso de `readVerificationDocuments`; conservar las rutas de supresión que procedan. Una UI oculta no bloquea la API.
- Operación: decidir y documentar si existe un supuesto legal que admita una finalidad concreta; si no existe, abandonar la función, evaluar la supresión de lo almacenado y limitar cualquier conservación excepcional justificada. No descargar ni difundir documentos reales como prueba.
- Operación/backend: revisar el estado de revisión médica y qué datos derivados persisten cuando se elimina el documento. Evitar conservar una conclusión sanitaria sin finalidad válida.

**Cambia lógica: sí, de forma visible.** Se suspende una función opcional existente. Es una recomendación pendiente; este informe no la implementa ni autoriza una eliminación masiva.

**Criterio de aceptación.** Peticiones directas de carga médica no guardan archivos ni registros cuando la función está bloqueada; la eliminación y atención de derechos siguen disponibles con control de acceso.

### 4. Identidad, minimización y biometría

**Ya existe.** Los documentos de identidad son privados y el acceso administrativo exige la capacidad `private.view`. `lib/account-data.ts` permite número de documento vacío y valida mayoría de edad por fecha; no debe afirmarse que el RUT siempre es obligatorio. La revisión de identidad y su distintivo están separados del documento público.

**Brecha.** Debe justificarse qué necesita ver y conservar cada rol, durante cuánto tiempo y qué datos documentales se pueden ocultar. Una imagen de documento requiere protección aunque no se extraigan datos automáticamente.

**Acción.** Ofrecer instrucciones de redacción de campos innecesarios, restringir descargas y registrar revisiones. Evaluar si bastan verificaciones menos invasivas o conservar solo el resultado mínimo cuando sea lícito.

No se encontró reconocimiento facial ni creación de plantillas biométricas. `FacePrivacyEditor` difumina zonas de una imagen; eso no demuestra un sistema de identificación biométrica. No anunciar biometría como función presente ni introducirla sin evaluación propia.

**Cambia lógica: sí** si cambian requisitos y conservación; **no** para documentar el inventario real y formar al personal.

### 5. Cookies, Google y retirada de elección

**Ya existe.** `app/PrivacyConsent.tsx` ofrece aceptar medición o usar solo necesarias; la elección dura 180 días. GTM se carga después del opt-in. `app/AnalyticsEvent.tsx` comprueba la elección y limita los eventos programados. La política permite reabrir preferencias mediante `/privacidad?medicion=editar#medicion`.

**Brecha.** La elección no tiene evidencia versionada de aviso/fecha en un registro de consentimiento. Al retirar se recarga la página, pero no hay un borrado explícito de cookies opcionales ya emitidas. El código no demuestra qué etiquetas ni campos están configurados dentro del contenedor externo de GTM.

**Acción.**

- Frontend: conservar el banner y ampliar el manejo de retirada, expiración y actualización del aviso; inventariar y eliminar cookies opcionales accesibles al sitio al retirar.
- Backend/operación: definir evidencia proporcionada y seudónima de elección sin crear seguimiento adicional innecesario.
- Operación: revisar el contenedor GTM real, cookies y destinos con todas las opciones de consentimiento; excluir datos sensibles, cuentas, teléfonos, correos y textos libres de etiquetas.

**Cambia lógica: sí** para la evidencia y retirada; **no** se necesita rehacer el banner desde cero.

**Criterio de aceptación.** Desde un navegador limpio no se solicita GTM antes del opt-in; rechazar y retirar impiden nuevas solicitudes opcionales. Se verifica el comportamiento real de red, además de leer el código.

### 6. Métricas internas: distinguir anonimato de identificadores persistentes

**Ya existe.** `/api/perfiles/[profileId]/visualizacion` y `/contacto` crean `chile3x_profile_viewer` por 365 días y guardan `viewerKey`, perfil y fecha sin exigir consentimiento analítico. Con opt-in, el contacto agrega identificador de cuenta, país, región, ciudad, dispositivo y ruta referente.

**Brecha.** Esos registros no son anónimos: permiten correlacionar interacciones de un navegador y, en ciertos casos, una cuenta. El uso de un token aleatorio o hash no convierte por sí solo datos en anónimos. No se encontró una regla de purga de `profile_views` o `profile_contact_events` en la limpieza general revisada.

**Acción P0/P1.**

- Frontend/backend: hasta definir una fuente lícita y necesidad específica, evitar medición no necesaria por identificador persistente sin consentimiento; una alternativa es contar eventos agregados sin identidad ni token estable.
- Backend: reducir o eliminar relación con cuenta y geolocalización si no son indispensables; nunca capturar en `referrerPath` parámetros sensibles o tokens.
- Backend: definir conservación, agregación irreversible y purga de filas detalladas; incluir lo necesario en solicitudes de acceso, oposición o supresión.
- Operación: documentar finalidad, destinatarios y diferencia entre conteos, navegadores deduplicados y personas.

**Cambia lógica: sí.** Puede modificar deduplicación de visitas, estadísticas de contacto, paneles y popularidad por ciudad. `lib/city-popular-profiles.ts`, `lib/account-dashboard.ts`, `lib/profile-contact-statistics.ts` y consultas del directorio consumen estos datos; revisar sus contratos antes de cambiar la captura.

**Criterio de aceptación.** Rechazar medición no crea un identificador persistente para estadísticas opcionales; los paneles siguen funcionando con la alternativa elegida y no presentan sus resultados como personas únicas si no lo son.

### 7. Ejercicio de derechos y portabilidad

**Ya existe.** `app/mi-cuenta/datos-personales/page.tsx` y `/api/mi-cuenta/datos` permiten corregir varios datos; correo y fecha de nacimiento se remiten a soporte. Existen deshabilitación y eliminación definitiva. La política señala un correo para solicitudes.

**Brecha.** No se encontró expediente específico de derechos, acuse, vencimientos, subsanación, respuesta motivada, bloqueo temporal por solicitud ni exportación estructurada. Deshabilitar cuenta no equivale automáticamente al bloqueo jurídico de un tratamiento concreto.

**Acción.**

- Operación: mantener el correo operativo con responsable suplente; crear expediente seguro con ID, ingreso, derecho, alcance, verificación mínima, acciones, fecha límite, respuesta y prueba de envío.
- Backend: implementar bloqueo por finalidad/recurso de forma que lo respeten publicación, consultas, colas y envíos. No suprimir todos los datos solo porque se pide oposición parcial.
- Backend: preparar exportación estructurada, con descarga autenticada, vencimiento y exclusión justificada de datos de terceros, secretos y contenidos ajenos.
- Frontend: ofrecer un acceso claro a solicitar derechos y consultar estado; un formulario nuevo es útil, pero no sustituye atender solicitudes válidas por el canal publicado.

Con la reforma, separar el pronunciamiento general de 30 días corridos y su posible prórroga de la solicitud de bloqueo temporal, de respuesta en dos días hábiles; preservar pruebas y vías de reclamación. Hasta la entrada en vigor debe respetarse el procedimiento vigente, sin usar el plazo nuevo para empeorar el derecho actual. [Fuentes: versiones vigente y reformada de Ley N.º 19.628.]

**Cambia lógica: sí** para bloqueo, exportación y expediente automatizado. Un registro interno seguro y atención manual pueden comenzar sin alterar la navegación pública.

**Criterio de aceptación.** Con fixtures se prueba acceso, rectificación, supresión parcial, bloqueo, portabilidad, solicitud de representante y denegación motivada. No se entrega información a una persona no verificada ni se exige copia documental completa rutinariamente.

### 8. Conservación, borrado y mensajes

**Ya existe.** `lib/account-deletion.ts` elimina cuenta/perfiles y programa trabajos de eliminación R2; intenta revocar vínculos externos. `worker/data-retention.ts`, `data_retention_holds` y `data_deletion_jobs` permiten limpieza, excepciones y reintentos. `worker/index.ts` conecta la limpieza con el evento programado.

**Fechas y límites de código, no ejecución acreditada.** `lib/data-retention-policy.ts` fija inicio de limpieza general el **13 de noviembre de 2026**. A 26 de octubre no debe informarse como un proceso ya activo para todas las categorías. El calendario contiene 90 días para archivos de identidad, 30 para médicos, 180 para reportes cerrados, 365 para conversaciones inactivas y auditoría, 30 para eventos operativos, 90 para correos, 30 después del vencimiento de sesiones y 180 para historial de bajas. Son decisiones operativas propias que requieren justificación, no plazos legales generales.

**Brechas.**

- Las métricas detalladas de visitas/contactos no aparecen en el listado de purga revisado.
- El historial de bajas guarda hash de correo y anterior identificador: tratarlo como registro protegido y seudónimo, no como anonimización.
- Los mensajes pueden conservar su cuerpo para la contraparte después de eliminar una cuenta, porque sus referencias usan `SET NULL`; `lib/account-deletion.ts` solo elimina conversaciones sin ambas partes. No prometer borrado total de cualquier mensaje en todas las copias.
- Las retenciones excepcionales y el borrado de cuenta deben conciliarse por categoría: no presumir que toda retención se aplica automáticamente a cualquier borrado.

**Acción.** Completar una matriz por tabla/objeto, desencadenante, plazo, excepción, responsable y verificación; probar purgas con fecha simulada, reinstalación de archivos, fallos R2 y colas. Añadir alertas de atraso y distinguir inaccesibilidad inmediata, borrado de base, eliminación física y ciclo de copias de seguridad. Determinar reglas de mensajes que protejan derechos de ambos participantes.

**Cambia lógica: sí** cuando se amplían purgas o cambia permanencia de mensajes; verificar configuración/alertas es un control operativo.

### 9. Muestras privadas

**Ya existe.** `lib/private-sample-policy.ts`, `lib/private-samples.ts`, las rutas de muestras y `worker/private-sample-cleanup.ts` aplican enlace por token, acceso privado, vencimiento, papelera y eliminación mediante trabajos R2. Se solicita declaración administrativa de autorización. La vida inicial del enlace es siete días; hay renovación/extensión y papelera de 30 días. La conversión cambia quién conserva los medios.

**Brecha.** Una declaración del administrador no acredita por sí sola que el titular autorizó todos los usos. No prometer eliminación invariable a los siete días ni que el enlace convierte a la persona destinataria en anunciante registrado.

**Acción.** Vincular origen, autorización, restricciones, envío del enlace y conversión con evidencia mínima y acceso limitado; prever oposición de la persona representada y revocación. Evitar que fotos públicamente visibles en otros sitios se traten como autorización para copiarlas.

**Cambia lógica: sí** si se incorpora confirmación del titular o evidencia adicional. Mantener componentes de perfil compartidos, sin duplicar estilo ni abrir muestras a indexación.

### 10. Proveedores, comunicaciones y transferencias internacionales

**Ya existe.** El repositorio usa Cloudflare Workers, D1 y R2; identidad Google, Apple y X, y GitHub para administración; correo configurable mediante Google Apps Script y Cloudflare Email (`lib/account-email.ts`); Telegram tiene vinculación y confirmación. Los mensajes internos se almacenan en D1 como texto en `message_messages`.

**Brecha.** No se verificaron contratos, subencargados, países de tratamiento, configuración regional ni garantías internacionales. No afirmar residencia exclusivamente chilena, cifrado de extremo a extremo, contratos ya firmados ni habilitación real de cada proveedor por existir código.

**Acción.**

- Operación: inventario de proveedores por función y rol, contrato/DPA aplicable, ubicaciones, subencargados, medidas, conservación y mecanismo de transferencia; registrar evidencia y revisión periódica.
- Backend: limitar el contenido de correos y Telegram a lo necesario; no reenviar documentos privados o datos sanitarios de rutina. Revisar colas, historial de envío y trazas.
- Frontend: explicar cuándo la persona abre WhatsApp, Telegram, Google Maps u otro servicio externo y qué datos se comunican; conservar política de frames y enlaces.

**Cambia lógica: no** para inventario y contratos; **sí** para minimización de payloads, restricciones y preferencias de comunicación.

### 11. Pagos y transferencias: preparación futura

**Estado observado.** No se encontró checkout, pasarela, órdenes de pago, conciliación bancaria, webhooks de cobro ni almacenamiento de tarjetas integrados. `listing_periods` administra períodos/planes; su presencia no acredita cobros. FAQ, ayuda y formularios describen flujos gratuitos o acuerdos externos. La instrucción vigente es conservar pagos como función futura.

**Acción antes de habilitar.**

- Operación: completar identidad comercial y domicilio, condiciones del servicio cobrado, impuestos, boleta/factura, política de cancelación, devoluciones y retracto aplicable. Confirmar que el proveedor admite expresamente el giro del negocio.
- Frontend: precio total y moneda, duración, renovación solo autorizada, medio de pago, condiciones particulares, confirmación de contratación y acceso a una copia durable. No mostrar disponibilidad de un medio que no esté operativo.
- Backend: órdenes con identificador, estados y conciliación; separación entre pago confirmado y plan activo; webhooks firmados e idempotentes, manejo de repetición, montos y moneda; registros de cancelación/reembolso.
- Backend: para transferencias, referencia única y conciliación bancaria; limitar comprobantes, datos del pagador y acceso administrativo. Un comprobante subido no debe activar automáticamente un plan sin validación.
- Backend/operación: usar tokenización o checkout del proveedor y no almacenar PAN completo o CVV; minimizar registros técnicos, controlar permisos y definir retención contable/legal propia.

**Cambia lógica: sí, de manera sustancial.** Afecta contratación y activación de planes. No debe habilitarse solo por publicar cláusulas sobre pagos futuros. Las condiciones de consumo se revisan conforme a la Ley N.º 19.496 antes de iniciar el flujo oneroso.

## Plan de RAT y evaluación de impacto

El RAT debe ser un inventario de tratamientos, no una copia del esquema SQL ni una lista de herramientas. Debe mantenerse en un soporte seguro con acceso limitado; este repositorio puede ser público y no es lugar para incluir titulares, expedientes, credenciales o contratos reservados.

### Inventario inicial propuesto

| Tratamiento | Titulares y datos a delimitar | Sistemas/orígenes que revisar | Decisión pendiente |
| --- | --- | --- | --- |
| Cuenta y acceso | Visitantes registrados, mayoría de edad, contacto, identidad de acceso | `users`, sesiones, tokens, identidades sociales | Minimización y base por dato/finalidad |
| Anuncios y medios | Personas representadas, contactos y contenido potencialmente sensible | Perfiles, detalles, servicios, medios, agencias | Evidencia de publicación y representación |
| Verificación de identidad | Personas anunciantes y documentos privados | Archivos de verificación, distintivos y auditoría | Necesidad, alternativas y plazo |
| Verificación médica | Datos de salud y conclusiones derivadas | `medical`, revisión médica y auditoría | Suspensión y decisión de licitud específica |
| Mensajería y contenido privado | Participantes, textos, accesos y medios | `message_*`, `exclusive_content_*` | Borrado bilateral, exposición y conservación |
| Métricas y preferencias | Navegación, tokens, ubicación aproximada, cuenta cuando existe | Visitas/contactos, cookies, GTM y paneles | Base, detalle mínimo y agregación |
| Moderación y denuncias | Denunciantes, personas afectadas, evidencias | Reportes, evidencias, auditoría, correos | Acceso, comunicación y retención excepcional |
| Muestras privadas | Personas representadas y destinatarios del enlace | Muestras, medios y seguimiento administrativo | Autorización y vida del enlace/conversión |
| Comunicaciones y comunidad | Cuentas vinculadas, mensajes, identidad externa | Correo, Telegram, foro privado | Preferencias, destinatarios y proveedores |
| Pagos futuros | Pagadores y datos transaccionales mínimos | Propuesta de órdenes, banco y pasarela | No iniciar antes de completar diseño y contratos |

Para cada registro añadir: propietario interno; finalidad específica; fuente; categorías de titulares/datos; base y evidencia; destinatarios/encargados; transferencias y mecanismo; sistemas y accesos; plazo y evento de inicio; supresión/anonimización; información al titular; derechos; medidas; riesgo; fecha de revisión y cambios pendientes. No marcar casillas de cumplimiento sin evidencia.

### EIPD y riesgo: trabajo propuesto

La reforma requiere evaluación previa cuando el tratamiento pueda producir alto riesgo y contempla supuestos específicos en el artículo 15 ter. Para este sitio debe documentarse al menos el análisis de publicación sensible, seguimiento de navegación, documentos de identidad/salud, representación y difusión por terceros. Este informe propone evaluarlos por contexto; no presume una conclusión formal de obligación idéntica para cada flujo. [Fuente: Ley N.º 19.628, versión reformada.]

Secuencia práctica:

1. Delimitar operación y diagrama de datos desde captura hasta eliminación, incluyendo colas, correos y proveedores.
2. Examinar necesidad y alternativas menos invasivas; descartar finalidades inadmisibles antes de discutir controles.
3. Identificar riesgos para personas: exposición íntima, suplantación, represalias, discriminación, correlación de navegación, filtración documental y acceso de terceros.
4. Asignar probabilidad e impacto con criterios consistentes; registrar medidas existentes y sus límites reales.
5. Diseñar mitigaciones verificables y riesgos residuales; registrar quién aprueba y condiciones de puesta en marcha.
6. Reabrir evaluación ante nuevo proveedor, finalidad, tecnología, dato sensible, seguimiento o pago. Revisar orientaciones efectivamente vigentes de la Agencia antes de iniciar.

## Incidentes y gobierno operativo

La auditoría y los eventos operativos existentes aportan trazabilidad técnica, pero no sustituyen un expediente de incidente de privacidad.

- Designar una persona responsable y suplente para privacidad, derechos y coordinación de incidentes. No publicar que hay un delegado formal o modelo certificado sin respaldo real.
- Registrar detección, alcance, categorías afectadas, contención, medidas, recuperación y decisiones de comunicación; usar IDs y resúmenes, sin copiar documentos o conversaciones sensibles a incidencias públicas.
- Preparar contactos de proveedores, revocación de acceso, conservación mínima de evidencia y pruebas de restauración en entorno controlado.
- Definir revisión de obligaciones de reporte y comunicación bajo la norma aplicable; no importar automáticamente un plazo extranjero universal de 72 horas.
- Capacitar a quienes ven documentos o moderan perfiles; revisar permisos y accesos periódicamente.

Estas medidas pueden comenzar como procedimientos y registros seguros. Automatizar un módulo administrativo es una decisión de escala; no es requisito que todo se convierta en pantallas públicas.

## Orden de implementación recomendado

1. Resolver flujo médico, identidad pública informada y afirmaciones de métricas/proveedores; completar el diff legal sin presentar funciones futuras como vigentes.
2. Definir RAT y bases por finalidad; acordar minimización y conservación con evidencia.
3. Implementar consentimiento sensible, retirada, bloqueo y expediente de derechos; preparar exportación segura.
4. Ajustar captura y purga de métricas, mensajes y excepciones de retención; comprobar tareas programadas y alertas.
5. Verificar proveedores, contratos y transferencias; completar EIPD y simulacro de incidente.
6. Diseñar y aprobar pagos en una entrega separada, con sus pruebas y condiciones comerciales.

Los pasos 2 a 5 pueden avanzar en paralelo cuando no dependan de una decisión pendiente. No es necesario esperar un sistema de pagos para corregir privacidad actual.

## Fuentes normativas verificadas

Consultadas en BCN/Ley Chile el 26 de octubre de 2026. Los enlaces de versiones futuras se identifican expresamente para no confundirlos con el régimen vigente a la fecha de revisión.

- [Ley N.º 21.719: reforma y disposiciones transitorias](https://www.bcn.cl/leychile/navegar?idNorma=1209272). Referencia de entrada en vigor general y transición.
- [Ley N.º 19.628: versión vigente consultada durante la transición](https://www.bcn.cl/leychile/navegar?idNorma=141599&idVersion=2023-05-09). Referencia de tratamiento y procedimiento actualmente aplicables.
- [Ley N.º 19.628: texto desde el 1 de diciembre de 2026](https://www.bcn.cl/leychile/navegar?idNorma=141599&idVersion=2026-12-01). Referencias dirigidas: artículos 11, 14 ter, 15 ter, 16 y 16 bis.
- [Ley N.º 19.496, texto refundido por DFL N.º 3 de 2019](https://www.bcn.cl/leychile/navegar?idNorma=1160403). Referencia para preparar el futuro flujo oneroso y revisar información, contratación, retracto y derechos irrenunciables.
- [Decreto N.º 6 de 2021: Reglamento de Comercio Electrónico](https://www.bcn.cl/leychile/navegar?idNorma=1165504).
- [Decreto N.º 52 de 2022, publicado en 2024: exclusión del retracto](https://www.bcn.cl/leychile/navegar?idNorma=1206144).
- [Cloudflare D1: límites por sentencia SQL](https://developers.cloudflare.com/d1/platform/limits/). La migración se divide en sentencias inferiores a 100.000 bytes.

Las propuestas técnicas proceden de la inspección del código y del análisis de su riesgo; no son transcripciones normativas ni una afirmación de que todo control recomendado esté expresamente exigido con esa misma implementación.

## Verificación local de esta entrega

Se preparó una base y un almacenamiento de QA separados de `.wrangler/visual-state`, sin credenciales de producción. Wrangler aplicó las 66 migraciones exclusivamente en esa base. Se comprobaron las filas legales con versión `2026.10.26.1`, las cuatro entradas de historial anterior/nuevo y la ausencia de la tabla auxiliar al terminar. No se aplicó la migración a D1 remoto.

- Las 23 pruebas dirigidas de documentos, migración, contratos del editor, autorización, concurrencia y retención pasaron. Los escenarios incluyen bootstrap implícito, JSON explícito con espacios, borrador conservado, personalización, versión posterior, historial incompatible, JSON malformado y repetición sin cambios adicionales.
- TypeScript pasó y ESLint terminó sin errores; notificó tres advertencias en archivos de QA anteriores dentro de `outputs/`, ajenos a esta entrega. La compilación del proyecto pasó, con los avisos de tamaño de chunks y tiempos de plugins del compilador.
- HTTP local devolvió 200 para `/terminos` y `/privacidad`, con la nueva versión/fecha, H1 único y canónicas `https://chile3x.cl/terminos` y `https://chile3x.cl/privacidad`.
- Se comprobaron ambos temas y ambas configuraciones de home. Para ambos documentos se midió reflujo normal a 320, 360, 390, 430, 1366, 1920, 2560 y 3440 px en las combinaciones principales; se rechecó el resto de combinaciones a 320, 390 y los cuatro anchos de escritorio. No hubo desborde horizontal normal. Los índices tienen 24 y 25 enlaces respectivamente, todos con destino válido. Classic no carga el CSS Glass; Liquid Glass carga una única hoja versionada.
- Se inspeccionaron capturas del tema Classic a 320 px y Liquid Glass a 390 px, y no se observaron errores o advertencias de consola en las cuatro páginas de QA. Con la elección «Solo necesarias» no se registraron recursos de Tag Manager o Google Analytics en esas páginas legales; esto no sustituye una auditoría del contenedor de producción ni de los flujos de anuncios.
- La simulación de tamaño raíz de texto al 200 % detectó que la bibliografía ampliada forzaba el mínimo automático de la cuadrícula. Se corrigió en `app/public-mobile.css`, dentro de `max-width:860px`, limitando la cuadrícula y permitiendo división de referencias largas. Tras el cambio no hubo cajas de texto o enlaces legales fuera del viewport de 320 px en ambos documentos y temas. Esta simulación no certifica todo el chrome del sitio con zoom real: el documento completo aún informó una diferencia de anchura de aproximadamente 15 px con ese ajuste de texto, fuera de las cajas legales medidas. Una captura adicional con esa simulación no terminó y se canceló; no se usa como evidencia visual aprobada.

No se añadieron botones, formularios o flujos comerciales en esta entrega. Los contratos de autorización y edición se verificaron mediante pruebas locales; no se inició sesión en administración de producción ni se crearon cuentas de QA remotas. Hay cambios concurrentes ajenos en la copia de trabajo y no se incorporaron a una publicación de esta revisión.

Al cerrar la revisión se detuvo el servidor de QA y se retiraron los tres archivos de configuración y cambio de tema de ese entorno. Las bases y cachés locales de prueba permanecen en directorios ignorados; no se incluyen en la entrega. La comprobación final de TypeScript también pasó. La revisión está preparada y probada localmente, sin commit/push de esta entrega, migración remota ni nueva versión activa de Cloudflare.

## Controles pendientes antes de publicar

Esta lista es un plan; **no acredita que se haya ejecutado**.

- [ ] Revisar el diff completo y confirmar qué cambios de esta entrega están implementados; mantener separados textos, recomendaciones y funciones pendientes.
- [ ] Validar identidad y canal público operativo; completar los datos comerciales adicionales antes de activar contratación onerosa.
- [ ] Comparar contenido predeterminado, versión publicada, borrador y personalizaciones efectivas de D1 sin exponer datos privados.
- [x] Revisar y probar localmente la migración protegida: condiciones precisas, preservación de personalizaciones/borradores, historial, versiones y comportamiento repetido.
- [x] Ejecutar pruebas dirigidas de documentos, aceptación y migración, tipos, lint y compilación de esta entrega.
- [ ] Revisar términos y privacidad completos, bibliografía, enlaces, títulos, canonicals, robots y metadatos existentes.
- [ ] Revisar lectura, navegación por anclas y enlaces largos en ambos temas; escritorio y móviles de 320, 360, 390 y 430 px, incluyendo texto ampliado.
- [ ] Si se añaden controles, verificar foco, teclado, estados deshabilitados, contraste y etiquetas largas en ambos temas y sesiones pertinentes.
- [ ] Verificar con fixtures locales la captura de consentimiento, rechazo/retirada de medición y ausencia de tráfico opcional previo al opt-in cuando cambie ese flujo.
- [ ] Verificar purgas, colas, bloqueo y exportaciones si se implementan; no crear cuentas falsas ni descargar datos reales de producción como QA.
- [ ] Preparar commit solo con archivos pertinentes; excluir credenciales, cuentas de prueba, documentos privados y trabajo ajeno.
- [ ] Enviar el commit a GitHub y comprobar checks. Usar el despliegue vinculado de Workers Builds; no iniciar una publicación manual paralela.
- [ ] Verificar el SHA de origen y versión activa de Cloudflare juntos; comprobar rutas y textos efectivamente publicados.
- [ ] Registrar la evidencia y el estado final; si GitHub, migración o Cloudflare queda pendiente, describir el estado parcial y no declarar la entrega publicada o sincronizada.

## Publicación autorizada el 27 de octubre de 2026

La persona responsable autorizó publicar la entrega mediante commit, push, migración protegida y comprobación de Workers Builds. En la consulta remota previa se confirmó que solo faltaba `0065`; Términos conservaba el bootstrap `2026.10.14.3`, sin borrador, y Privacidad estaba en `2026.10.17.1`, sin borrador. La comparación íntegra de Privacidad encontró únicamente una reformulación del primer párrafo de documentos privados para calificar los antecedentes médicos como opcionales. La nueva sección de identidad y salud incorpora y amplía ese alcance con las restricciones jurídicas revisadas.

La migración admite esa versión de Privacidad solo si su JSON coincide con el contenido inspeccionado. Cualquier edición posterior, versión distinta o historial incompatible conserva su protección y debe comprobarse por separado. Se añadió una prueba de actualización del contenido revisado y otra que comprueba que una edición posterior no sea sustituida. El historial existente permanece intacto. El estado del commit, sus checks y la versión activa se verifican después de la publicación y se registran juntos en la evidencia de la entrega; esta autorización y la consulta previa no acreditan por sí solas un despliegue terminado.
