import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,readdir,stat} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {defaultHomeTexts,parseHomeTexts,HOME_REQUIRED_TEXT_FIELDS} from '../lib/home-content-policy.ts';
import {publicSiteOrigin} from '../lib/public-site-url.ts';
import {incompatibleProfileTags} from '../lib/profile-tag-policy.ts';
import {ADMIN_CONTENT_SECTIONS} from '../lib/admin-content-navigation.ts';
import {prepareSitePresentation} from '../worker/site-presentation.ts';
import {publicCacheKey} from '../worker/public-cache.ts';
import {PRIVATE_SAMPLES_ENABLED} from '../lib/private-sample-policy.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('home editor keeps separate layouts, bounded plain text, accessible labels and nonempty headings',()=>{
 for(const layout of ['classic','compact']){
  const original=defaultHomeTexts(layout);
  assert.deepEqual(parseHomeTexts(JSON.stringify(original),layout,true),original);
  assert.equal(parseHomeTexts('{broken',layout).title,original.title);
  for(const key of HOME_REQUIRED_TEXT_FIELDS)assert.throws(()=>parseHomeTexts(JSON.stringify({[key]:' '}),layout,true),/obligatorio/);
  for(const value of ['<script>alert(1)</script>','x'.repeat(121),123])assert.throws(()=>parseHomeTexts(JSON.stringify({title:value}),layout,true));
  const other=parseHomeTexts(JSON.stringify({title:'Texto de prueba',titleAccent:'',socialTitle:'',__unknown:'ignored'}),layout,true);
  assert.equal(other.title,'Texto de prueba');assert.equal(other.titleAccent,'');assert.equal(other.__unknown,undefined);
 }
 assert.notEqual(defaultHomeTexts('classic').intro,defaultHomeTexts('compact').intro);
});

test('public origin excludes local filesystem and browser addresses, credentials and noncanonical paths',()=>{
 assert.equal(publicSiteOrigin('https://chile3x.cl/'),'https://chile3x.cl');
 assert.equal(publicSiteOrigin('https://www.chile3x.cl'),'https://www.chile3x.cl');
 for(const value of ['C:/Users/person/site','file:///C:/Users/person/site','http://chile3x.cl','https://127.0.0.1','https://[::1]','https://localhost','https://foo.local','https://foo.internal','https://foo.test','https://foo.invalid','https://a:b@chile3x.cl','https://chile3x.cl:3881','https://chile3x.cl/admin','https://chile3x.cl?local=1','https://chile3x.cl/#fragment','javascript:alert(1)'])assert.equal(publicSiteOrigin(value),null,value);
});

test('shared content hub owns legal, metadata, home and FAQ exactly once; old configuration cards are absent',async()=>{
 for(const href of ['/admin/documentos-legales','/admin/contenido/seo','/admin/contenido/inicio','/admin/contenido/faq'])assert.equal(ADMIN_CONTENT_SECTIONS.filter(s=>s.href===href).length,1);
 const configuration=await source('app/admin/configuracion/page.tsx');
 assert.doesNotMatch(configuration,/\["(?:seo|contenido)"|href="\/admin\/documentos-legales"/);
 const legacy=await source('app/admin/configuracion/[section]/page.tsx');
 assert.match(legacy,/if\(!contentRoute&&\(name==="seo"\|\|name==="contenido"\)\)redirect\(name==="seo"\?"\/admin\/contenido\/seo":"\/admin\/contenido\/faq"\)/);
});

test('a settings revision invalidates the public cache without adding another presentation query or querying fonts',async()=>{
 let queries=0;
 const database={prepare(){return{bind(){return{async all(){queries++;return{results:[{key:'home_layout',value:'classic'},{key:'visual_theme',value:'classic'},{key:'content_revision',value:String(queries)}]};}};}};}};
 const request=new Request('https://chile3x.cl/');
 const first=await prepareSitePresentation(request,database),second=await prepareSitePresentation(request,database);
 assert.equal(queries,2);assert.notEqual(first.contentRevision,second.contentRevision);
 assert.notEqual(publicCacheKey(request,'deploy:'+first.contentRevision).url,publicCacheKey(request,'deploy:'+second.contentRevision).url);
 assert.equal((await prepareSitePresentation(new Request('https://chile3x.cl/fonts/font.woff2'),database)).page,false);
 assert.equal(queries,2);
});

test('incompatible tag combinations fail in both orders, including SQL updates and atomic rollback',async()=>{
 assert.equal(incompatibleProfileTags(['milf','hombres']),true);assert.equal(incompatibleProfileTags(['trans','milf']),true);
 assert.equal(incompatibleProfileTags(['milf']),false);assert.equal(incompatibleProfileTags(['hombres']),false);
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE profile_tags(id TEXT PRIMARY KEY,profile_id TEXT,tag TEXT);');
  db.exec(await source('drizzle/0063_incompatible_profile_tags.sql'));
  for(const [first,second] of [['milf','hombres'],['hombres','milf'],['milf','trans'],['trans','milf']]){
   db.exec('DELETE FROM profile_tags;');
   db.prepare('INSERT INTO profile_tags VALUES(?,?,?)').run('one','p',first);
   assert.throws(()=>db.prepare('INSERT INTO profile_tags VALUES(?,?,?)').run('two','p',second),/incompatible_profile_tags/);
   db.prepare('INSERT INTO profile_tags VALUES(?,?,?)').run('two','other',second);
   assert.throws(()=>db.exec("UPDATE profile_tags SET profile_id='p' WHERE id='two'"),/incompatible_profile_tags/);
   db.exec('BEGIN; DELETE FROM profile_tags;');
   try{db.exec("INSERT INTO profile_tags VALUES('one','p','hombres'),('two','p','milf')");assert.fail('must reject');}catch(error){assert.match(error.message,/incompatible_profile_tags/);db.exec('ROLLBACK');}
   assert.equal(db.prepare('SELECT tag FROM profile_tags WHERE id=?').get('one').tag,first);
  }
 }finally{db.close();}
 const form=await source('app/mi-cuenta/ProfileForm.tsx'),server=await source('lib/profile-submission.ts');
 assert.match(form,/incompatibleProfileTags/);assert.match(form,/PROFILE_TAG_COMBINATION_MESSAGE/);assert.match(server,/if \(incompatibleProfileTags\(tags\)\) throw new ProfileValidationError/);
});

test('private sample release remains guarded by capabilities and server routing',async()=>{
 assert.equal(PRIVATE_SAMPLES_ENABLED,true);
 const worker=await source('worker/index.ts'),media=await source('lib/media.ts'),navigation=await source('app/admin/_components.tsx');
 assert.match(worker,/if\(!PRIVATE_SAMPLES_ENABLED&&/);
 assert.match(media,/PRIVATE_SAMPLES_ENABLED\?\[/);
 assert.match(navigation,/PRIVATE_SAMPLES_ENABLED&&adminHasCapability/);
 const policy=await source('lib/private-samples.ts');
 assert.match(policy,/accounts.manage/);assert.match(policy,/profiles.moderate/);
 assert.doesNotMatch(await source('app/layout.tsx'),/import ["']\.\/muestra\/samples.css/);
});

test('public build contains the licensed local DM Sans font but no OS paths or source maps',async()=>{
 const css=await source('app/globals.css');
 assert.match(css,/@font-face[\s\S]*?DM Sans Chile3X/);
 assert.match(css,/font-display: swap/);assert.doesNotMatch(css,/manrope-latin-variable\.woff2/);
 const font=await stat(new URL('../public/fonts/dm-sans-latin-variable-20261023.woff2',import.meta.url));assert.ok(font.size>10000&&font.size<60000);
 assert.match(await source('public/fonts/DM-Sans-OFL.txt'),/SIL OPEN FONT LICENSE/);
 async function scan(folder){for(const entry of await readdir(new URL('../'+folder,import.meta.url),{withFileTypes:true})){const path=folder+'/'+entry.name;if(entry.isDirectory())await scan(path);else{assert.ok(!path.endsWith('.map'),path);if(/\.(?:js|css)$/.test(path)){const text=await source(path);assert.doesNotMatch(text,/[A-Z]:[\\/]+Users[\\/]+/i,path);assert.doesNotMatch(text,/sourceMappingURL\s*=/,path);}}}}
 await scan('dist/client');
});
