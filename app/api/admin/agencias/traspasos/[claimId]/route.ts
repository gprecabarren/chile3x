import {getCurrentAdmin,assertSameOrigin} from "@/lib/auth";
import {AgencyError,verifyAgencyClaim} from "@/lib/agency-management";
import {CollaborationConflict} from "@/lib/collaboration";
import {recordAdminAudit} from "@/lib/admin-audit";
export async function POST(request:Request,{params}:{params:Promise<{claimId:string}>}) {
 try{try{assertSameOrigin(request);}catch{return new Response("Solicitud no válida.",{status:403});}const admin=await getCurrentAdmin();if(!admin)return new Response("No autorizado.",{status:403});const {claimId}=await params,completed=await verifyAgencyClaim(admin,claimId,await request.formData());await recordAdminAudit(admin,{category:"profiles",action:"agency.claim_verify",entityType:"agency_claim",entityId:claimId,summary:completed?"Comprobó y completó la vinculación de un perfil de agencia a su titular personal.":"Comprobó una vinculación; falta aceptación vigente de la cuenta destinataria."});const url=new URL("/admin/agencias",request.url);url.searchParams.set("message",completed?"Vinculación completada. La cuenta destinataria tiene el control del anuncio.":"Comprobación guardada. Falta la aceptación de la persona destinataria.");return Response.redirect(url,303);
 }catch(cause){const message=cause instanceof AgencyError||cause instanceof CollaborationConflict?cause.message:"No se confirmó la comprobación. Revisa la propuesta antes de repetirla.";const url=new URL("/admin/agencias",request.url);url.searchParams.set("message",message);url.searchParams.set("error","1");return Response.redirect(url,303);}
}
