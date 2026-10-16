import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { legalHref,validateLegalDocument } from '../lib/legal-document.ts';
import { readBoundedJson,RequestBodyError } from '../lib/bounded-json.ts';
import { DEFAULT_LEGAL_DOCUMENTS } from '../lib/legal-defaults.ts';
import { storedChileanDay } from '../lib/chile-day.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('block conversion preserves every published legal section, paragraph, list and source',()=>{
 const original=JSON.parse(execFileSync(process.execPath,['scripts/export-legal-defaults.mjs','9796fdd'],{encoding:'utf8',windowsHide:true}));
 assert.deepEqual(DEFAULT_LEGAL_DOCUMENTS,original);
 for(const document of Object.values(original))assert.deepEqual(validateLegalDocument(document,true),document);
});
test('legal blocks are bounded, have stable unique anchors, and never accept executable links',()=>{
 assert.equal(storedChileanDay('2026-10-14'),'2026-10-14');assert.equal(storedChileanDay('2026-10-17T01:30:00Z'),'2026-10-16');
 for(const href of ['javascript:alert(1)','data:text/html,x','//evil.invalid','https://u:p@evil.invalid','/\\evil.invalid','\nhttps://example.invalid'])assert.equal(legalHref(href),null);
 for(const href of ['/contacto','#contacto','https://example.invalid/info','mailto:equipo@example.invalid'])assert.ok(legalHref(href));
 const valid=()=>structuredClone(DEFAULT_LEGAL_DOCUMENTS.terms);
 let doc=valid();doc.sections[0].blocks[0].text='[x](javascript:alert)';assert.throws(()=>validateLegalDocument(doc,true),/enlace/);
 doc=valid();doc.sections.push(doc.sections[0]);assert.throws(()=>validateLegalDocument(doc,true),/único/);
 doc=valid();doc.sections[0].blocks[0].text='';assert.throws(()=>validateLegalDocument(doc,true),/vacío/);assert.ok(validateLegalDocument(doc));
 doc=valid();doc.title='x'.repeat(161);assert.throws(()=>validateLegalDocument(doc,true),/título/);
 doc=valid();doc.sections[0].blocks[0].text='<script>alert(1)</script>';assert.equal(validateLegalDocument(doc,true).sections[0].blocks[0].text,doc.sections[0].blocks[0].text);
});
test('JSON bodies are limited before buffering and malformed payloads have useful statuses',async()=>{
 assert.deepEqual(await readBoundedJson(new Request('https://example.invalid',{method:'POST',headers:{'content-type':'application/json'},body:'{"x":1}'})),{x:1});
 for(const [body,headers,status,max]of [['{}',{},415],['{',{'content-type':'application/json'},400],['"123456789"',{'content-type':'application/json'},413,5]])await assert.rejects(readBoundedJson(new Request('https://example.invalid',{method:'POST',headers,body}),max),error=>error instanceof RequestBodyError&&error.status===status);
});
test('SQLite exercises local ranking, publication isolation, revisions, permission checks and rollback',async t=>{
 const sqlite=new DatabaseSync(':memory:');let queries=0;
 const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),execute(){queries++;const statement=sqlite.prepare(query);if(statement.columns().length)return {results:statement.all(...args)};return {results:[],meta:{changes:Number(statement.run(...args).changes)}};},async all(){return this.execute();},async raw(){queries++;const statement=sqlite.prepare(query);statement.setReturnArrays(true);return statement.all(...args);}});
 globalThis.__legalCityDb=drizzle({prepare,async batch(statements){sqlite.exec('BEGIN');try{const values=statements.map(s=>s.execute());sqlite.exec('COMMIT');return values;}catch(error){sqlite.exec('ROLLBACK');throw error;}}});
 globalThis.__legalCityAdmin={id:'admin_a',accessLevel:'administrator'};
 const hooks=registerHooks({resolve(specifier,context,next){
  const stubs={'@/db':'export const getDb=async()=>globalThis.__legalCityDb;','@/lib/auth':'export const getCurrentAdmin=async()=>globalThis.__legalCityAdmin;export const assertSameOrigin=()=>{};','@/lib/admin-audit':'export const recordAdminAudit=async()=>true;'};
  if(stubs[specifier])return {url:'data:text/javascript,'+encodeURIComponent(stubs[specifier]),shortCircuit:true};
  if(specifier==='@/lib/legal-defaults')return next(new URL('../lib/legal-defaults.ts',import.meta.url).href,context);
  if(specifier==='next/server')return next('next/server.js',context);
  if(specifier.startsWith('@/'))return {url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
 }});
 try{
  const schema=await import('../db/schema.ts');
  for(const table of Object.values(schema)){let config;try{config=getTableConfig(table);}catch{continue;}
   if(['collaboration_guards','review_reservations','settings_revision','legal_documents','legal_document_versions','account_legal_acceptances'].includes(config.name))continue;
   sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${config.columns.filter(c=>c.name!=='revision').map(c=>`"${c.name}" ${c.getSQLType()}${c.primary?' PRIMARY KEY':''}`).join(',')})`);
  }
  sqlite.exec(await source('drizzle/0056_admin_collaboration.sql'));sqlite.exec(await source('drizzle/0057_legal_documents_and_city_popularity.sql'));sqlite.exec(await source('drizzle/0058_city_recommendation_indexes.sql'));
  sqlite.exec("INSERT INTO users(id,email,display_name,is_active,role) VALUES('owner','owner@example.invalid','Owner',1,'advertiser'),('off','off@example.invalid','Off',0,'advertiser');");
  const add=(id,options={})=>{sqlite.prepare('INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,city,is_demo,owner_hidden_at,trashed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,options.owner??'owner',options.type??'escort',options.status??'approved',id,id,id,options.city??'Concepción',options.demo??0,options.hidden??null,options.trashed??null,'2026-10-01');sqlite.prepare('INSERT INTO profile_details(profile_id,metadata) VALUES(?,?)').run(id,JSON.stringify({age:'23',...(options.content?{content_only:'1'}:{})}));};
  for(let i=1;i<=7;i++)add('p'+i,{...(i===2?{type:'rental'}:{}),...(i===3?{type:'agency'}:{}),...(i===4?{content:true}:{})});
  add('self');add('pending',{status:'pending'});add('demo',{demo:1});add('hidden',{hidden:'2026-10-01'});add('trash',{trashed:'2026-10-01'});add('inactive',{owner:'off'});add('othercity',{city:'Talca'});
  for(const id of ['self','pending','demo','hidden','trash','inactive','othercity','p1','p2','p3','p4','p5','p6'])for(let i=0;i<(id==='p1'?10:4);i++)sqlite.prepare("INSERT INTO profile_views(id,profile_id,viewer_key,viewed_on,viewed_at) VALUES(?,?,?,'2026-10-16',datetime('now','-1 hour'))").run(id+'v'+i,id,'v'+i);
  sqlite.exec("INSERT INTO profile_views(id,profile_id,viewed_at) VALUES('old','p7',datetime('now','-25 hours'));INSERT INTO profile_media(id,profile_id,media_type,visibility,moderation_status,is_profile_photo,sort_order) VALUES('private','p1','image','private','approved',1,0),('pending-photo','p1','image','public','pending',1,0),('public-photo','p1','image','public','approved',0,1)");
  const {getCityPopularProfiles}=await import('../lib/city-popular-profiles.ts');
  await t.test('only five public local real profiles are ranked, using recent visits and approved covers',async()=>{
   queries=0;const result=await getCityPopularProfiles('Concepción','self');assert.equal(queries,1);assert.equal(result.ranked,true);assert.equal(result.cards.length,5);assert.equal(result.cards[0].id,'p1');assert.equal(result.cards[0].imageId,'public-photo');assert.ok(result.cards.every(card=>/^p[1-6]$/.test(card.id)));assert.equal(JSON.stringify(result).includes('viewer_key'),false);assert.equal('total' in result.cards[0],false);
   assert.equal(result.cards.find(c=>c.id==='p2').typeLabel,'Arriendo');assert.equal(result.cards.find(c=>c.id==='p3').typeLabel,'Agencia');assert.equal(result.cards.find(c=>c.id==='p4').typeLabel,'Venta de contenido');
  });
  await t.test('viewer blocks and the current listing never leak into local recommendations',async()=>{
   sqlite.exec("INSERT INTO blocked_profiles(id,user_id,profile_id) VALUES('block','owner','p1')");const result=await getCityPopularProfiles('Concepción','self','owner');assert.ok(result.cards.every(c=>c.id!=='p1'&&c.id!=='self'));
  });
  await t.test('no recent views produces an honest local fallback, and other cities stay empty',async()=>{
   sqlite.exec('DELETE FROM profile_views');assert.equal((await getCityPopularProfiles('Concepción','self')).ranked,false);assert.deepEqual((await getCityPopularProfiles('Iquique','self')).cards,[]);
  });
  const legal=await import('../lib/legal-documents.ts');const {currentRevision,CollaborationConflict}=await import('../lib/collaboration.ts');
  const version=async()=>({key:'legal:terms',revision:await currentRevision('legal:terms')});const draft=structuredClone(DEFAULT_LEGAL_DOCUMENTS.terms);draft.sections[0].blocks[0].text='Solo borrador local';
  await t.test('saving a draft cannot alter the public text or version',async()=>{
   const previous=await legal.getPublishedLegalDocument('terms');await legal.saveLegalDocument('terms',draft,'draft',await version(),'admin_a');const after=await legal.getPublishedLegalDocument('terms');assert.deepEqual(after,previous);assert.equal((await legal.getAdminLegalDocument('terms')).document.sections[0].blocks[0].text,'Solo borrador local');
  });
  await t.test('publishing is atomic, keeps historical content and rejects a simultaneous stale save',async()=>{
   const reviewed=await version();const result=await legal.saveLegalDocument('terms',draft,'publish',reviewed,'admin_a');assert.notEqual(result.version,'2026.10.14.3');assert.equal(result.revision,reviewed.revision+1);assert.equal((await legal.getPublishedLegalDocument('terms')).document.sections[0].blocks[0].text,'Solo borrador local');assert.equal(sqlite.prepare('SELECT count(*) n FROM legal_document_versions').get().n,2);
   await assert.rejects(legal.saveLegalDocument('terms',DEFAULT_LEGAL_DOCUMENTS.terms,'publish',reviewed,'admin_b'),CollaborationConflict);assert.equal(sqlite.prepare('SELECT count(*) n FROM legal_document_versions').get().n,2);assert.equal(sqlite.prepare("SELECT published_by FROM legal_document_versions WHERE version='2026.10.14.3'").get().published_by,null);
  });
  await t.test('discard restores published content without changing its version',async()=>{
   await legal.saveLegalDocument('terms',DEFAULT_LEGAL_DOCUMENTS.terms,'draft',await version(),'admin_a');const saved=await legal.saveLegalDocument('terms',draft,'discard',await version(),'admin_a');assert.equal(saved.hasDraft,false);assert.equal(saved.document.sections[0].blocks[0].text,'Solo borrador local');
  });
  await t.test('real route restricts readers and writers and requires explicit publication confirmation',async()=>{
   const route=await import('../app/api/admin/documentos-legales/[document]/route.ts');const params={params:Promise.resolve({document:'terms'})};
   globalThis.__legalCityAdmin={id:'mod',accessLevel:'moderator'};assert.equal((await route.GET(new Request('https://example.invalid'),params)).status,403);assert.equal((await route.POST(new Request('https://example.invalid',{method:'POST'}),params)).status,403);
   globalThis.__legalCityAdmin=null;assert.equal((await route.GET(new Request('https://example.invalid'),params)).status,401);
   globalThis.__legalCityAdmin={id:'admin_a',accessLevel:'administrator'};assert.equal((await route.POST(new Request('https://example.invalid',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intent:'publish',document:draft})}),params)).status,400);
  });
 }finally{hooks.deregister();sqlite.close();delete globalThis.__legalCityDb;delete globalThis.__legalCityAdmin;}
});
test('SEO and loading contracts keep the footer server-rendered and public legal data separate',async()=>{
 const profile=await source('app/perfil/[slug]/page.tsx'),block=await source('app/perfil/CityPopularProfiles.tsx'),editor=await source('app/admin/documentos-legales/LegalEditor.tsx');
 assert.match(profile,/<Suspense fallback=\{<CityPopularFallback/);assert.ok(profile.lastIndexOf('<CityPopularProfiles')>profile.indexOf('<CityAlertSignup'));
 assert.doesNotMatch(block,/use client|<h1|aggregateRating|dangerouslySetInnerHTML/);assert.match(block,/loading="lazy"/);assert.match(block,/prefetch=\{false\}/);assert.match(await source('app/perfil/popular-city.css'),/height:88px/);
 assert.doesNotMatch(await source('app/legal/LegalDocumentContent.tsx'),/dangerouslySetInnerHTML/);assert.match(editor,/if\(!response.ok\)/);assert.match(editor,/beforeunload/);
 const register=await source('app/api/auth/register/route.ts');assert.match(register,/legal_updated/);assert.match(register,/db.insert\(accountLegalAcceptances\)/);assert.match(await source('app/sitemap.ts'),/legal\.terms\.updatedAt/);
});
