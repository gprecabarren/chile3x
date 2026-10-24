// Loopback only. Exercises authenticated CMS updates using disposable fixtures,
// then restores all original presentation/content values even on a failed check.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {parseHomeTexts} from '../lib/home-content-policy.ts';

const base='http://127.0.0.1:3880';
assert.equal(new URL(base).hostname,'127.0.0.1');
const fixture=JSON.parse(readFileSync('outputs/qa-account-stories.json','utf8'));
assert.match(fixture.prefix,/^qa_stories_[a-f0-9]+$/);
const stateRoot=resolve('.wrangler/visual-state');
const dbPath=resolve(stateRoot,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(dbPath.startsWith(stateRoot+'\\')||dbPath.startsWith(stateRoot+'/'));
const db=new DatabaseSync(dbPath,{readOnly:true});
const previous=Object.fromEntries(db.prepare("SELECT key,value FROM site_settings WHERE key IN ('home_layout','visual_theme','home_content_classic','home_content_compact')").all().map(row=>[row.key,row.value]));
const baseline={home_layout:previous.home_layout??'classic',visual_theme:previous.visual_theme??'classic',home_content_classic:previous.home_content_classic??'',home_content_compact:previous.home_content_compact??''};
// An anonymous browser has the necessary browser-isolation cookie but no user
// or administrator session. Keep it separate from both authenticated identities.
const anonymousBrowser=fixture.cookies.empty.split('; ').filter(value=>value.startsWith('__Host-chile3x_browser=')).join('; ');
const request=async(path,role='admin',options={})=>{
 const cookie=role==='anonymous'?anonymousBrowser:fixture.cookies[role];
 const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000),...options,headers:{connection:'close',...(cookie?{cookie}:{}),origin:base,...options.headers}});
 const result={status:response.status,headers:response.headers,text:await response.text()};
 // Wrangler's local proxy may invalidate an upstream connection when an auth
 // rejection returns before consuming its POST body. A read-only barrier lets
 // that proxy settle. Never retry a mutation with an uncertain outcome.
 if(options.method==='POST'&&[401,403].includes(result.status)){
  await fetch(base+'/api/auth/session/state',{headers:{connection:'close',...(cookie?{cookie}:{})},signal:AbortSignal.timeout(30000)}).then(r=>r.arrayBuffer());
 }
 return result;
};
const revision=async()=>{const result=await request('/api/admin/colaboracion?key=settings%3Asite');assert.equal(result.status,200);return JSON.parse(result.text).resources.find(row=>row.key==='settings:site').revision;};
const save=(values,version,role='admin',extraHeaders={})=>request('/api/admin/settings',role,{method:'POST',body:new URLSearchParams({return_to:'/admin/contenido/inicio',review_key:'settings:site',review_revision:String(version),...values}),headers:{accept:'application/json',...extraHeaders}});
let changed=false;
try{
 for(const path of ['/admin/contenido','/admin/contenido/seo','/admin/contenido/inicio','/admin/contenido/faq','/admin/documentos-legales','/admin/configuracion']){
  const page=await request(path);assert.equal(page.status,200,path);assert.match(page.headers.get('x-robots-tag'),/noindex/);assert.doesNotMatch(page.text,/\d+:E\{|Worker exceeded resource limits|C:\\Users|C:\/Users/);
  const denied=await request(path,'owner');
  // A nested server redirect may be serialized after the parent's secure-session
  // loading boundary has begun its 200 response. It must contain a redirect and
  // no protected editor payload, never an accessible settings form.
  if(denied.status===200){assert.match(denied.text,/NEXT_REDIRECT/);assert.doesNotMatch(denied.text,/site_title|home_content_classic|initialEntries/);}
  else assert.ok([303,307,409].includes(denied.status),path+' normal user');
 }
 for(const [oldPath,newPath] of [['/admin/configuracion/seo','/admin/contenido/seo'],['/admin/configuracion/contenido','/admin/contenido/faq']]){
  const page=await request(oldPath);
  if(page.status===200){assert.match(page.text,/NEXT_REDIRECT/);assert.ok(page.text.includes(newPath)||page.text.includes(encodeURIComponent(newPath)));}
  else{assert.ok([303,307].includes(page.status));assert.equal(new URL(page.headers.get('location'),base).pathname,newPath);}
 }
 const config=await request('/admin/configuracion');assert.doesNotMatch(config.text,/href="\/admin\/(?:documentos-legales|contenido\/(?:seo|faq|inicio))"/);
 const unknown=await request('/admin/configuracion/__proto__');
 if(unknown.status===200)assert.match(unknown.text,/NEXT_HTTP_ERROR_FALLBACK;404/);else assert.equal(unknown.status,404);
 console.log('PASS private content hub, no duplicate cards, legacy redirects, authorization and unknown-section 404.');

 const version=await revision();
 for(const role of ['owner','anonymous']){const denied=await save({home_layout:'classic'},version,role);assert.ok([401,403,409].includes(denied.status),role+' '+denied.status+' '+denied.text.slice(0,200));}
 assert.equal((await save({home_layout:'classic'},version,'admin',{origin:'https://attacker.invalid'})).status,403);
 for(const values of [{home_content_classic:'{"title":"<script>bad</script>"}'},{home_content_classic:'{"featuredTitle":""}'},{site_url:'file:///C:/Users/person'},{site_url:'https://127.0.0.1'}])assert.equal((await save(values,version)).status,400);
 assert.equal(await revision(),version);
 const classic={...parseHomeTexts(baseline.home_content_classic,'classic'),title:'QA portada A',seoTitle:'QA título A',socialTitle:'QA social A'};
 const compact={...parseHomeTexts(baseline.home_content_compact,'compact'),title:'QA portada B',seoTitle:'QA título B',socialTitle:'QA social B'};
 const saved=await save({home_content_classic:JSON.stringify(classic),home_content_compact:JSON.stringify(compact)},version);assert.equal(saved.status,200,saved.text);assert.match(JSON.parse(saved.text).redirectTo,/\/admin\/contenido\/inicio\?saved=1$/);changed=true;
 assert.equal((await save({home_content_classic:'{}'},version)).status,409);
 for(const theme of ['classic','liquid-glass'])for(const layout of ['classic','compact']){
  const result=await save({home_layout:layout,visual_theme:theme},await revision());assert.equal(result.status,200);
  const page=await request('/','anonymous',{headers:{'x-chile3x-home-layout':layout==='classic'?'compact':'classic','x-chile3x-visual-theme':theme==='classic'?'liquid-glass':'classic'}});
  assert.equal(page.status,200);assert.equal(page.headers.get('x-chile3x-home-layout'),layout);assert.equal(page.headers.get('x-chile3x-visual-theme'),theme);
  const chosen=layout==='classic'?classic:compact,other=layout==='classic'?compact:classic;
  assert.match(page.text,new RegExp('<title>'+chosen.seoTitle+'</title>'));assert.ok(page.text.includes(chosen.title));assert.ok(!page.text.includes(other.title));assert.ok(!page.text.includes(other.seoTitle));
  assert.equal((page.text.match(/<h1\b/g)??[]).length,1);assert.match(page.text,/rel="canonical" href="https:\/\/chile3x.cl\/"/);
  assert.equal(page.text.includes('data-theme-stylesheet="liquid-glass"'),theme==='liquid-glass');
 }
 console.log('PASS atomic saving, validation, stale conflict 409, active-only HTML/metadata and four layout/theme combinations.');
 for(const path of ['/@fs/C:/Users/private','/assets/missing.js.map']){
  const page=await request(path);assert.equal(page.status,404,path);assert.match(page.headers.get('x-robots-tag'),/noindex/);
 }
 const font=await request('/fonts/dm-sans-latin-variable-20261023.woff2','anonymous');assert.equal(font.status,200);
 console.log('PASS source-map/local-file probes denied and self-hosted font available.');
}finally{
 try{
  if(changed){
   // Strict validation expands an empty saved value to the exact same defaults
   // that were rendered before the test. No public/test production data is used.
   const restore={...baseline,home_content_classic:JSON.stringify(parseHomeTexts(baseline.home_content_classic,'classic')),home_content_compact:JSON.stringify(parseHomeTexts(baseline.home_content_compact,'compact'))};
   const result=await save(restore,await revision());assert.equal(result.status,200,result.text);
   console.log('PASS restored local home content, active design and theme.');
  }
 }finally{db.close();}
}
