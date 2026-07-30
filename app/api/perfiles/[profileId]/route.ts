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
    const submission = readProfileSubmission(await request.formData());
    const updated = await updateProfile(profileId, user.id, submission);
    return NextResponse.redirect(new URL(updated ? `/mi-cuenta?notice=${submission.intent === "submit" ? "submitted" : "saved"}` : "/mi-cuenta?notice=error", request.url), 303);
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return NextResponse.redirect(new URL(`/mi-cuenta/${profileId}/editar?error=validation`, request.url), 303);
    }
    throw error;
  }
}
