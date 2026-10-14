# Actualización formal de privacidad y términos

Versión pública 2026.10.14.2, conservando estructura, índice y estilo de las páginas.

Cambios: historias de los tres tipos con vencimiento público a las 24 horas y limpieza programada; límites reales de fotos y videos; opciones de preparación y almacenamiento final; separación de moderación de archivos/anuncio; previsualización privada; edición y publicación de historias por administración; auditoría sin duplicación de documentos o cuerpos temporales; métodos federados y desvinculación; bot de búsqueda local y sin generación externa; foro privado; distinción anunciante/equipo en WhatsApp; alcance informativo del resumen 24/7; seudonimización de identidad del chat sin prometer anonimización de texto libre.

Fuentes oficiales consultadas el 14 de octubre de 2026:

- https://www.bcn.cl/leychile/navegar?idNorma=141599
- https://www.bcn.cl/leychile/navegar?idNorma=1209272
- https://www.bcn.cl/leychile/navegar?idNorma=61438

El artículo primero transitorio publicado de la Ley 21.719 mantiene el plazo de 24 meses desde la publicación de diciembre de 2024. No se convirtió una propuesta de aplazamiento en una fecha legal ya vigente. Se eliminó la promesa no verificada de adecuación completa antes de esa fecha.

## Plazos operativos adoptados

Son decisiones de minimización del portal, no plazos impuestos por una ley ni
certificaciones de cumplimiento. Se compararon las políticas oficiales de
[OnlyGuider](https://onlyguider.com/privacy-policy/),
[AdultWork Europe](https://www.adultworkeurope.com/privacy) y
[Fatal Model](https://fatalmodel.com/privacy-policy), sin copiar sus obligaciones
contractuales ni asumir que corresponden a Chile3X.

| Datos | Plazo |
| --- | --- |
| Cuenta y anuncio conservados | Mientras se mantengan; pausar u ocultar no equivale a eliminar |
| Historias y sus archivos | 24 horas; limpieza por lotes cada cinco minutos, con reintentos |
| Documento de identidad | 90 días desde la última carga o sustitución |
| Examen médico | 30 días desde la última carga o sustitución |
| Reporte cerrado y evidencias | 180 días desde su cierre/última decisión; los abiertos se conservan para atenderlos |
| Conversación interna | 365 días desde el último mensaje |
| Auditoría administrativa | 365 días |
| Diagnósticos propios | 30 días |
| Sesión vencida | Hasta 30 días después del vencimiento; tokens de cuenta vencidos, hasta siete días |
| Constancia seudonimizada de eliminación de cuenta | 180 días |

Aviso de transición de 30 días: ejecución de nuevos plazos no temporales desde
el **13 de noviembre de 2026, 09:00 hora de Chile**. No se borran cargas
históricas inmediatamente. La vigencia de historias y la eliminación expresa
de una cuenta no se posponen. Una necesidad jurídica concreta puede retener
únicamente los registros afectados (`data_retention_holds`), no todo el portal.
Esta excepción no tiene todavía una interfaz administrativa propia.

La eliminación de documentos/reportes registra atómicamente trabajos de borrado
de sus objetos. Si R2 falla, la cola durable conserva solo las claves necesarias
para reintentar y ya no deja disponible el contenido mediante el registro
operativo. La eliminación expresa de cuenta usa la misma protección.

Los respaldos automáticos de D1 pueden conservar versiones durante
[7 o 30 días según el plan](https://developers.cloudflare.com/d1/reference/time-travel/).
La desaparición operativa no promete un borrado instantáneo de esos respaldos.

Pendiente del responsable del sitio y asesoría jurídica: verificar la
identificación legal y los mecanismos jurídicos/contractuales de datos sensibles
y proveedores. Por instrucción del propietario no se agregó una identidad legal
no confirmada. No se inventaron nombre legal, RUT, domicilio, registros, contratos
ni certificaciones. Esta actualización no certifica cumplimiento legal integral.
