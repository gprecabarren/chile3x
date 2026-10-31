import { agencyRoute } from "@/lib/agency-route";
import { changeAgencyMembership } from "@/lib/agency-management";
export async function POST(request:Request,{params}:{params:Promise<{membershipId:string}>}) { const {membershipId}=await params;return agencyRoute(request,(user,form)=>changeAgencyMembership(user,membershipId,form),"Asociación actualizada. Los permisos retirados dejan de funcionar inmediatamente, también en pestañas abiertas. Revisa los contactos del anuncio si utilizaban los de la agencia."); }
