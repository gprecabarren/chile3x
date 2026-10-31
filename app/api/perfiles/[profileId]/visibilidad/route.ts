import { getProfileAccess,authorizedProfileBatch } from "@/lib/profile-access";
import {profileManagementActivity} from "@/lib/agency-management";
import {CollaborationConflict,expectedVersion} from "@/lib/collaboration";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const [{ profileId }, formData] = await Promise.all([params, request.formData()]);
  const action = formData.get("action");
  const requestedReturnTo = typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : "/mi-cuenta";
  const returnTo = safeAccountReturnTo(requestedReturnTo);
  if (action !== "hide" && action !== "show") return NextResponse.redirect(new URL(`${returnTo}?notice=error`, request.url), 303);
  const db = await getDb();
  const access=await getProfileAccess(profileId,user.id,"visibility");if(!access)return new Response("El permiso de gestión ya no está vigente.",{status:403});
  try{await authorizedProfileBatch(access,"visibility",formData.has("review_revision")?expectedVersion(formData,`profile:${profileId}`):{key:`profile:${profileId}`,revision:access.profile.revision},[
    db.update(profiles).set({ ownerHiddenAt: action === "hide" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }).where(eq(profiles.id,profileId)),
    profileManagementActivity(db,access,"profile.visibility",action==="hide"?"Ocultó el anuncio sin borrar sus datos ni medios.":"Solicitó volver a mostrar el anuncio según su estado de moderación."),
  ]);}catch(cause){if(cause instanceof CollaborationConflict)return NextResponse.redirect(new URL("/mi-cuenta?notice=trash_conflict",request.url),303);throw cause;}
  const destination = new URL(returnTo, request.url);
  destination.searchParams.set("notice", action === "hide" ? "hidden" : "shown");
  return NextResponse.redirect(destination, 303);
}
