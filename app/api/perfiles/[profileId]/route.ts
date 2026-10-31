import { getProfileAccess } from "@/lib/profile-access";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { ProfileValidationError, readProfileSubmission, updateProfile } from "@/lib/profile-submission";
import { CollaborationConflict, expectedVersion, conflictResponse, mutationRedirect } from "@/lib/collaboration";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  const { profileId } = await params;
  if (!user) {
    return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  }

  try {
    const access=await getProfileAccess(profileId,user.id,"edit");
    if(!access)return Response.json({error:"No tienes permiso vigente para editar este anuncio."},{status:403});
    const formData = await request.formData();
    const submission = readProfileSubmission(formData, {travelDateValidation: "stored"});
    const result = await updateProfile(profileId, access.ownerId, submission, {access,version:expectedVersion(formData,`profile:${profileId}`)});
    const notice = result.contactOnly ? "contacts_saved" : submission.intent === "submit" ? "submitted" : "saved";
    return mutationRedirect(request,new URL(result.updated ? `/mi-cuenta/${profileId}/editar?notice=${notice}` : "/mi-cuenta?notice=error", request.url));
  } catch (error) {
    if (error instanceof CollaborationConflict) {
      if(request.headers.get("accept")?.includes("application/json"))return conflictResponse();
      const destination=new URL(`/mi-cuenta/${profileId}/editar`,request.url);destination.searchParams.set("error","conflict");destination.searchParams.set("message",error.message);return NextResponse.redirect(destination,303);
    }
    if(request.headers.get("accept")?.includes("application/json"))return Response.json({error:error instanceof Error?error.message:"No se pudieron guardar los cambios."},{status:error instanceof ProfileValidationError?400:500});
    if (error instanceof ProfileValidationError) {
      const destination = new URL(`/mi-cuenta/${profileId}/editar`, request.url);
      destination.searchParams.set("error", "validation");
      destination.searchParams.set("message", error.message);
      return NextResponse.redirect(destination, 303);
    }
    console.error("Profile update failed", error);
    const destination = new URL(`/mi-cuenta/${profileId}/editar`, request.url);
    destination.searchParams.set("error", "server");
    destination.searchParams.set("message", "No se pudieron guardar los cambios. Revisa los campos e inténtalo nuevamente.");
    return NextResponse.redirect(destination, 303);
  }
}
