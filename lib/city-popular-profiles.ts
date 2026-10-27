import { and,count,desc,eq,ne,notExists,sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { blockedProfiles,profileDetails,profiles,profileViews } from '@/db/schema';
import { publicProfileCondition } from '@/lib/public-profile-visibility';
import { publicProfileAge } from '@/lib/profile-age';
import { isContentOnly,publicProfileTypeLabel } from '@/lib/profile-content-category';
import { profilePublicPath } from '@/lib/profile';

/** One bounded SQL query. No galleries, stories, services, contacts or account
 * data are hydrated for the five footer recommendations. Counts remain private. */
export async function getCityPopularProfiles(city:string,currentId:string,viewerId?:string){
 const db=await getDb();
 const rows=await db.select({id:profiles.id,slug:profiles.slug,handle:profiles.handle,type:profiles.type,name:profiles.displayName,city:profiles.city,region:profiles.region,metadata:profileDetails.metadata,total:count(profileViews.id),imageId:sql<string|null>`(select pm.id from profile_media pm where pm.profile_id=${profiles.id} and pm.visibility='public' and pm.moderation_status='approved' and pm.media_type='image' order by pm.is_profile_photo desc,pm.sort_order,pm.id limit 1)`})
  .from(profiles).leftJoin(profileDetails,eq(profileDetails.profileId,profiles.id))
  .leftJoin(profileViews,and(eq(profileViews.profileId,profiles.id),sql`${profileViews.viewedAt}>=datetime('now','-24 hours')`,sql`${profileViews.viewedAt}<=CURRENT_TIMESTAMP`))
  .where(and(publicProfileCondition,eq(profiles.city,city),ne(profiles.id,currentId),eq(profiles.isDemo,false),viewerId?notExists(db.select({id:blockedProfiles.id}).from(blockedProfiles).where(and(eq(blockedProfiles.userId,viewerId),eq(blockedProfiles.profileId,profiles.id)))):undefined))
  .groupBy(profiles.id).orderBy(desc(count(profileViews.id)),desc(profiles.updatedAt),profiles.id).limit(5);
 const ranked=rows.some(row=>Number(row.total)>0);
 const cards=(ranked?rows.filter(row=>Number(row.total)>0):rows).map(row=>{
  let metadata:Record<string,string>={};try{const parsed=JSON.parse(row.metadata??'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))metadata=parsed;}catch{/* No private details are needed. */}
  const typeData={type:row.type,details:{metadata}};
  return {id:row.id,name:row.name,city:row.city,region:row.region,href:profilePublicPath(row),typeLabel:publicProfileTypeLabel(typeData),contentOnly:isContentOnly(typeData),age:publicProfileAge(row.type,metadata),imageId:row.imageId};
 });
 return {ranked,cards};
}
