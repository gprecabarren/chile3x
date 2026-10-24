import { getCurrentAdmin,assertSameOrigin } from "@/lib/auth";
import { canManageSamples,createPrivateSample } from "@/lib/private-samples";
import { ProfileValidationError } from "@/lib/profile-submission";
import { recordAdminAudit } from "@/lib/admin-audit";
import { mutationRedirect } from "@/lib/collaboration";
export async function POST(request:Request) {
  try{assertSameOrigin(request);}catch{return new Response("Solicitud no válida.",{status:403});}
  const admin=await getCurrentAdmin();if(!admin||!canManageSamples(admin))return new Response("No autorizado.",{status:403});
  try {
    const id=await createPrivateSample(await request.formData(),admin);
    await recordAdminAudit(admin,{category:"profiles",action:"sample.create",entityType:"sample",entityId:id,summary:"Creó una muestra privada sin cuenta ni anuncio público."});
    return mutationRedirect(request,new URL(`/admin/muestras/${id}`,request.url));
  }catch(error){return Response.json({error:error instanceof ProfileValidationError?error.message:"No se pudo crear la muestra. Revisa los campos."},{status:400,headers:{"cache-control":"no-store"}});}
}
