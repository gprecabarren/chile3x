import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { ProfileValidationError, readProfileSubmission, updateProfile } from "@/lib/profile-submission";
import { readVerificationDocuments, saveVerificationDocuments, VerificationDocumentError } from "@/lib/verification-documents";

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
    const documents = await readVerificationDocuments(formData);
    const updated = await updateProfile(profileId, user.id, submission);
    if (updated && submission.type === "escort") await saveVerificationDocuments(profileId, documents);
    return NextResponse.redirect(new URL(updated ? `/mi-cuenta?notice=${submission.intent === "submit" ? "submitted" : "saved"}` : "/mi-cuenta?notice=error", request.url), 303);
  } catch (error) {
    if (error instanceof ProfileValidationError || error instanceof VerificationDocumentError) {
      const destination = new URL(`/mi-cuenta/${profileId}/editar`, request.url);
      destination.searchParams.set("error", "validation");
      destination.searchParams.set("message", error.message);
      return NextResponse.redirect(destination, 303);
    }
    throw error;
  }
}
