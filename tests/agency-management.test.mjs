import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {registerHooks} from 'node:module';
import {drizzle} from 'drizzle-orm/d1';

test('agency custody, delegation and personal ownership are enforced by real migrations and atomic service writes',async t=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+name,'utf8'));
 const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),execute(){const s=sqlite.prepare(query);if(s.columns().length)return{results:s.all(...args)};return{results:[],meta:{changes:Number(s.run(...args).changes)}};},async all(){return this.execute();},async run(){return this.execute();},async raw(){const s=sqlite.prepare(query);s.setReturnArrays(true);return s.all(...args);}});
 globalThis.__agencyDb=drizzle({prepare,async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}});
 globalThis.__agencyNotifications=[];
 const root=new URL('../',import.meta.url),data=code=>'data:text/javascript,'+encodeURIComponent(code);
 const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='@/db')return{url:data('export const getDb=async()=>globalThis.__agencyDb'),shortCircuit:true};
  if(specifier==='@/lib/admin-notifications')return{url:data('export async function createAdminNotification(value){globalThis.__agencyNotifications.push(value)}'),shortCircuit:true};
  if(specifier==='@/lib/site-settings')return{url:data('export async function getSiteSettings(){return {profile_gallery_face_blur_enabled:"enabled",site_url:"https://chile3x.invalid"}};export const siteBaseUrl="https://chile3x.invalid";'),shortCircuit:true};
  if(specifier==='@/lib/operations')return{url:data('export async function recordOperationalEvent(){}'),shortCircuit:true};
  if(specifier.startsWith('@/'))return next(new URL(specifier.slice(2)+(specifier.endsWith('.ts')?'':'.ts'),root).href,context);
  try{return next(specifier,context);}catch(e){if(/^\.{1,2}\//.test(specifier)&&context.parentURL?.startsWith('file:')&&!/\.[mc]?[jt]s$/.test(specifier))return next(specifier+'.ts',context);throw e;}
 }});
 try{
 const {readProfileSubmission,createProfile,updateProfile}=await import('../lib/profile-submission.ts');
 const {getProfileAccess,authorizedProfileBatch}=await import('../lib/profile-access.ts');
 const {inviteEscort,respondAgencyInvitation,changeAgencyMembership,requestAgencyClaim,respondAgencyClaim,verifyAgencyClaim,cancelAgencyProposal,countAgencyNotices,cancelAgencyInvitation}=await import('../lib/agency-management.ts');
 const {publicProfileCondition}=await import('../lib/public-profile-visibility.ts');
 const {profiles}=await import('../db/schema.ts');const{eq,and}=await import('drizzle-orm');
 const addUser=id=>{sqlite.prepare("INSERT INTO users(id,email,username,role,is_active,email_verified_at)VALUES(?,?,?,'advertiser',1,?)").run(id,id+'@example.invalid',id,new Date().toISOString());return{id,email:id+'@example.invalid',role:'advertiser',displayName:id,username:id};};
 const operator=addUser('agency_operator'),person=addUser('agency_person'),other=addUser('agency_other'),outsider=addUser('agency_outsider'),admin={...addUser('agency_admin'),role:'admin',accessLevel:'owner',githubLogin:'local_qa',isProtectedOwner:true};
 const form=(type='escort',name='Perfil de prueba')=>{const f=new FormData();for(const[k,v]of Object.entries({type,tier:'vip',intent:'draft',display_name:name,region:'Región del Biobío',city:'Concepción',contact_whatsapp:'56911112222',gender:'Femenino',age:'25',short_description:'Descripción de prueba local',description:'Anuncio exclusivamente local para probar autorizaciones.'}))f.set(k,v);return f;};
 const revision=id=>sqlite.prepare('SELECT revision FROM profiles WHERE id=?').get(id).revision;
 const version=id=>{const f=new FormData();f.set('review_key','profile:'+id);f.set('review_revision',String(revision(id)));return f;};
 const publish=id=>sqlite.prepare("UPDATE profiles SET status='approved' WHERE id=?").run(id);
 const read=id=>sqlite.prepare('SELECT * FROM profiles WHERE id=?').get(id);
 const create=(owner,type,name,agencyId)=>createProfile(owner,readProfileSubmission(form(type,name)),{agencyId});
 let agency,agency2,personal,custodian1,custodian2,personProfile;
 await t.test('one personal Escort plus multiple agencies and their ID-based managed Escorts, with no artificial accounts',async()=>{
  personal=await create(operator.id,'escort','Personal del operador');agency=await create(operator.id,'agency','Agencia local');agency2=await create(operator.id,'agency','Segunda agencia local');
  assert.equal(read(agency).tier,'vip');
  await assert.rejects(()=>create(operator.id,'escort','Personal duplicado'),/solo un Escort|ya tiene un anuncio Escort/);
  const before=sqlite.prepare('SELECT count(*) n FROM users').get().n;
  custodian1=await create(operator.id,'escort','Gestionada uno',agency);custodian2=await create(operator.id,'escort','Gestionada dos',agency);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM users').get().n,before);
  assert.equal(read(custodian1).agency_custodian_id,agency);assert.equal(read(custodian1).agency_origin_id,agency);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM agency_members WHERE agency_profile_id=?').get(agency).n,2);
  assert.throws(()=>sqlite.prepare('UPDATE profiles SET agency_custodian_id=NULL WHERE id=?').run(custodian1),/agency_custody_release_requires_claim|escort_profile_owner_conflict/);
  assert.throws(()=>sqlite.prepare('UPDATE profiles SET agency_custodian_id=? WHERE id=?').run(agency2,custodian1),/agency_custody_release_requires_claim/);
  assert.throws(()=>sqlite.prepare('UPDATE profiles SET trashed_at=CURRENT_TIMESTAMP WHERE id=?').run(agency),/agency_has_dependents/);
  assert.throws(()=>sqlite.prepare('DELETE FROM profiles WHERE id=?').run(agency),/FOREIGN KEY/);
 });
 await t.test('a managed Escort requires a public agency to be visible, while its draft can still be edited',async()=>{
  publish(custodian1);assert.ok(await getProfileAccess(custodian1,operator.id,'edit'));
  assert.equal((await globalThis.__agencyDb.select({id:profiles.id}).from(profiles).where(and(eq(profiles.id,custodian1),publicProfileCondition))).length,0);
  publish(agency);assert.equal((await globalThis.__agencyDb.select({id:profiles.id}).from(profiles).where(and(eq(profiles.id,custodian1),publicProfileCondition))).length,1);
  sqlite.prepare('UPDATE profiles SET owner_hidden_at=CURRENT_TIMESTAMP WHERE id=?').run(agency);
  assert.equal((await globalThis.__agencyDb.select({id:profiles.id}).from(profiles).where(and(eq(profiles.id,custodian1),publicProfileCondition))).length,0);
  sqlite.prepare('UPDATE profiles SET owner_hidden_at=NULL WHERE id=?').run(agency);
 });
 await t.test('invitations reject hidden/inactive/content-only profiles, duplicates and reinvites of existing links',async()=>{
  personProfile=await create(person.id,'escort','Titular personal');publish(personProfile);
  const invite=()=>{const f=version(agency2);f.set('escort_profile_id',personProfile);f.set('management_requested','on');f.set('documents_requested','on');f.set('message','Mensaje local de invitación');return inviteEscort(operator,agency2,f);};
  sqlite.prepare('UPDATE profiles SET owner_hidden_at=CURRENT_TIMESTAMP WHERE id=?').run(personProfile);await assert.rejects(invite,/publicado y visible/);sqlite.prepare('UPDATE profiles SET owner_hidden_at=NULL WHERE id=?').run(personProfile);
  sqlite.prepare('UPDATE users SET is_active=0 WHERE id=?').run(person.id);await assert.rejects(invite,/publicado y visible/);sqlite.prepare('UPDATE users SET is_active=1 WHERE id=?').run(person.id);
  sqlite.prepare("UPDATE profile_details SET metadata=json_set(metadata,'$.content_only','1') WHERE profile_id=?").run(personProfile);await assert.rejects(invite,/Venta solo de contenido/);sqlite.prepare("UPDATE profile_details SET metadata=json_set(metadata,'$.content_only','0') WHERE profile_id=?").run(personProfile);
  await invite();await assert.rejects(invite,/pendiente/);
  const request=sqlite.prepare('SELECT * FROM agency_membership_requests WHERE escort_profile_id=?').get(personProfile);assert.ok(request.message);assert.equal(request.management_requested,1);
  const f=version(personProfile);f.set('action','accepted');f.set('authorize_management','on');await respondAgencyInvitation(person,request.id,f);
  assert.ok(await getProfileAccess(personProfile,operator.id,'edit'));assert.equal(await getProfileAccess(personProfile,operator.id,'documents'),null);
  await assert.rejects(invite,/ya está asociado/);assert.equal(sqlite.prepare('SELECT count(*) n FROM agency_email_jobs WHERE escort_profile_id=? AND kind=\'invitation\'').get(personProfile).n,1);
 });
 await t.test('revocation blocks old editors and in-flight writes immediately, retaining ownership and association',async()=>{
  const access=await getProfileAccess(personProfile,operator.id,'edit'),oldRevision=revision(personProfile),member=sqlite.prepare('SELECT id FROM agency_members WHERE member_profile_id=?').get(personProfile);
  assert.equal(await getProfileAccess(personProfile,outsider.id,'edit'),null);
  const f=version(personProfile);f.set('action','revoke_management');await changeAgencyMembership(person,member.id,f);
  assert.equal(await getProfileAccess(personProfile,operator.id,'edit'),null);assert.equal(read(personProfile).owner_id,person.id);assert.ok(sqlite.prepare('SELECT id FROM agency_members WHERE id=?').get(member.id));
  await assert.rejects(()=>authorizedProfileBatch(access,'edit',{key:'profile:'+personProfile,revision:oldRevision},[globalThis.__agencyDb.update(profiles).set({description:'NO DEBE GUARDARSE'}).where(eq(profiles.id,personProfile))]),/cambió|collaboration_conflict/);
  assert.notEqual(read(personProfile).description,'NO DEBE GUARDARSE');
 });
 await t.test('recipient acceptance and independent administrative verification are both mandatory, preserving ID and URL',async()=>{
  const f=version(custodian1);f.set('email',other.email);const id=await requestAgencyClaim(operator,agency,custodian1,f);const initial=read(custodian1),claim=()=>sqlite.prepare('SELECT * FROM agency_profile_claims WHERE id=?').get(id);
  assert.equal(await getProfileAccess(custodian1,other.id,'edit'),null);assert.ok(await getProfileAccess(custodian1,other.id,'preview'));
  const verify=version(custodian1);verify.set('claim_revision',String(claim().revision));verify.set('confirmed','on');assert.equal(await verifyAgencyClaim(admin,id,verify),false);assert.equal(read(custodian1).owner_id,operator.id);
  const accept=version(custodian1);accept.set('claim_revision',String(claim().revision));accept.set('action','accept');accept.set('confirm_ownership','on');accept.set('keep_management','on');
  assert.equal(await respondAgencyClaim(other,id,accept),true);assert.equal(claim().status,'completed');assert.equal(read(custodian1).owner_id,other.id);assert.equal(read(custodian1).agency_custodian_id,null);assert.equal(read(custodian1).id,initial.id);assert.equal(read(custodian1).handle,initial.handle);assert.equal(read(custodian1).slug,initial.slug);
  assert.ok(await getProfileAccess(custodian1,operator.id,'edit'));assert.equal(await getProfileAccess(custodian1,operator.id,'delete'),null);assert.equal(await getProfileAccess(custodian1,operator.id,'documents'),null);
  const member=sqlite.prepare('SELECT id FROM agency_members WHERE member_profile_id=?').get(custodian1),leave=version(custodian1);leave.set('action','unlink');await changeAgencyMembership(other,member.id,leave);
  assert.equal(await getProfileAccess(custodian1,operator.id,'edit'),null);assert.ok(await getProfileAccess(custodian1,other.id,'edit'));assert.equal(read(custodian1).id,initial.id);
 });
 await t.test('claiming cannot bypass the one-personal-Escort limit and cancellation revokes private preview',async()=>{
  const f=version(custodian2);f.set('email',person.email);await assert.rejects(()=>requestAgencyClaim(operator,agency,custodian2,f),/ya tiene un Escort personal/);
  f.set('email',outsider.email);f.set('review_revision',String(revision(custodian2)));const id=await requestAgencyClaim(operator,agency,custodian2,f),c=sqlite.prepare('SELECT * FROM agency_profile_claims WHERE id=?').get(id);
  assert.ok(await getProfileAccess(custodian2,outsider.id,'preview'));const cancel=version(custodian2);cancel.set('claim_revision',String(c.revision));await cancelAgencyProposal(operator,id,cancel);assert.equal(await getProfileAccess(custodian2,outsider.id,'preview'),null);assert.equal(read(custodian2).agency_custodian_id,agency);
 });
 await t.test('self-association and multiple agencies are permitted; document grants remain explicit and revocable',async()=>{
  publish(personal);const f=version(agency2);f.set('escort_profile_id',personal);await inviteEscort(operator,agency2,f);
  const request=sqlite.prepare('SELECT * FROM agency_membership_requests WHERE escort_profile_id=?').get(personal),accept=version(personal);accept.set('action','accepted');await respondAgencyInvitation(operator,request.id,accept);
  const extraAgency=await create(outsider.id,'agency','Agencia externa local');const invite=version(extraAgency);invite.set('escort_profile_id',personProfile);await inviteEscort(outsider,extraAgency,invite);
  const req=sqlite.prepare('SELECT * FROM agency_membership_requests WHERE agency_profile_id=?').get(extraAgency),reply=version(personProfile);reply.set('action','accepted');await respondAgencyInvitation(person,req.id,reply);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM agency_members WHERE member_profile_id=?').get(personProfile).n,2);
  const member=sqlite.prepare('SELECT id FROM agency_members WHERE agency_profile_id=? AND member_profile_id=?').get(agency2,personProfile),grant=version(personProfile);grant.set('action','update_permissions');grant.set('can_manage','on');grant.set('documents_authorized','on');await changeAgencyMembership(person,member.id,grant);
  assert.ok(await getProfileAccess(personProfile,operator.id,'documents'));
  const revoke=version(personProfile);revoke.set('action','revoke_documents');await changeAgencyMembership(person,member.id,revoke);assert.equal(await getProfileAccess(personProfile,operator.id,'documents'),null);assert.ok(await getProfileAccess(personProfile,operator.id,'media'));
  const convert=form();convert.set('content_only','on');await assert.rejects(()=>updateProfile(personProfile,person.id,readProfileSubmission(convert)),/Retira las asociaciones/);
 });
 await t.test('acceptance before verification works, but edits require fresh acceptance and verification',async()=>{
  const recipient=addUser('agency_recipient'),f=version(custodian2);f.set('email',recipient.email);const id=await requestAgencyClaim(operator,agency,custodian2,f),claim=()=>sqlite.prepare('SELECT * FROM agency_profile_claims WHERE id=?').get(id);
  const accept=()=>{const f=version(custodian2);f.set('claim_revision',String(claim().revision));f.set('action','accept');f.set('confirm_ownership','on');return respondAgencyClaim(recipient,id,f);};
  assert.equal(await accept(),false);assert.equal(read(custodian2).owner_id,operator.id);
  sqlite.prepare("UPDATE profiles SET description='Cambio tras aceptación' WHERE id=?").run(custodian2);
  const verify=version(custodian2);verify.set('claim_revision',String(claim().revision));verify.set('confirmed','on');await assert.rejects(()=>verifyAgencyClaim(admin,id,verify),/cambió después/);
  assert.equal(read(custodian2).owner_id,operator.id);assert.equal(await accept(),true);assert.equal(read(custodian2).owner_id,recipient.id);
  assert.equal(await getProfileAccess(custodian2,operator.id,'edit'),null);assert.ok(await getProfileAccess(custodian2,recipient.id,'edit'));
 });
 await t.test('canceled invitations are not actionable and inactive agencies do not leave ghost notices',async()=>{
  const agency3=await create(operator.id,'agency','Tercera agencia');const f=version(agency3);f.set('escort_profile_id',personProfile);await inviteEscort(operator,agency3,f);
  assert.equal(await countAgencyNotices(person.id),1);sqlite.prepare('UPDATE users SET is_active=0 WHERE id=?').run(operator.id);assert.equal(await countAgencyNotices(person.id),0);sqlite.prepare('UPDATE users SET is_active=1 WHERE id=?').run(operator.id);
  const r=sqlite.prepare('SELECT * FROM agency_membership_requests WHERE agency_profile_id=?').get(agency3),cancel=version(agency3);cancel.set('request_id',r.id);await cancelAgencyInvitation(operator,agency3,cancel);assert.equal(await countAgencyNotices(person.id),0);
  const reply=version(personProfile);reply.set('action','accepted');await assert.rejects(()=>respondAgencyInvitation(person,r.id,reply),/atendida o venció/);
 });
 await t.test('all migrations keep referential integrity and permission changes have an attributable audit trail',async()=>{
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);assert.ok(sqlite.prepare('SELECT count(*) n FROM agency_activity_logs WHERE actor_user_id=?').get(operator.id).n>0);assert.ok(sqlite.prepare('SELECT count(*) n FROM agency_activity_logs WHERE actor_user_id=?').get(person.id).n>0);
 });
 }finally{hooks.deregister();sqlite.close();delete globalThis.__agencyDb;delete globalThis.__agencyNotifications;}
});
