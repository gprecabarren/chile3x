import { assertSameOrigin,getCurrentAdmin } from '@/lib/auth';
import { adminHasCapability } from '@/lib/admin-permissions';
import { legalKey,validateLegalDocument } from '@/lib/legal-document';
import { getAdminLegalDocument,saveLegalDocument } from '@/lib/legal-documents';
import { CollaborationConflict,conflictResponse,expectedVersion } from '@/lib/collaboration';
import { readBoundedJson,RequestBodyError } from '@/lib/bounded-json';
import { recordAdminAudit } from '@/lib/admin-audit';
const headers={'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'};
export async function GET(_request:Request,{params}:{params:Promise<{document:string}>}){
 const admin=await getCurrentAdmin();if(!admin||!adminHasCapability(admin,'settings.manage'))return Response.json({error:'No autorizado.'},{status:admin?403:401,headers});
 const key=legalKey((await params).document);if(!key)return Response.json({error:'Documento no encontrado.'},{status:404,headers});
 return Response.json(await getAdminLegalDocument(key),{headers});
}
export async function POST(request:Request,{params}:{params:Promise<{document:string}>}){
 try{assertSameOrigin(request);}catch{return Response.json({error:'Solicitud no válida.'},{status:403,headers});}
 const admin=await getCurrentAdmin();if(!admin||!adminHasCapability(admin,'settings.manage'))return Response.json({error:'No tienes permiso para editar textos legales.'},{status:admin?403:401,headers});
 const key=legalKey((await params).document);if(!key)return Response.json({error:'Documento no encontrado.'},{status:404,headers});
 try{
  const payload=await readBoundedJson(request);if(!payload||typeof payload!=='object'||Array.isArray(payload))return Response.json({error:'Documento no válido.'},{status:400,headers});
  const data=payload as Record<string,unknown>,intent=data.intent;
  if(intent!=='draft'&&intent!=='publish'&&intent!=='discard')return Response.json({error:'Acción no válida.'},{status:400,headers});
  if(intent==='publish'&&data.confirm!==true)return Response.json({error:'Confirma que revisaste los cambios antes de publicar.'},{status:400,headers});
  let document;try{document=intent==='discard'?(await getAdminLegalDocument(key)).published:validateLegalDocument(data.document,intent==='publish');}catch(error){return Response.json({error:error instanceof Error?error.message:'Revisa los bloques.'},{status:400,headers});}
  const form=new FormData();if(typeof data.review_key==='string')form.set('review_key',data.review_key);if(typeof data.review_revision==='string')form.set('review_revision',data.review_revision);
  const result=await saveLegalDocument(key,document,intent,expectedVersion(form,`legal:${key}`),admin.id);
  await recordAdminAudit(admin,{category:'settings',action:`legal.${intent}`,entityType:'legal_document',entityId:key,entityLabel:document.title,summary:`${intent==='publish'?'Publicó':intent==='draft'?'Guardó un borrador de':'Descartó el borrador de'} ${key==='terms'?'Términos y condiciones':'Privacidad'}.`,after:{version:result.version,revision:result.revision,sectionCount:document.sections.length}});
  return Response.json(result,{headers});
 }catch(error){if(error instanceof CollaborationConflict)return conflictResponse();if(error instanceof RequestBodyError)return Response.json({error:error.message},{status:error.status,headers});console.error('Legal editor operation failed',{document:key});return Response.json({error:'No pudimos confirmar el guardado. Tu texto sigue en el editor; comprueba el estado antes de repetirlo.'},{status:500,headers});}
}
