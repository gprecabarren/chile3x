import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { ProfileValidationError, readProfileSubmission, updateProfile } from "@/lib/profile-submission";

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
    const formData = await request.formData();
    const submission = readProfileSubmission(formData);
    const updated = await updateProfile(profileId, user.id, submission);
    return NextResponse.redirect(new URL(updated ? `/mi-cuenta/${profileId}/editar?notice=${submission.intent === "submit" ? "submitted" : "saved"}` : "/mi-cuenta?notice=error", request.url), 303);
  } catch (error) {
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
