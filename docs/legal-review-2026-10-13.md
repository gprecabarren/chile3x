# Revisión de Privacidad y Términos — 13 de octubre de 2026

Estado: evaluación y propuestas, no publicadas. No sustituye una revisión jurídica.
Se compararon las páginas públicas con `app/privacidad/page.tsx`,
`app/terminos/page.tsx` y los flujos actuales del repositorio.

## Conclusión

Sí conviene una actualización focalizada; no rehacer ambos documentos ni añadir
texto genérico. Ya contemplan documentos privados, reseñas moderadas por el
anunciante, mensajería, Analytics opcional, Google, Apple y X inactivos, desvincular
proveedores y mapas referenciales. Se debe conservar el estilo y el índice.

## Prioridad alta: coherencia con el producto

1. **Términos, apartado 5:** la frase sobre volver a revisión al cambiar foto
   principal, documentos o medios ya no describe la separación de archivos.
   Propuesta: «Los cambios de información relevantes pueden requerir una nueva
   revisión. Añadir, reemplazar o eliminar una foto o video no retira por sí solo
   un anuncio publicado: el material nuevo se revisa por separado y solo se
   muestra públicamente una vez aprobado. Las medidas de seguridad o moderación
   del anuncio siguen siendo independientes.»
2. **Ambos documentos:** añadir la ayuda beta. Propuesta de Privacidad:
   «La ayuda beta busca respuestas en guías revisadas y no utiliza actualmente
   IA generativa. Las consultas y valoraciones permanecen en memoria de la página;
   no se guardan en nuestra base de datos ni se envían a un proveedor de IA.
   Se descartan al salir o recargar. Los enlaces de soporte no adjuntan la
   conversación: tú decides qué enviar en WhatsApp, sujeto a sus políticas.
   No introduzcas contraseñas, códigos, documentos ni datos sensibles.»
   Propuesta de Términos: «La ayuda beta es orientación sobre el funcionamiento
   del sitio, puede contener errores y no realiza cambios, concede permisos ni
   sustituye atención humana. Si los pasos no resuelven el caso, utiliza los
   canales oficiales.»
3. **Privacidad, origen/finalidades/seguridad, y Términos, publicaciones/medios:**
   informar de la asistencia administrativa para editar anuncios y publicar o
   retirar historias en nombre del anunciante. Los permisos técnicos no
   sustituyen la autorización para publicar material ajeno. Registrar actor,
   fecha, anuncio y actuación; acceso restringido a la auditoría. Mantener una
   vía para pedir corrección o retiro, sin afirmar que todos los administradores
   pueden ver documentos privados.
4. **Temporalidad:** las historias y estados del flujo actual vencen a las
   24 horas, incluidos los creados por administración. Evitar confundirlos con
   estados indefinidos o prometer borrado inmediato de todas las copias: la
   desaparición pública y la purga del almacenamiento son procesos distintos.
5. **Privacidad y Términos, mensajería:** no llamar «anonimizado» al historial
   completo solo porque se oculta la identidad de una cuenta retirada. El texto
   previo puede contener nombres u otros datos que sus participantes escribieron.
   Describir exactamente la sustitución de identidad y las restricciones de acceso.
6. **Términos, cuentas/contactos:** alinear el listado de proveedores con X
   preparado pero deshabilitado y la desvinculación con contraseña previa.
   Privacidad ya lo explica: no presentarlo como una nueva integración activa.
7. **Medios:** explicar que recorte, marca de agua y difuminado son opciones
   disponibles según el tipo de archivo y no garantizan impedir identificación
   o copias. Los límites operativos pueden enlazarse a las reglas/formulario para
   no duplicar cifras cambiantes: actualmente foto final 10 MB, video final
   12 MB y 15 segundos; difuminado facial solo en fotos.

## Prioridad alta: decisiones que faltan, no inventar datos

- Identificar al responsable legal real del portal: persona o entidad y canal
  válido para solicitudes. Hoy se indica únicamente el nombre comercial Chile3X.
  No publicar un nombre legal, RUT o domicilio supuesto.
- Añadir versión y fecha visibles y conservar versiones anteriores. Ambos textos
  prometen mostrarlas, pero el componente `LegalPage` no las presenta.
- Definir una tabla de conservación real para archivos médicos/identidad,
  auditorías, reportes, conversaciones, objetos expirados y respaldos. No afirmar
  plazos ni copias de seguridad que no se hayan comprobado operativamente.
- Revisar finalidad, necesidad y consentimiento específico para documentos
  médicos y otros datos sensibles; subir un archivo «opcional» no demuestra por
  sí solo todos esos requisitos. Evaluar si se necesitan realmente.
- Antes de incorporar IA externa, guardar consultas o abrir tickets, revisar
  nuevamente proveedores, transmisión, acceso, retención y avisos del asistente.

## Marco oficial y preparación

La Ley 19.628 vigente restringe el tratamiento de datos sensibles en su artículo
10. Conviene revisar el consentimiento y la necesidad de documentos médicos con
asesoría jurídica, no confiar solo en la etiqueta «opcional».
[BCN, Ley 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599).

La Ley 21.719 publicada contempla transparencia sobre responsable, versión,
finalidades, conservación y transferencias, entre otras materias (artículo
14 ter). El texto oficial consultado mantiene vigencia diferida al 1 de
diciembre de 2026. El Gobierno anunció una propuesta de postergación a 2027;
una propuesta no equivale a una modificación vigente. Revalidar la fecha antes
de aprobar textos definitivos y preparar procesos verificables de derechos,
retención y respuesta a incidentes.
[BCN, Ley 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272)
y [Ministerio de Economía, propuesta del 1 de septiembre de 2026](https://www.economia.gob.cl/2026/09/01/gobierno-propone-ampliar-plazo-para-implementar-nueva-ley-de-proteccion-de-datos-y-institucionalidad.htm).

## Antes de publicar

Confirmar responsable y plazos reales; revisar los párrafos propuestos; distinguir
cambios explicativos de cambios de finalidad que necesiten autorización; definir
fecha/versión y forma de comunicar cambios materiales. Luego actualizar ambas
páginas conjuntamente, comprobar enlaces, índice y aspecto móvil/PC, y comprobar
que los avisos de registro sigan enlazando la versión correcta.
