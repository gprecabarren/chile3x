import { agencyRoute } from "@/lib/agency-route";
import { respondAgencyInvitation } from "@/lib/agency-management";
export async function POST(request:Request,{params}:{params:Promise<{requestId:string}>}) { const {requestId}=await params;return agencyRoute(request,(user,form)=>respondAgencyInvitation(user,requestId,form),"Tu respuesta quedó registrada. Puedes consultar y retirar los permisos desde Agencias vinculadas."); }
