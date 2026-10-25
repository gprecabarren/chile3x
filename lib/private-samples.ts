import { and,asc,desc,eq,isNull,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { collaborationGuards,listingPeriods,privateProfileSamples,privateSampleMedia,profileDetails,profileMedia,profileServices,profileTags,profiles,users } from "@/db/schema";
import { adminHasCapability } from "./admin-permissions";
import type { AdminUser } from "./auth";
import { guardedBatch,type ReviewVersion,CollaborationConflict } from "./collaboration";
import { readProfileSubmission,resolveProfileHandle,ProfileValidationError,validateProfileTravelDates } from "./profile-submission";
import { sampleForm,sampleFormJson,sampleIsAvailable,sampleTokenHash,SAMPLE_ID,PRIVATE_SAMPLES_ENABLED } from "./private-sample-policy";
import { slugify } from "./profile";
import type { PublicProfile } from "./directory";

export function canManageSamples(admin:AdminUser|null) { return PRIVATE_SAMPLES_ENABLED&&adminHasCapability(admin,"accounts.manage")&&adminHasCapability(admin,"profiles.moderate"); }
export async function getPrivateSample(id:string) {
  if(!PRIVATE_SAMPLES_ENABLED||!SAMPLE_ID.test(id))return null;
  return (await (await getDb()).select().from(privateProfileSamples).where(eq(privateProfileSamples.id,id)).limit(1))[0]??null;
}
export async function listPrivateSamples() {
  return (await getDb()).select({id:privateProfileSamples.id,displayName:privateProfileSamples.displayName,revision:privateProfileSamples.revision,expiresAt:privateProfileSamples.expiresAt,migratedAt:privateProfileSamples.migratedAt,migratedProfileId:privateProfileSamples.migratedProfileId,updatedAt:privateProfileSamples.updatedAt,shared:sql<boolean>`${privateProfileSamples.tokenHash} is not null`}).from(privateProfileSamples).orderBy(desc(privateProfileSamples.updatedAt)).limit(100);
}
export async function sampleMedia(id:string) { return (await getDb()).select().from(privateSampleMedia).where(eq(privateSampleMedia.sampleId,id)).orderBy(asc(privateSampleMedia.sortOrder)); }
export async function canOpenSample(id:string,token:string|undefined) {
  if(!token)return null;
  const hash=await sampleTokenHash(token);if(!hash)return null;
  const row=await getPrivateSample(id);
  // Compare the hash using Web Crypto's constant-time verification primitive.
  if(!row||!sampleIsAvailable(row))return null;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(row.tokenHash!),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
  const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("sample-access"));
  const candidate=await crypto.subtle.importKey("raw",new TextEncoder().encode(hash),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  return await crypto.subtle.verify("HMAC",candidate,signature,new TextEncoder().encode("sample-access"))?row:null;
}
export function sampleSubmission(row:{formJson:string}) { return readProfileSubmission(sampleForm(row.formJson), {travelDateValidation:"stored"}); }
export function sampleInitial(row:{formJson:string}) {
  const s=sampleSubmission(row);return {...s,comuna:s.comuna??"",contactWhatsapp:s.contactWhatsapp??"",contactTelegram:s.contactTelegram??"",details:{...s.details,contactPhone:s.details.contactPhone??"",contactEmail:s.details.contactEmail??"",referenceLocation:s.details.referenceLocation??"",schedule:s.details.schedule??"",metadata:JSON.parse(s.details.metadata) as Record<string,string>}};
}
export async function createPrivateSample(form:FormData,admin:AdminUser) {
  if(form.get("sample_permission")!=="on")throw new ProfileValidationError("Confirma que tienes autorización para preparar esta muestra y usar sus fotos.");
  const formJson=sampleFormJson(form),s=readProfileSubmission(sampleForm(formJson));
  const id=`sam_${crypto.randomUUID()}`;
  await (await getDb()).insert(privateProfileSamples).values({id,displayName:s.displayName,formJson,createdBy:admin.id,expiresAt:Date.now()+7*86_400_000});
  return id;
}
export async function updatePrivateSample(id:string,form:FormData,version:ReviewVersion,admin:AdminUser) {
  const formJson=sampleFormJson(form),s=readProfileSubmission(sampleForm(formJson), {travelDateValidation:"stored"});
  const existing=await getPrivateSample(id);
  if(!existing||existing.migratedAt)throw new CollaborationConflict();
  validateProfileTravelDates(s,sampleSubmission(existing).details.metadata);
  await guardedBatch(version,[(await getDb()).update(privateProfileSamples).set({displayName:s.displayName,formJson,updatedAt:new Date().toISOString()}).where(and(eq(privateProfileSamples.id,id),isNull(privateProfileSamples.migratedAt)))],admin.id);
}
export async function privateSampleView(row:NonNullable<Awaited<ReturnType<typeof getPrivateSample>>>):Promise<PublicProfile> {
  const s=sampleSubmission(row),files=await sampleMedia(row.id);
  return {id:row.id,slug:row.id,handle:s.handle,type:"escort",status:"draft",isPublic:false,displayName:s.displayName,shortDescription:s.shortDescription,description:s.description,region:s.region,city:s.city,comuna:s.comuna,contactWhatsapp:s.contactWhatsapp,contactTelegram:s.contactTelegram,tier:s.tier,verificationStatus:"unreviewed",verifiedAt:null,healthReviewStatus:"not_requested",isFeatured:false,isDemo:false,isOnline:false,updatedAt:row.updatedAt,details:{...s.details,metadata:JSON.parse(s.details.metadata)},tags:s.tags,servicesIncluded:s.servicesIncluded,servicesAdditional:s.servicesAdditional,media:files.map(file=>({id:file.id,url:`/muestra/${row.id}/archivo/${file.id}`,altText:`Foto de ${s.displayName}`,mediaType:file.mediaType,contentType:file.contentType,isProfilePhoto:file.isProfilePhoto})),agencyIds:[],memberIds:[]};
}
export async function migratePrivateSample(row:NonNullable<Awaited<ReturnType<typeof getPrivateSample>>>,email:string,version:ReviewVersion,admin:AdminUser) {
  if(row.migratedAt)throw new CollaborationConflict();
  const db=await getDb(),owner=(await db.select().from(users).where(eq(users.email,email.trim().toLowerCase())).limit(1))[0];
  if(!owner||owner.role==="admin"||!owner.isActive||owner.selfDisabledAt||owner.adminDisabledAt)throw new ProfileValidationError("Selecciona el correo de una cuenta de anunciante activa. Puedes crearla desde Cuentas y volver aquí.");
  if(!owner.emailVerifiedAt&&!owner.emailVerificationExemptAt)throw new ProfileValidationError("La cuenta debe verificar su correo antes de publicar la muestra.");
  const s=readProfileSubmission(sampleForm(row.formJson)),files=await sampleMedia(row.id);
  if(!files.some(f=>f.mediaType==="image"))throw new ProfileValidationError("Sube al menos una foto antes de publicar.");
  const handle=await resolveProfileHandle(s.handle,s.displayName),id=`prf_${crypto.randomUUID()}`,now=new Date().toISOString(),guard=crypto.randomUUID();
  const tags=s.tags.map(tag=>({id:`tag_${crypto.randomUUID()}`,profileId:id,tag}));
  const services=[...s.servicesIncluded.map(service=>({id:`srv_${crypto.randomUUID()}`,profileId:id,service,kind:"included" as const})),...s.servicesAdditional.map(service=>({id:`srv_${crypto.randomUUID()}`,profileId:id,service,kind:"additional" as const}))];
  // The sample revision, account state, new listing and ownership transfer
  // commit in ONE D1 batch. No half-published listing or duplicate migration.
  validateProfileTravelDates(s);
  await guardedBatch(version,[
    db.insert(collaborationGuards).values({id:guard,allowed:sql`case when exists(select 1 from users where id=${owner.id} and revision=${owner.revision} and is_active=1 and role!='admin' and self_disabled_at is null and admin_disabled_at is null) and exists(select 1 from private_profile_samples where id=${row.id} and migrated_at is null) then 1 else 0 end`}),
    db.insert(profiles).values({id,ownerId:owner.id,type:"escort",status:"approved",slug:`${slugify(s.displayName)}-${crypto.randomUUID().slice(0,8)}`,handle,displayName:s.displayName,shortDescription:s.shortDescription,description:s.description,region:s.region,city:s.city,comuna:s.comuna,contactWhatsapp:s.contactWhatsapp,contactTelegram:s.contactTelegram,tier:s.tier,creationSource:"admin",createdByAdminId:admin.id,createdByAdminLogin:admin.githubLogin,verificationStatus:"unreviewed",updatedAt:now}),
    db.insert(profileDetails).values({profileId:id,...s.details,updatedAt:now}),
    ...(tags.length?[db.insert(profileTags).values(tags)]:[]),
    ...(services.length?[db.insert(profileServices).values(services)]:[]),
    db.insert(profileMedia).values(files.map(file=>({id:`med_${crypto.randomUUID()}`,profileId:id,r2Key:file.r2Key,byteSize:file.byteSize,contentType:file.contentType,mediaType:file.mediaType,moderationStatus:"approved" as const,visibility:"public" as const,isProfilePhoto:file.isProfilePhoto,sortOrder:file.sortOrder}))),
    db.insert(listingPeriods).values({id:`per_${crypto.randomUUID()}`,profileId:id,planName:"Cortesía inicial",startsAt:now,endsAt:new Date(Date.now()+30*86_400_000).toISOString(),status:"active"}),
    db.update(users).set({role:"advertiser"}).where(and(eq(users.id,owner.id),eq(users.role,"visitor"))),
    // Remove sample ownership without deleting the R2 objects now owned by the listing.
    db.delete(privateSampleMedia).where(eq(privateSampleMedia.sampleId,row.id)),
    db.update(privateProfileSamples).set({migratedProfileId:id,migratedAt:now,tokenHash:null,formJson:"[]",expiresAt:Date.now(),updatedAt:now}).where(eq(privateProfileSamples.id,row.id)),
    db.delete(collaborationGuards).where(eq(collaborationGuards.id,guard)),
  ],admin.id);
  return id;
}
