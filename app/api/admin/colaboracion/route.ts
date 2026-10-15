import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { canReview, currentRevision, resourceKey, reviewReservations } from "@/lib/collaboration";
import { adminDisplayLogin } from "@/lib/admin-presentation";
import { adminHasCapability } from "@/lib/admin-permissions";

const headers = { "cache-control":"private, no-store", "x-robots-tag":"noindex, nofollow" };
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({error:"Tu sesión administrativa terminó."},{status:401,headers});
  const requested = new URL(request.url).searchParams.getAll("key");
  if (requested.length>60) return Response.json({error:"Demasiados registros."},{status:400,headers});
  const keys = [...new Set(requested.map(resourceKey).filter(key=>key!==null).filter(key=>canReview(admin,key)))];
  const db=await getDb();
  // One bounded read batch; hidden tabs do not poll. Only authorized resource
  // keys and a public team alias are returned, never emails or lease tokens.
  const rows=keys.length?await db.all<{key:string;revision:number|null;actorId:string|null;actor:string|null;expiresAt:number|null}>(sql`select k.value key,
    case when k.value like 'profile:%' then (select revision from profiles where id=substr(k.value,9))
      when k.value like 'account:%' then (select revision from users where id=substr(k.value,9) and role!='admin')
      when k.value like 'library:%' then (select revision from exclusive_content_collections where id=substr(k.value,9))
      else (select revision from settings_revision where id='site') end revision,
    r.actor_id actorId,coalesce(g.github_login,u.display_name,'Administración') actor,r.expires_at expiresAt
    from json_each(${JSON.stringify(keys)}) k left join review_reservations r on r.resource_key=k.value and r.expires_at>${Date.now()}
    left join users u on u.id=r.actor_id left join admin_github_identities g on g.user_id=r.actor_id`):[];
  const summary=await db.get(sql`select
    ${adminHasCapability(admin,'profiles.moderate')?sql`(select count(*) from profiles where status='pending' and trashed_at is null)`:sql`0`} pendingProfiles,
    ${adminHasCapability(admin,'media.moderate')?sql`(select count(*) from profile_media where moderation_status='pending' and (visibility='public' or is_profile_photo=1))+(select count(*) from exclusive_content_media where moderation_status='pending')`:sql`0`} pendingMedia,
    ${adminHasCapability(admin,'reports.manage')?sql`(select count(*) from profile_reports where status='pending')`:sql`0`} pendingReports,
    ${adminHasCapability(admin,'bugs.manage')?sql`(select count(*) from bug_reports where status='new')`:sql`0`} pendingBugs,
    ${adminHasCapability(admin,'telegram.view')?sql`(select count(*) from telegram_moderation_cases where status='open')`:sql`0`} pendingTelegram`);
  return Response.json({ resources:rows.map(row=>({...row,actor:row.actorId?adminDisplayLogin({id:row.actorId,githubLogin:row.actor??"Administración"}):null})), actorId:admin.id,summary },{headers});
}
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({error:"Solicitud no válida."},{status:403,headers}); }
  const admin=await getCurrentAdmin();
  if (!admin) return Response.json({error:"Tu sesión administrativa terminó."},{status:401,headers});
  const form=await request.formData(), key=resourceKey(form.get("key")), token=form.get("token"), intent=form.get("intent");
  if (!key || !canReview(admin,key)) return Response.json({error:"No tienes permiso para reservar este registro."},{status:403,headers});
  const liveRevision=await currentRevision(key);
  if (liveRevision===null) return Response.json({error:"El registro ya no está disponible."},{status:404,headers});
  const db=await getDb(), now=Date.now();
  await db.delete(reviewReservations).where(sql`${reviewReservations.expiresAt}<${now-300_000}`);
  if (intent==="claim") {
    const leaseToken=crypto.randomUUID();
    const result=await db.insert(reviewReservations).values({resourceKey:key,actorId:admin.id,token:leaseToken,expiresAt:now+120_000})
      .onConflictDoUpdate({target:reviewReservations.resourceKey,set:{actorId:admin.id,token:leaseToken,expiresAt:now+120_000},setWhere:sql`${reviewReservations.expiresAt}<=${now}`}).returning({key:reviewReservations.resourceKey});
    return result.length ? Response.json({token:leaseToken,expiresAt:now+120_000,actorId:admin.id,resources:[{key,revision:liveRevision,actorId:admin.id,actor:adminDisplayLogin(admin),expiresAt:now+120_000}]},{headers}) : Response.json({error:"Otra revisión está en curso. Espera a que se libere."},{status:409,headers});
  }
  // Any tab of the same authenticated administrator may release its own
  // reservation; renewing still requires the unguessable per-tab token.
  if(intent==="release"){await db.delete(reviewReservations).where(and(eq(reviewReservations.resourceKey,key),eq(reviewReservations.actorId,admin.id),typeof token==='string'&&token?eq(reviewReservations.token,token):undefined));return Response.json({released:true,actorId:admin.id,resources:[{key,revision:liveRevision,actorId:null,actor:null,expiresAt:null}]},{headers});}
  if (typeof token!=="string" || !/^[\w-]{36}$/.test(token)) return Response.json({error:"Reserva no válida."},{status:400,headers});
  const own=and(eq(reviewReservations.resourceKey,key),eq(reviewReservations.actorId,admin.id),eq(reviewReservations.token,token));
  if (intent==="renew") {
    const result=await db.update(reviewReservations).set({expiresAt:now+120_000}).where(and(own,sql`${reviewReservations.expiresAt}>${now}`)).returning({key:reviewReservations.resourceKey});
    return Response.json({renewed:!!result.length},{status:result.length?200:409,headers});
  }
  return Response.json({error:"Acción no válida."},{status:400,headers});
}
