import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { trashProfile } from "@/lib/profile-trash";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const [formData, { profileId }] = await Promise.all([request.formData(), params]);
  if (formData.get("confirmation") !== "ELIMINAR") return NextResponse.redirect(new URL("/mi-cuenta?notice=trash_confirmation", request.url), 303);
  const result = await trashProfile(profileId, user, "self");
  return NextResponse.redirect(new URL(`/mi-cuenta?notice=${result === "ok" ? "trashed" : "error"}`, request.url), 303);
}
