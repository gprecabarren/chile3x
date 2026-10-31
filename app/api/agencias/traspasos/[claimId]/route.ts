import { agencyRoute } from "@/lib/agency-route";
import { respondAgencyClaim,cancelAgencyProposal } from "@/lib/agency-management";
export async function POST(request:Request,{params}:{params:Promise<{claimId:string}>}) { const {claimId}=await params;return agencyRoute(request,(user,form)=>form.get("action")==="cancel"?cancelAgencyProposal(user,claimId,form):respondAgencyClaim(user,claimId,form),"Respuesta registrada. La vinculación solo se completa con aceptación, comprobación administrativa vigente y cupo personal disponible. Revisa su estado abajo."); }
