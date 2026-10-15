import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { navigationProgressTarget } from '../lib/user-navigation-progress.ts';

const source = path => readFile(new URL('../'+path,import.meta.url),'utf8');
test('navigation feedback ignores same-page anchors, external apps, downloads and administrative destinations',()=>{
 const current='https://chile3x.cl/escorts?ciudad=Vi%C3%B1a%20del%20Mar';
 for(const href of ['#vip',current,'https://example.test/','mailto:a@example.test','tel:123','javascript:alert(1)','/admin','/admin/medios','/api/auth/logout','/media/id','/contenido/id','/foro']) assert.equal(navigationProgressTarget(href,current),null,href);
 assert.equal(navigationProgressTarget('/perfil/@lalita',current),'/perfil/@lalita');
 assert.equal(navigationProgressTarget('/venta-contenido?ciudad=Vi%C3%B1a%20del%20Mar',current),'/venta-contenido?ciudad=Vi%C3%B1a+del+Mar');
});

test('application links share demand-only navigation and feedback does not intercept requests or show for administrators',async()=>{
 const files=[];async function walk(path){for(const entry of await readdir(new URL('../'+path,import.meta.url),{withFileTypes:true})){const next=path+'/'+entry.name;if(entry.isDirectory())await walk(next);else if(next.endsWith('.tsx'))files.push(next);}}await walk('app');
 for(const file of files.filter(file=>file!=='app/NavigationLink.tsx'))assert.doesNotMatch(await source(file),/import Link from "next\/link"/,file);
 const [progress,layout,links,filters]=await Promise.all(['app/UserNavigationProgress.tsx','app/layout.tsx','app/NavigationLink.tsx','app/directorio/DirectoryFilters.tsx'].map(source));
 assert.match(layout,/enabled=\{sessionView.mode !== "admin"\}/);assert.match(progress,/12_000/);assert.match(progress,/pageshow/);assert.match(progress,/target.current ===/);assert.doesNotMatch(progress,/fetch\(|router\.(?:push|replace)|location\.(?:reload|assign)/);
 assert.match(links,/event.defaultPrevented/);assert.match(links,/props.target !== "_self"/);assert.match(filters,/beginUserNavigation\(href\)/);
});

test('real media and engagement reads keep all gallery media but hydrate just the authorized cover for cards',async()=>{
 const sqlite=new DatabaseSync(':memory:');let queries=0,roundTrips=0;
 sqlite.exec(`CREATE TABLE profile_media(id TEXT PRIMARY KEY,profile_id TEXT,media_type TEXT,r2_key TEXT,byte_size INTEGER,content_type TEXT,alt_text TEXT,moderation_status TEXT,visibility TEXT,is_profile_photo INTEGER,sort_order INTEGER,created_at TEXT);
 CREATE TABLE favorites(id TEXT,user_id TEXT,profile_id TEXT);CREATE TABLE profile_likes(id TEXT,user_id TEXT,profile_id TEXT);`);
 const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),execute(){queries++;return {results:sqlite.prepare(sql).all(...args)}},async raw(){queries++;roundTrips++;const statement=sqlite.prepare(sql);statement.setReturnArrays(true);return statement.all(...args)},async all(){queries++;roundTrips++;return {results:sqlite.prepare(sql).all(...args)}}});
 globalThis.__navigationPerfDb=drizzle({prepare,async batch(statements){roundTrips++;return statements.map(statement=>statement.execute());}});
 const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='@/db')return {url:'data:text/javascript,export const getDb=async()=>globalThis.__navigationPerfDb',shortCircuit:true};
  if(specifier.startsWith('@/'))return {url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
 }});
 try {
  const {getApprovedMediaForProfiles,getMediaUsage}=await import('../lib/media.ts');
  const {getProfileEngagement,getApprovedReviewsPage}=await import('../lib/profile-interactions.ts');
  const schema=await import('../db/schema.ts');
  for(const name of ['forumAttachments','profileStatuses','profileVerificationFiles','newsMedia','profileReportEvidence','exclusiveContentMedia','sponsors','profiles','profileDetails','profileTags','profileServices','agencyMembers','accountPresence','blockedProfiles','profileViews','users','reviews']) {
   const table=getTableConfig(schema[name]);sqlite.exec(`CREATE TABLE IF NOT EXISTS "${table.name}" (${table.columns.map(column=>`"${column.name}" ${column.getSQLType()}`).join(',')})`);
  }
  assert.deepEqual(await getMediaUsage(),{bytes:0,files:0});
  const insert=sqlite.prepare('INSERT INTO profile_media VALUES(?,?,?,?,100,?,NULL,?,?,?,?,?)');
  for(const [id,profile,type,status,visibility,cover,sort] of [['first','p1','image','approved','public',0,0],['cover','p1','image','approved','public',1,9],['pending','p1','image','pending','public',1,-1],['private','p1','image','approved','exclusive',1,-2],['video','p1','video','approved','public',0,1],['fallback','p2','image','approved','public',0,1]])insert.run(id,profile,type,id,type==='image'?'image/jpeg':'video/mp4',status,visibility,cover,sort,'2026-10-15');
  const cards=await getApprovedMediaForProfiles(['p1','p2'],true);
  assert.deepEqual(cards.get('p1').map(row=>row.id),['cover']);assert.deepEqual(cards.get('p2').map(row=>row.id),['fallback']);
  assert.deepEqual((await getApprovedMediaForProfiles(['p1'])).get('p1').map(row=>row.id),['first','video','cover']);
  const previous=queries;assert.equal((await getApprovedMediaForProfiles([],true)).size,0);assert.equal(queries,previous);
  sqlite.exec("INSERT INTO favorites VALUES('f1','u1','p1'),('f2','u2','p1'),('f3','u1','p2');INSERT INTO profile_likes VALUES('l1','u1','p1');");
  for(const [user,expectedFavorite,expectedLike] of [[undefined,false,false],['u1',true,true],['u2',true,false],['u3',false,false]]){
   const count=queries;assert.deepEqual(await getProfileEngagement('p1',user),{favoritesCount:2,likesCount:1,viewerHasFavorite:expectedFavorite,viewerHasLike:expectedLike});assert.equal(queries-count,1,'all counters and visitor flags use exactly one query');
  }
  assert.deepEqual(await getProfileEngagement("p1' OR 1=1 --",'u1'),{favoritesCount:0,likesCount:0,viewerHasFavorite:false,viewerHasLike:false});
  for(const name of ['forum_attachments','profile_statuses','profile_verification_files','news_media','profile_report_evidence','exclusive_content_media'])sqlite.exec(`INSERT INTO ${name}(byte_size) VALUES(100)`);
  sqlite.exec("INSERT INTO sponsors(background_byte_size,logo_byte_size,logo_r2_key) VALUES(200,50,'logo'),(200,0,NULL)");
  const quotaTrips=roundTrips;assert.deepEqual(await getMediaUsage(),{bytes:1550,files:14});assert.equal(roundTrips-quotaTrips,1,'all eight media sources use one request, preserving migrated-media exclusions');
  sqlite.exec("INSERT INTO users(id,display_name,is_active) VALUES('u1','Alias público',1);INSERT INTO reviews(id,author_id,profile_id,body,status,created_at) VALUES('r1','u1','p1','Approved','approved','2026-10-15'),('r2','u1','p1','Private','pending','2026-10-15')");
  const reviewTrips=roundTrips;const reviews=await getApprovedReviewsPage('p1');assert.equal(reviews.total,1);assert.deepEqual(reviews.reviews.map(row=>[row.body,row.authorName]),[['Approved','Alias público']]);assert.equal(roundTrips-reviewTrips,1,'review page and count are one read batch');
  sqlite.exec("INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,region,city,tier) VALUES('p1','u1','escort','approved','p1','p1','Profile 1','Biobío','Concepción','vip'),('p2','u1','agency','approved','p2','p2','Agency','Biobío','Concepción','vip');INSERT INTO profile_tags(id,profile_id,tag) VALUES('t1','p1','venta-contenido');INSERT INTO profile_services(id,profile_id,service,kind) VALUES('s1','p1','Videollamada','included');INSERT INTO agency_members(id,agency_profile_id,member_profile_id) VALUES('a1','p2','p1')");
  const {getPublicProfiles}=await import('../lib/directory.ts');
  const profileTrips=roundTrips;const full=await getPublicProfiles({profileIds:['p1'],includeAssociations:true});assert.equal(roundTrips-profileTrips,3,'profile + relations batch + media, not six separate relation requests');
  assert.deepEqual(full[0].tags,['venta-contenido']);assert.deepEqual(full[0].servicesIncluded,['Videollamada']);assert.deepEqual(full[0].agencyIds,['p2']);assert.deepEqual(full[0].media.map(row=>row.id),['first','video','cover']);
  const cardsOnly=await getPublicProfiles({profileIds:['p1'],coverOnly:true});assert.deepEqual(cardsOnly[0].media.map(row=>row.id),['cover']);assert.deepEqual(cardsOnly[0].agencyIds,[]);
 }finally{hooks.deregister();delete globalThis.__navigationPerfDb;sqlite.close();}
});
