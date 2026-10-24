import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/d1';
import {canPublishAccountStories,accountStoryUnavailableReason,availableStoryProfilesFirst} from '../lib/account-stories-policy.ts';
import {actionIconForLabel} from '../lib/action-icon-policy.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('story availability requires published and visible; sorting does not mutate the source',()=>{
 const rows=['pending','draft','approved','rejected','paused','expired'].map((status,index)=>({id:String(index),status,ownerHiddenAt:null}));rows.push({id:'hidden',status:'approved',ownerHiddenAt:'2026-10-01'});
 assert.deepEqual(rows.filter(canPublishAccountStories).map(row=>row.id),['2']);
 assert.equal(availableStoryProfilesFirst(rows)[0].id,'2');assert.equal(rows[0].id,'0');
 for(const row of rows)assert.equal(accountStoryUnavailableReason(row)===null,canPublishAccountStories(row));
});

test('account story summary isolates owners, trash and expiration with two bounded queries, including all media kinds',async()=>{
 const sqlite=new DatabaseSync(':memory:');let queries=0;
 sqlite.exec(`CREATE TABLE profiles(id TEXT,slug TEXT,handle TEXT,display_name TEXT,type TEXT,status TEXT,city TEXT,region TEXT,updated_at TEXT,owner_hidden_at TEXT,owner_id TEXT,trashed_at TEXT);
 CREATE TABLE profile_details(profile_id TEXT,metadata TEXT);CREATE TABLE profile_statuses(id TEXT,profile_id TEXT,story_type TEXT,created_at TEXT,expires_at TEXT);`);
 const insert=sqlite.prepare("INSERT INTO profiles VALUES(?,?,?,?,'escort',?,'Concepción','Biobío','2026-10-19',?,?,?)");
 for(const [id,owner,status,trash,hidden] of [['visible','a','approved',null,null],['pending','a','pending',null,null],['hidden','a','approved',null,'2026-10-19'],['trash','a','approved','2026-10-19',null],['foreign','b','approved',null,null]])insert.run(id,id,id,id,status,hidden,owner,trash);
 sqlite.exec(`INSERT INTO profile_details VALUES('visible','{"content_only":"1"}'),('pending','invalid legacy json');`);
 const story=sqlite.prepare('INSERT INTO profile_statuses VALUES(?,?,?,?,?)');
 for(const [id,profile,type,expiry] of [['t','visible','text','2999-01-01'],['i','visible','image','2999-01-01'],['v','visible','video','2999-01-01'],['p','pending','text','2999-01-01'],['old','visible','text','2000-01-01'],['trash','trash','text','2999-01-01'],['other','foreign','text','2999-01-01']])story.run(id,profile,type,'2026-10-19 01:02:00',expiry);
 const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),async raw(){queries++;const statement=sqlite.prepare(sql);statement.setReturnArrays(true);return statement.all(...args)}});
 globalThis.__storyOverviewDb=drizzle({prepare});globalThis.__storyOverviewUser={id:'a'};
 const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='@/db')return {url:'data:text/javascript,export const getDb=async()=>globalThis.__storyOverviewDb',shortCircuit:true};
  if(specifier==='@/lib/auth')return {url:'data:text/javascript,export const getCurrentUser=async()=>globalThis.__storyOverviewUser',shortCircuit:true};
  if(specifier.startsWith('@/'))return {url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};return next(specifier,context);
 }});
 try{
  const {getAccountStoryOverview}=await import('../lib/account-stories.ts');
  const rows=await getAccountStoryOverview();assert.equal(queries,2);assert.deepEqual(new Set(rows.map(row=>row.id)),new Set(['visible','pending','hidden']));
  assert.deepEqual(rows.find(row=>row.id==='visible').stories,{text:1,image:1,video:1,total:3,latest:'2026-10-19 01:02:00'});assert.equal(rows.find(row=>row.id==='visible').contentOnly,true);assert.equal(rows.find(row=>row.id==='pending').stories.total,1);
  globalThis.__storyOverviewUser={id:'b'};assert.deepEqual((await getAccountStoryOverview()).map(row=>row.id),['foreign']);
  globalThis.__storyOverviewUser=null;await assert.rejects(getAccountStoryOverview(),/Authentication required/);
 }finally{hooks.deregister();delete globalThis.__storyOverviewDb;delete globalThis.__storyOverviewUser;sqlite.close();}
});

test('stories are discoverable in normal account headers, never anonymous/admin headers, and stay private',async()=>{
 const [header,shell,home,selector,manager,route]=await Promise.all(['app/directorio/_components.tsx','app/mi-cuenta/_components.tsx','app/mi-cuenta/page.tsx','app/mi-cuenta/historias/page.tsx','app/mi-cuenta/[profileId]/historias/page.tsx','app/api/historias/route.ts'].map(source));
 assert.match(header,/hasUserSession && !hasAdminSession[^\n]*\/mi-cuenta\/historias/);assert.match(shell,/href="\/mi-cuenta\/historias"/);
 assert.ok(home.indexOf('<AccountStoriesOverview')<home.indexOf('Rendimiento de tus anuncios'));
 assert.match(selector,/privatePageMetadata/);assert.match(selector,/getCurrentUser/);assert.match(selector,/getAccountStoryOverview/);
 assert.match(manager,/eq\(profiles.ownerId, user.id\)/);assert.match(manager,/canPublish=\{canPublish\}/);
 assert.match(route,/status = 'approved' AND trashed_at IS NULL AND owner_hidden_at IS NULL/);
});

test('action icons describe only known actions and preserve existing pictograms and numeric/category choices',()=>{
 for(const [label,expected] of [['Subir historias','plus'],['Eliminar','trash'],['Editar anuncio','edit'],['Guardar configuración','save'],['Abrir moderación','open'],['Volver al sitio web','back'],['Cerrar sesión','logout'],['Aplicar filtros','filter'],['Estadísticas','stats']])assert.equal(actionIconForLabel(label),expected,label);
 for(const label of ['23','VIP','Todos','🗑 Eliminar','← Volver','×','Algo sin significado de acción'])assert.equal(actionIconForLabel(label),null,label);
});

test('button icons preserve native controls and are not installed by DOM mutation or observers',async()=>{
 const [button,label,icon]=await Promise.all(['app/ActionButton.tsx','app/ActionLabel.tsx','app/ActionIcon.tsx'].map(source));
 assert.match(button,/<button \{\.\.\.props\}>/);assert.match(button,/<a \{\.\.\.props\}>/);assert.match(label,/Already illustrated controls/);assert.match(icon,/aria-hidden="true" focusable="false"/);
 assert.doesNotMatch(button+label,/MutationObserver|querySelector|useEffect|innerHTML|fetch\(/);
});

test('OnlyFans keeps its validated contact flow and uses a local decorative brand symbol',async()=>{
 const [components,profile,form,submission,styles]=await Promise.all(['app/directorio/_components.tsx','app/perfil/[slug]/page.tsx','app/mi-cuenta/ProfileForm.tsx','lib/profile-submission.ts','app/action-controls.css'].map(source));
 assert.match(components,/onlyfans-brand-mark/);assert.match(components,/<circle cx="16" cy="16" r="15" fill="#00AFF0"/);
 assert.doesNotMatch(components,/aria-hidden="true">OF<\/span>/);
 assert.match(profile,/safeExternalUrl\(profile.details.metadata.onlyfans_url, "onlyfans.com"\)/);
 assert.match(profile,/\["onlyfans", profile.type !== "rental" \? contacts.onlyfans/);
 assert.match(form,/name="onlyfans_url"/);assert.match(submission,/normalizePlatformUsername[^\n]*"OnlyFans", "onlyfans.com"/);
 assert.match(styles,/\.profile-contact-actions \.onlyfans-brand-mark/);
});

test('panel drawers replace the logo with an explicit home return link, keeping toolbar labels separate',async()=>{
 for(const kind of ['admin','mi-cuenta']){
  const shell=await source(`app/${kind}/_components.tsx`);
  const workspace=await source(`app/${kind}/${kind==='admin'?'AdminWorkspace':'AccountWorkspace'}.tsx`);
  const sidebarBrand=shell.match(/const brand\s*=([^;]+);/)[1];
  assert.match(sidebarBrand,/href="\/" className="sidebar-return-site"/);
  assert.match(sidebarBrand,/<span aria-hidden="true">←<\/span><span>Volver al sitio web<\/span>/);
  assert.doesNotMatch(sidebarBrand,/OfficialChile3xLogo|MI CUENTA|ADMINISTRADOR/);
  assert.match(shell,/toolbarBrand=\{toolbarBrand\}/);assert.match(workspace,/>\{toolbarBrand\}<\/div>/);
  assert.doesNotMatch(workspace,/toolbar-brand">\{brand\}/);
 }
});
