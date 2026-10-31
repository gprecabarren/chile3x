import { profileAccessCondition, getProfileAccess, authorizedProfileBatch } from "@/lib/profile-access";
import { profileManagementActivity } from "@/lib/agency-management";
import { dataDeletionJobs } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileStatuses, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado.", { status: 401 });
  const [{ storyId }, formData] = await Promise.all([params, request.formData()]);
  const db = await getDb();
  const [row] = await db.select({ story: profileStatuses, profile: profiles }).from(profileStatuses).innerJoin(profiles, eq(profileStatuses.profileId, profiles.id)).where(and(eq(profileStatuses.id, storyId), profileAccessCondition(user.id,"stories"), isNull(profiles.trashedAt))).limit(1);
  if (!row) return new Response("No encontrado.", { status: 404 });
  const access=await getProfileAccess(row.profile.id,user.id,"stories");if(!access)return new Response("El permiso ya no está vigente.",{status:403});
  await authorizedProfileBatch(access,"stories",{key:`profile:${row.profile.id}`,revision:row.profile.revision},[
    ...(row.story.r2Key?[db.insert(dataDeletionJobs).values({id:crypto.randomUUID(),r2Key:row.story.r2Key}).onConflictDoNothing()]:[]),
    db.delete(profileStatuses).where(eq(profileStatuses.id,storyId)),
    profileManagementActivity(db,access,"story.removed","Retiró una historia del anuncio."),
  ]);
  if(row.story.r2Key){const{env}=await import("cloudflare:workers");try{await env.MEDIA?.delete(row.story.r2Key);}catch{/* Durable cleanup keeps the reference until storage is available. */}}
  const returnTo = formData.get("return_to");
  const destination = safeAccountReturnTo(typeof returnTo === "string" ? returnTo : null);
  return NextResponse.redirect(new URL(destination, request.url), 303);
}
