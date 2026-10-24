// Loopback-only presentation QA. Changes no production settings or accounts.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
const base='http://127.0.0.1:3880';
assert.equal(new URL(base).hostname,'127.0.0.1');
const fixture=JSON.parse(readFileSync('outputs/qa-account-stories.json','utf8'));
assert.match(fixture.prefix,/^qa_stories_[a-f0-9]+$/);
const statePath='outputs/qa-public-controls-state.json';
const anonymous=fixture.cookies.empty.split('; ').filter(value=>value.startsWith('__Host-chile3x_browser=')).join('; ');
async function request(path,admin=false,options={}) {
 const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000),...options,headers:{connection:'close',cookie:admin?fixture.cookies.admin:anonymous,origin:base,...options.headers}});
 return {status:response.status,headers:response.headers,text:await response.text()};
}
async function save(settings) {
 const state=await request('/api/admin/colaboracion?key=settings%3Asite',true);
 assert.equal(state.status,200);
 const version=JSON.parse(state.text).resources.find(row=>row.key==='settings:site').revision;
 const result=await request('/api/admin/settings',true,{method:'POST',headers:{accept:'application/json'},body:new URLSearchParams({return_to:'/admin/testing',review_key:'settings:site',review_revision:String(version),...settings})});
 assert.equal(result.status,200,result.text.slice(0,200));
}
const mode=process.argv[2];
if(mode==='set') {
 const [visual_theme,home_layout]=process.argv.slice(3);
 assert.ok(['classic','liquid-glass'].includes(visual_theme));
 assert.ok(['classic','compact'].includes(home_layout));
 if(!existsSync(statePath)) {
  const home=await request('/');assert.equal(home.status,200);
  writeFileSync(statePath,JSON.stringify({visual_theme:home.headers.get('x-chile3x-visual-theme'),home_layout:home.headers.get('x-chile3x-home-layout')}));
 }
 await save({visual_theme,home_layout});
 const home=await request('/');assert.equal(home.status,200);
 assert.equal(home.headers.get('x-chile3x-visual-theme'),visual_theme);
 assert.equal(home.headers.get('x-chile3x-home-layout'),home_layout);
 assert.equal(home.text.includes('data-theme-stylesheet="liquid-glass"'),visual_theme==='liquid-glass');
 console.log('PASS local presentation: '+visual_theme+' / '+home_layout);
}else if(mode==='restore') {
 if(existsSync(statePath)){await save(JSON.parse(readFileSync(statePath)));unlinkSync(statePath);console.log('PASS restored original local presentation.');}
}else if(mode==='smoke') {
 for(const path of ['/','/escorts','/escorts/concepcion','/venta-contenido','/agencias','/arriendos','/terminos','/privacidad','/faq','/contacto','/perfil/@'+fixture.prefix+'_escort']){
  const page=await request(path);assert.equal(page.status,200,path);
  assert.doesNotMatch(page.text,/\d+:E\{|Worker exceeded resource limits|C:\\Users|C:\/Users/);
  assert.equal((page.text.match(/<h1\b/g)??[]).length,1,path);
  assert.match(page.text,/rel="canonical"/);
  console.log('PASS '+path+' 200, one H1, canonical and no render exception.');
 }
}else throw Error('Use set <theme> <layout>, smoke or restore.');
