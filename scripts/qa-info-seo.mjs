// Loopback-only integration checks. Never modifies remote settings or pages.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {INFORMATION_PAGES} from '../lib/information-seo-policy.ts';
const base='http://127.0.0.1:3880';
assert.equal(new URL(base).hostname,'127.0.0.1');
const fixture=JSON.parse(readFileSync('outputs/qa-account-stories.json','utf8'));
assert.match(fixture.prefix,/^qa_stories_[a-f0-9]+$/);
const request=async(path,role='admin',options={})=>{
 const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000),...options,headers:{connection:'close',cookie:fixture.cookies[role]??'',origin:base,...options.headers}});
 const result={status:response.status,headers:response.headers,text:await response.text()};
 return result;
};
async function state(id){const r=await request('/api/admin/contenido/seo/'+id);assert.equal(r.status,200,r.text.slice(0,300));assert.match(r.headers.get('cache-control'),/no-store/);return JSON.parse(r.text);}
const save=(id,current,overrides,extra={},role='admin',headers={})=>request('/api/admin/contenido/seo/'+id,role,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({snapshot:current.snapshot,revision:current.revision,mutationId:randomUUID(),overrides,...extra})});
const attribute=(html,name)=>html.match(new RegExp('<meta[^>]*name="'+name+'"[^>]*content="([^"]*)"'))?.[1]??'';
const metadata=html=>({title:html.match(/<title>([\s\S]*?)<\/title>/)?.[1],description:attribute(html,'description'),robots:attribute(html,'robots'),canonical:html.match(/rel="canonical"[^>]*href="([^"]*)"/)?.[1],social:[...html.matchAll(/<meta[^>]*(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*content="[^"]*"/g)].map(m=>m[0])});
const baseline={};
for(const [id,page]of Object.entries(INFORMATION_PAGES))baseline[id]={config:(await state(id)).overrides,metadata:metadata((await request(page.path,'anonymous')).text)};
const homeBefore=metadata((await request('/','anonymous')).text);
const aboutBefore=metadata((await request('/quienes-somos','anonymous')).text);
let changed=false;
try{
 for(const [id,page]of Object.entries(INFORMATION_PAGES)){
  const current=await state(id),publicPage=await request(page.path,'anonymous');assert.equal(publicPage.status,200,page.path);
  assert.equal((publicPage.text.match(/<h1\b/g)??[]).length,1,page.path);
  assert.ok(publicPage.text.includes(current.effective.title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
  const noOp=await save(id,current,current.overrides);assert.equal(noOp.status,200,noOp.text);assert.equal(JSON.parse(noOp.text).unchanged,true);assert.equal((await state(id)).revision,current.revision);
 }
 console.log('PASS effective defaults on all informational pages, one H1 and no-op saves do not change settings revisions.');
 const current=await state('contacto');
 // Empty bodies exercise early authorization without Wrangler's loopback
 // proxy retaining an unread POST body. The real mutation payload is tested below.
 for(const role of ['owner','anonymous']){const denied=await request('/api/admin/contenido/seo/contacto',role,{method:'POST',body:''});assert.ok([401,403,409].includes(denied.status),denied.status);}
 assert.equal((await request('/api/admin/contenido/seo/contacto','admin',{method:'POST',body:'',headers:{origin:'https://attacker.invalid'}})).status,403);
 for(const id of ['inicio','admin','escorts','__proto__'])assert.equal((await request('/api/admin/contenido/seo/'+id,'admin',{method:'POST',body:''})).status,404);
 for(const overrides of [{title:'<script>bad</script>'},{title:'C:/Users/name'},{image:'https://attacker.invalid/card.png'},{canonical:'https://other.invalid/'},{noarchive:true},{maxSnippet:-2}])assert.equal((await save('contacto',current,overrides)).status,400);
 assert.equal((await save('contacto',current,{indexing:'noindex'})).status,400);
 assert.equal((await save('contacto',{...current,snapshot:'0'.repeat(64)},{title:'QA stale'})).status,409);
 console.log('PASS permissions, same-origin checks, scope, bounded JSON, invalid fields, explicit robots confirmation and stale snapshot rejection.');
 changed=true;
 const next={...current.overrides,title:'Contacto de prueba local | Chile3X',description:'Texto de prueba local para verificar el editor.',socialTitle:'Tarjeta de contacto local',socialDescription:'Descripción social de prueba local.',image:'/chile3x-favicon-512-20261020.png',imageAlt:'Imagen de prueba local',indexing:'noindex',following:'nofollow',noImageIndex:true,maxSnippet:80,maxVideoPreview:0,maxImagePreview:'standard'};
 const saved=await save('contacto',current,next,{confirmRobots:true});assert.equal(saved.status,200,saved.text);
 const actual=await state('contacto');assert.deepEqual(actual.overrides,next);
 const document=await request('/contacto','anonymous');assert.match(document.text,/<title>Contacto de prueba local \| Chile3X<\/title>/);assert.match(document.text,/noindex/);assert.match(document.text,/max-snippet:80/);assert.match(document.text,/max-video-preview:0/);assert.match(document.text,/max-image-preview:standard/);assert.match(document.text,/noimageindex/);
 assert.ok(document.text.includes('Tarjeta de contacto local'));assert.ok(document.text.includes('chile3x-favicon-512-20261020.png'));
 const sitemap=await request('/sitemap.xml','anonymous');assert.ok(!sitemap.text.includes('<loc>https://chile3x.cl/contacto</loc>'));
 assert.equal((await save('contacto',current,next,{confirmRobots:true})).status,409);
 assert.deepEqual(metadata((await request('/faq','anonymous')).text),baseline.faq.metadata);
 assert.deepEqual(metadata((await request('/','anonymous')).text),homeBefore);assert.deepEqual(metadata((await request('/quienes-somos','anonymous')).text),aboutBefore);
 console.log('PASS saved metadata/social/robots reach the public HTML; noindex page leaves sitemap; other pages and Home stay unchanged.');
 // Verify all remaining editors map to their own single settings key.
 for(const id of ['faq','terminos','privacidad','reglas','nosotros']){const before=await state(id);const result=await save(id,before,{...before.overrides,socialTitle:'Tarjeta QA '+id});assert.equal(result.status,200,result.text);assert.equal((await state(id)).overrides.socialTitle,'Tarjeta QA '+id);}
 const about=await state('nosotros');
 const aboutValues={...about.overrides,title:'Quiénes somos QA | Chile3X',description:'Descripción QA local.',socialTitle:'Tarjeta de información QA',socialDescription:'Descripción social QA local.',image:'/chile3x-favicon-512-20261020.png',imageAlt:'Imagen informativa QA',indexing:'noindex',noSnippet:true,maxImagePreview:'none'};
 assert.equal((await save('nosotros',about,aboutValues)).status,400);
 const aboutSaved=await save('nosotros',about,aboutValues,{confirmRobots:true});assert.equal(aboutSaved.status,200,aboutSaved.text);
 const aboutPublic=await request('/quienes-somos','anonymous');
 assert.match(aboutPublic.text,/<title>Quiénes somos QA \| Chile3X<\/title>/);
 assert.match(aboutPublic.text,/noindex/);assert.match(aboutPublic.text,/nosnippet/);assert.match(aboutPublic.text,/max-image-preview:none/);
 assert.ok(aboutPublic.text.includes('Tarjeta de información QA'));assert.ok(aboutPublic.text.includes('Descripción social QA local.'));
 assert.ok(!(await request('/sitemap.xml','anonymous')).text.includes('<loc>https://chile3x.cl/quienes-somos</loc>'));
 assert.equal((await save('nosotros',about,aboutValues,{confirmRobots:true})).status,409);
 assert.deepEqual(metadata((await request('/','anonymous')).text),homeBefore);
 const restrictive=await state('contacto');const noSnippet=await save('contacto',restrictive,{...restrictive.overrides,noSnippet:true},{confirmRobots:true});assert.equal(noSnippet.status,200);assert.match((await request('/contacto','anonymous')).text,/nosnippet/);
 console.log('PASS all six pages save independently; about metadata/social/image/robots reach public HTML and sitemap; stale saves are rejected.');
}finally{
 if(changed)for(const id of Object.keys(INFORMATION_PAGES)){const current=await state(id);const restored=await save(id,current,baseline[id].config,{confirmRobots:true});assert.equal(restored.status,200,restored.text);}
 for(const [id,page]of Object.entries(INFORMATION_PAGES))assert.deepEqual(metadata((await request(page.path,'anonymous')).text),baseline[id].metadata,page.path+' restored');
 console.log('PASS original local page settings and metadata restored. No production mutations.');
}
