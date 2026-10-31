import { agencyRoute } from "@/lib/agency-route";
import { requestAgencyClaim } from "@/lib/agency-management";
export async function POST(request:Request,{params}:{params:Promise<{agencyProfileId:string;profileId:string}>}) { const {agencyProfileId,profileId}=await params;return agencyRoute(request,(user,form)=>requestAgencyClaim(user,agencyProfileId,profileId,form),"Propuesta enviada. El anuncio sigue bajo su agencia hasta la aceptación de la cuenta destinataria y la comprobación administrativa."); }
