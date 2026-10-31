import { agencyRoute } from "@/lib/agency-route";
import { inviteEscort,cancelAgencyInvitation } from "@/lib/agency-management";
export async function POST(request:Request,{params}:{params:Promise<{agencyProfileId:string}>}) { const {agencyProfileId}=await params;return agencyRoute(request,(user,form)=>form.get("intent")==="cancel"?cancelAgencyInvitation(user,agencyProfileId,form):inviteEscort(user,agencyProfileId,form),"Invitación guardada. Aparecerá en el panel de la persona anunciante y se intentará avisar por correo."); }
