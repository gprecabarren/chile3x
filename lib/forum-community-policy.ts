import { ForumInputError } from "./forum-policy";
export const FORUM_ATTACHMENT_BYTES=200_000_000;
export const FORUM_IMAGE_BYTES=5_000_000;
export const FORUM_ATTACHMENTS_PER_POST=4;
export const FORUM_REPORT_REASONS={spam:"Spam o publicidad repetitiva",harassment:"Acoso, amenazas o ataques personales",privacy:"Datos personales o privados",consent:"Contenido sin consentimiento o derechos",other:"Otro incumplimiento"} as const;
export const FORUM_DEFAULT_RULES=`Normas del foro Chile3X · Beta privada

1. Solo pueden participar administradores autorizados. Esta beta no concede acceso a usuarios ni visitantes.
2. Mantenga un trato respetuoso. No publique amenazas, acoso, discriminación ni ataques personales.
3. Publique únicamente información y material propio o con autorización de sus titulares y de todas las personas representadas, que deben ser mayores de 18 años. No se admite contenido de menores, explotación, violencia sexual ni material obtenido sin consentimiento.
4. No publique documentos de identidad, exámenes médicos, contraseñas, direcciones exactas, teléfonos privados ni información identificable de terceros. Los documentos de los anuncios permanecen en sus secciones privadas; nunca deben copiarse al foro.
5. No se admiten spam, phishing, suplantaciones ni enlaces para actividades ilícitas. Distinga opiniones, experiencias y hechos; no atribuya delitos sin fundamento ni presente una publicación como una certificación de Chile3X.
6. Use la sección adecuada, evite duplicados y no publique anuncios comerciales repetidos. Los límites de frecuencia y tamaño se aplican también a administradores.
7. Los adjuntos requieren declaración de consentimiento y revisión manual antes de quedar aprobados. La revisión no prueba por sí sola identidad, legalidad ni ausencia de riesgos.
8. Utilice Reportar en el mensaje afectado para solicitar revisión o rectificación. Las denuncias y sus decisiones solo están disponibles dentro de esta beta administrativa.
9. Administración puede corregir, mover, cerrar o retirar publicaciones con trazabilidad. Los adjuntos retirados, rechazados o asociados a mensajes en papelera se eliminan tras 30 días; hasta entonces pueden recuperarse desde administración.
10. Las notificaciones son internas, no correos automáticos. Se conservan 90 días; las denuncias cerradas, 180 días. Estas normas complementan los Términos y la Política de privacidad del portal.`;
export function forumReportReason(value:unknown){if(typeof value!=="string"||!Object.hasOwn(FORUM_REPORT_REASONS,value))throw new ForumInputError("Seleccione un motivo válido.");return value as keyof typeof FORUM_REPORT_REASONS;}
export async function claimForumRate(db:Pick<D1Database,"prepare">,userId:string,kind:"write"|"publish"|"upload"|"report",now=Date.now()){
 const window=kind==='publish'?5000:60_000,max=kind==='publish'?1:kind==='upload'||kind==='report'?6:20;
 const result=await db.prepare("INSERT INTO forum_rate_limits(key,window_start,hits,updated_at) VALUES(?,?,1,?) ON CONFLICT(key) DO UPDATE SET window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END,hits=CASE WHEN window_start<=? THEN 1 ELSE hits+1 END,updated_at=excluded.updated_at WHERE window_start<=? OR hits<?").bind(`${userId}:${kind}`,now,new Date(now).toISOString(),now-window,now-window,now-window,max).run();
 if(!result.meta.changes)throw new ForumInputError(`Se alcanzó el límite de frecuencia. Espere ${kind==='publish'?'5 segundos':'un minuto'} antes de intentarlo nuevamente.`,429);
}
