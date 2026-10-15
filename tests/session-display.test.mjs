import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import ts from 'typescript';
import { isProtectedSessionPath, parseSessionView, sessionViewsMatch } from '../lib/session-view-policy.ts';

const file = path => new URL('../'+path,import.meta.url);
const moduleUrl = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const account = { mode:'account',identity:'a'.repeat(64) };
const admin = { mode:'admin',identity:'b'.repeat(64) };

test('display fingerprints reject malformed modes and compare identity as well as role',()=>{
 for(const invalid of [null,{},'admin',{mode:'admin',identity:null},{mode:null,identity:'a'.repeat(64)},{mode:'owner',identity:'a'.repeat(64)},{mode:'admin',identity:'email@example.invalid'}]) assert.equal(parseSessionView(invalid),null);
 assert.deepEqual(parseSessionView(account),account);
 assert.deepEqual(parseSessionView({mode:null,identity:null}),{mode:null,identity:null});
 assert.equal(sessionViewsMatch(account,admin),false);
 assert.equal(sessionViewsMatch(account,{...account,identity:'c'.repeat(64)}),false);
 assert.equal(sessionViewsMatch(account,{...account}),true);
 for(const path of ['/admin','/admin/configuracion/correo','/mi-cuenta','/foro/tema'])assert.equal(isProtectedSessionPath(path),true);
 for(const path of ['/escorts','/ingresar','/verificar-correo','/administracion-otra'])assert.equal(isProtectedSessionPath(path),false);
});

const serverStub = moduleUrl(`export const cache=fn=>fn;
export const getCurrentAdmin=async()=>globalThis.__sessionDisplayServer.admin;
export const getVerificationUser=async()=>globalThis.__sessionDisplayServer.account;
export const sha256=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');`);
let serverSource=await readFile(file('lib/browser-session-view.ts'),'utf8');
serverSource=serverSource.replace(/from "(?:react|@\/lib\/auth)"/g,()=>`from ${JSON.stringify(serverStub)}`);
const serverUrl=moduleUrl(stripTypeScriptTypes(serverSource));
const server=await import(serverUrl);
let routeSource=await readFile(file('app/api/auth/session/state/route.ts'),'utf8');
routeSource=routeSource.replace('"@/lib/browser-session-view"',JSON.stringify(serverUrl));
const route=await import(moduleUrl(stripTypeScriptTypes(routeSource)));

test('the session-state endpoint reveals no credentials, email or raw account ID and is never cacheable',async()=>{
 try {
  const results=[];
  for(const current of [{admin:null,account:null},{admin:{id:'qa-admin',email:'private@example.invalid'},account:null},{admin:null,account:{id:'qa-account',email:'private@example.invalid'}}]) {
   globalThis.__sessionDisplayServer=current;
   const response=await route.GET();const body=await response.text();const view=JSON.parse(body);
   assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/);
   assert.equal(response.headers.get('vary'),'Cookie');assert.match(response.headers.get('x-robots-tag'),/noindex/);
   assert.ok(parseSessionView(view));assert.doesNotMatch(body,/qa-admin|qa-account|private@|token|secret|password/);
   results.push(view);
  }
  assert.deepEqual(results[0],{mode:null,identity:null});assert.equal(results[1].mode,'admin');assert.equal(results[2].mode,'account');
  assert.notEqual(results[1].identity,results[2].identity);
  globalThis.__sessionDisplayServer={admin:null,account:{id:'qa-other'}};
  assert.notEqual((await server.getBrowserSessionView()).identity,results[2].identity);
 }finally {delete globalThis.__sessionDisplayServer;}
});

const reactStub=moduleUrl(`export const useState=initial=>globalThis.__sessionDisplayClient.useState(initial);
export const useRef=initial=>globalThis.__sessionDisplayClient.useRef(initial);
export const useEffect=effect=>{globalThis.__sessionDisplayClient.effect=effect;};
export const usePathname=()=>globalThis.__sessionDisplayClient.pathname;
export const jsx=(type,props)=>({type,props}),jsxs=jsx,Fragment='fragment';`);
let clientSource=ts.transpileModule(await readFile(file('app/BrowserSessionBoundary.tsx'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
clientSource=clientSource.replace(/from "([^"\n]+)"/g,(_whole,name)=>`from ${JSON.stringify(name==='@/lib/session-view-policy'?file('lib/session-view-policy.ts').href:reactStub)}`);
const {BrowserSessionBoundary}=await import(moduleUrl(clientSource));
const flatten=node=>!node?[]:Array.isArray(node)?node.flatMap(flatten):typeof node==='object'?[node,...flatten(node.props?.children)]:[];

async function harness(initial,run,pathname='/mi-cuenta') {
 const original={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,fetch:globalThis.fetch};
 let cursor=0, hooks=[], nextResponse={status:200,view:initial}, cleanup;
 const w=new EventTarget(),d=new EventTarget();d.visibilityState='visible';w.location={pathname,reloads:0,reload(){this.reloads++;}};
 w.setTimeout=()=>1;w.clearTimeout=()=>{};w.setInterval=()=>2;w.clearInterval=()=>{};
 const h={pathname,effect:null,useState(initial){const i=cursor++;hooks[i]??=initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value;}];},useRef(initial){const i=cursor++;hooks[i]??={current:initial};return hooks[i];}};
 Object.assign(globalThis,{__sessionDisplayClient:h,window:w,document:d,localStorage:{setItem(){}},fetch:async()=>{
  const captured=nextResponse;
  if(captured.wait)await captured.wait;
  if(captured.error) throw Error('network unavailable');
  return {status:captured.status,ok:captured.status===200,json:async()=>captured.view};
 }});
 const render=()=>{cursor=0;return BrowserSessionBoundary({initial,children:{type:'private-child',props:{}}});};
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 try {
  render();cleanup=h.effect();await flush();
  await run({render,flush,w,d,setResponse:value=>{nextResponse=value;},fire:async(type,target=w)=>{target.dispatchEvent(new Event(type));await flush();},nodes:()=>flatten(render())});
 } finally {cleanup?.();for(const [key,value] of Object.entries(original)) {if(value===undefined)delete globalThis[key];else globalThis[key]=value;}delete globalThis.__sessionDisplayClient;}
}

test('old panels are removed on either mode switch, same-role identity change, logout and conflicting cookies',async()=>{
 for(const [initial,next,status] of [[account,admin,200],[admin,account,200],[account,{...account,identity:'c'.repeat(64)},200],[admin,{mode:null,identity:null},200],[account,null,409]]) {
  await harness(initial,async h=>{
   assert.ok(h.nodes().some(n=>n.type==='private-child'));
   h.setResponse({status,view:next});await h.fire('focus');
   assert.ok(h.nodes().some(n=>n.props?.className==='session-change-screen'));
   assert.equal(h.nodes().some(n=>n.type==='private-child'),false);
   const link=h.nodes().find(n=>n.type==='a');assert.equal(link.props.href,next?.mode==='admin'?'/admin':next?.mode==='account'?'/mi-cuenta':'/ingresar?error=session_changed');
  });
 }
});

test('visibility, restored pages and history navigation recheck the real identity',async()=>{
 for(const event of ['pageshow','popstate','storage']) await harness(account,async h=>{
  h.setResponse({status:200,view:admin});const e=new Event(event);if(event==='storage')Object.defineProperty(e,'key',{value:'chile3x:session-check:v1'});h.w.dispatchEvent(e);await h.flush();assert.equal(h.nodes().some(n=>n.type==='private-child'),false);
 });
 await harness(admin,async h=>{
  h.d.visibilityState='hidden';await h.fire('visibilitychange',h.d);assert.equal(h.nodes().find(n=>n.props?.className==='browser-session-boundary').props.inert,undefined);
  h.setResponse({status:200,view:account});h.d.visibilityState='visible';await h.fire('visibilitychange',h.d);assert.equal(h.nodes().some(n=>n.type==='private-child'),false);
 });
});

test('network failure blocks interactions without logging the person out, and retry preserves the legitimate session',async()=>{
 for(const response of [{status:503},{status:200,view:{mode:'admin'}},{error:true}]) await harness(account,async h=>{
  h.setResponse(response);await h.fire('focus');
  assert.ok(h.nodes().find(n=>n.props?.className==='browser-session-boundary').props.inert);
  assert.equal(h.nodes().find(n=>n.props?.className==='browser-session-boundary').props['aria-hidden'],true);
  assert.equal(h.w.location.reloads,0);
  h.setResponse({status:200,view:account});h.nodes().find(n=>n.type==='button').props.onClick();await h.flush();
  assert.equal(h.nodes().find(n=>n.props?.className==='browser-session-boundary').props.inert,undefined);
 });
});

test('an older matching response cannot reveal the panel while a newer check is pending',async()=>{
 await harness(account,async h=>{
  h.setResponse({status:503});await h.fire('focus');
  let releaseOld,releaseNew;
  h.setResponse({status:200,view:account,wait:new Promise(resolve=>{releaseOld=resolve;})});
  h.w.dispatchEvent(new Event('focus'));await h.flush();
  h.setResponse({status:200,view:admin,wait:new Promise(resolve=>{releaseNew=resolve;})});
  h.w.dispatchEvent(new Event('pageshow'));releaseOld();await h.flush();
  assert.equal(h.nodes().find(n=>n.props?.className==='browser-session-boundary').props['aria-hidden'],true);
  releaseNew();await h.flush();assert.equal(h.nodes().some(n=>n.type==='private-child'),false);
 });
});

test('routine focus and page checks are silent, including while a slow matching request is pending',async()=>{
 await harness(account,async h=>{
  let release;h.setResponse({status:200,view:account,wait:new Promise(resolve=>{release=resolve;})});
  await h.fire('focus');
  const wrapper=h.nodes().find(n=>n.props?.className==='browser-session-boundary');
  assert.equal(wrapper.props['aria-hidden'],undefined);assert.equal(wrapper.props.inert,undefined);
  assert.equal(h.nodes().some(n=>n.props?.className==='session-change-screen session-check-screen'),false);
  release();await h.flush();assert.ok(h.nodes().some(n=>n.type==='private-child'));
 });
});

test('an endpoint outage never locks public, login or email-recovery pages',async()=>{
 for(const path of ['/escorts','/ingresar','/verificar-correo'])await harness(account,async h=>{
  h.setResponse({status:503});await h.fire('focus');
  const wrapper=h.nodes().find(n=>n.props?.className==='browser-session-boundary');
  assert.equal(wrapper.props['aria-hidden'],undefined);assert.equal(wrapper.props.inert,undefined);
 },path);
});

test('a changed panel always offers the current identity destination, even after returning to the original account',async()=>{
 await harness(account,async h=>{
  h.setResponse({status:200,view:admin});await h.fire('focus');assert.equal(h.nodes().find(n=>n.type==='a').props.href,'/admin');
  h.setResponse({status:200,view:account});await h.fire('focus');assert.equal(h.nodes().find(n=>n.type==='a').props.href,'/mi-cuenta');
  assert.equal(h.nodes().some(n=>n.type==='private-child'),false);
 });
});

test('anonymous public views use a full reload on login, never cached private navigation',async()=>{
 await harness({mode:null,identity:null},async h=>{h.setResponse({status:200,view:admin});await h.fire('focus');assert.equal(h.w.location.reloads,1);},'/escorts');
});

test('a late successful admin login refreshes a stale denial page instead of interrupting OAuth recovery',async()=>{
 await harness(account,async h=>{
  h.setResponse({status:200,view:admin});await h.fire('focus');
  assert.equal(h.w.location.reloads,1);assert.equal(h.nodes().some(n=>n.type==='private-child'),false);
 },'/admin/acceso-denegado');
});

let resumeSource=ts.transpileModule(await readFile(file('app/admin/acceso-denegado/ResumeAdminSession.tsx'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
resumeSource=resumeSource.replace(/from "([^"\n]+)"/g,(_whole,name)=>`from ${JSON.stringify(name==='@/lib/session-view-policy'?file('lib/session-view-policy.ts').href:reactStub)}`);
const {ResumeAdminSession}=await import(moduleUrl(resumeSource));

test('GitHub failure recovery confirms a late admin cookie before showing an error, never resumes a public account',async()=>{
 const original={window:globalThis.window,fetch:globalThis.fetch};
 try {
  for(const views of [[{mode:null,identity:null},admin],[account,account,account]]) {
   let state=false,effect,redirect=null,calls=0;
   globalThis.__sessionDisplayClient={useState:()=>[state,value=>{state=value;}],useEffect:fn=>{effect=fn;}};
   // reactStub assigns the effect directly; its accessor mirrors useEffect.
   Object.defineProperty(globalThis.__sessionDisplayClient,'effect',{set(fn){effect=fn;},get(){return effect;},configurable:true});
   globalThis.window={setTimeout,clearTimeout,location:{replace(value){redirect=value;}}};
   globalThis.fetch=async()=>({ok:true,json:async()=>views[Math.min(calls++,views.length-1)]});
   const render=()=>ResumeAdminSession({initialConfirmed:false,failureMessage:'qa-provider-failure'});
   assert.equal(flatten(render()).find(n=>n.type==='h1').props.children,'Confirmando acceso administrativo');
   const cleanup=effect();
   await new Promise(resolve=>setTimeout(resolve,1300));
   if(views[1].mode==='admin'){assert.equal(redirect,'/admin');assert.equal(state,false);}
   else{assert.equal(redirect,null);assert.equal(state,true);assert.equal(calls,3);}
   cleanup();
  }
 }finally {Object.assign(globalThis,original);delete globalThis.__sessionDisplayClient;}
});
