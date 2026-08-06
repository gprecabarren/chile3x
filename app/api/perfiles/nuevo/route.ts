import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { createProfile, ProfileValidationError, readProfileSubmission } from "@/lib/profile-submission";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta/nuevo-perfil", request.url), 303);
  }

  const [listingSetting] = await (await getDb()).select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, "listing_open"))
    .limit(1);
  if (listingSetting?.value === "closed") {
    return NextResponse.redirect(new URL("/mi-cuenta?notice=closed", request.url), 303);
  }

  try {
    const formData = await request.formData();
    const submission = readProfileSubmission(formData);
    const profileId = await createProfile(user.id, submission);
    return NextResponse.redirect(new URL(`/mi-cuenta/${profileId}/editar?notice=${submission.intent === "submit" ? "submitted" : "saved"}`, request.url), 303);
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      const destination = new URL("/mi-cuenta/nuevo-perfil", request.url);
      destination.searchParams.set("error", "validation");
      destination.searchParams.set("message", error.message);
      return NextResponse.redirect(destination, 303);
    }
    console.error("Profile creation failed", error);
    const destination = new URL("/mi-cuenta/nuevo-perfil", request.url);
    destination.searchParams.set("error", "server");
    destination.searchParams.set("message", "No se pudo guardar el aviso. Revisa los campos e inténtalo nuevamente.");
    return NextResponse.redirect(destination, 303);
  }
}
