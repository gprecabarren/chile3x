import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { drizzle } from 'drizzle-orm/d1';
import { getTableColumns } from 'drizzle-orm';
import { users } from '../db/schema.ts';
import { normalizeGithubLogin, validAdminEmail, validGithubLogin } from '../lib/admin-access-validation.ts';
const file=path=>new URL('../'+path,import.meta.url);
let state;
const stub='data:text/javascript,'+encodeURIComponent(`
const s=()=>globalThis.__adminAccessQA;
export const NextRequest=Request;
export async function lookupGithubAccount(...args){return s().lookup(...args);}
export const NextResponse={json:(body,options)=>Response.json(body,options),redirect(url,status=307){const r=new Response(null,{status,headers:{location:String(url)}});r.cookies={set:(...args)=>s().cookies.push(args),delete:()=>{}};return r;}};
export async function getDb(){return s().db;} export async function getCurrentAdmin(){return s().admin;}
export async function hasPublicAccountEmail(){return s().publicConflict;}
export async function getGitHubOAuthConfig(){return {clientId:'local-test',clientSecret:'local-secret'};}
export function createOpaqueToken(){return 'local-opaque-state';} export function safeAdminReturnTo(value){return value?.startsWith('/admin')?value:'/admin';}
export async function createAdminSession(id){s().sessions.push(id);return 'local-session';} export function setAdminSessionCookie(){s().sessionCookie=true;}
export async function recordAdminAudit(actor,event){s().audit.push(event);}
export async function recordOperationalEvent(event){s().events.push(event);}
export function assertSameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('origin');}
`);
async function route(path){let source=await readFile(file(path),'utf8');source=source.replace(/from "([^"\n]+)"/g,(_m,p)=>'from '+JSON.stringify(p==='drizzle-orm'?import.meta.resolve(p):p==='@/db/schema'?file('db/schema.ts').href:p==='@/lib/admin-access-validation'?file('lib/admin-access-validation.ts').href:p==='@/lib/admin-permissions'?file('lib/admin-permissions.ts').href:stub));return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));}
const {lookupGithubAccount}=await route('lib/admin-github-account.ts');
const [start,callback,invite,edit]=await Promise.all(['app/api/auth/github/start/route.ts','app/api/auth/github/callback/route.ts','app/api/admin/administradores/route.ts','app/api/admin/administradores/[grantId]/route.ts'].map(route));
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE,username TEXT,display_name TEXT,role TEXT,is_active INTEGER DEFAULT 1,email_verified_at TEXT);
 CREATE TABLE admin_github_access(id TEXT PRIMARY KEY,github_login TEXT UNIQUE,github_user_id TEXT UNIQUE,user_id TEXT UNIQUE,access_level TEXT DEFAULT 'moderator',protected_email TEXT UNIQUE,is_protected_owner INTEGER DEFAULT 0,is_active INTEGER DEFAULT 1,invited_by TEXT,revoked_by TEXT,revoked_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE admin_github_identities(id TEXT PRIMARY KEY,user_id TEXT UNIQUE,github_user_id TEXT UNIQUE,github_login TEXT UNIQUE,github_email TEXT UNIQUE,last_login_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
 sqlite.exec('DROP TABLE users; CREATE TABLE users('+Object.values(getTableColumns(users)).map(column=>'"'+column.name+'" '+column.getSQLType()+(column.primary?' PRIMARY KEY':column.name==='email'?' UNIQUE':'')).join(',')+');');
 const binding={prepare(sql){const query={bind(...values){return {async raw(){const p=sqlite.prepare(sql);p.setReturnArrays(true);return p.all(...values);},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}};}};return query;}};
 state={sqlite,db:drizzle(binding),lookup:lookupGithubAccount,admin:null,publicConflict:false,sessions:[],cookies:[],audit:[],events:[],fetches:0,github:{login:'test-real-login',id:101,type:'User',name:'Visible name'},emails:[{email:'team@example.test',primary:false,verified:true}]};globalThis.__adminAccessQA=state;
 const previous=globalThis.fetch;globalThis.fetch=async url=>{state.fetches++;if(String(url).includes('/users/'))return state.lookupResponse??Response.json({...state.github,login:new URL(url).pathname.split('/').at(-1)});if(String(url).endsWith('/access_token'))return Response.json({access_token:'local-only'});if(String(url).endsWith('/user/emails'))return Response.json(state.emails);return Response.json(state.github);};
 return ()=>{globalThis.fetch=previous;sqlite.close();};
}
function grant(changes={}){const row={id:'grant',github_login:'test-real-login',github_user_id:null,user_id:null,access_level:'administrator',protected_email:'team@example.test',is_active:1,is_protected_owner:0,...changes};state.sqlite.prepare('INSERT INTO admin_github_access('+Object.keys(row).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));}
function oauth(valid=true){const request=new Request('https://local.test/api/auth/github/callback?code=local&state=state');request.nextUrl=new URL(request.url);request.cookies={get:name=>name.endsWith('return_to')?{value:'/admin'}:{value:valid?'state':'wrong'}};return request;}
function post(values,accept=true){return new Request('https://local.test/api/admin/administradores',{method:'POST',headers:{origin:'https://local.test',...(accept?{accept:'application/json'}:{})},body:new URLSearchParams(values)});}
test('admin input accepts ordinary private email/optional @ and rejects malformed values',()=>{
 assert.equal(normalizeGithubLogin(' @Test-User '),'test-user');
 for(const name of ['a','test-user','user123'])assert.ok(validGithubLogin(name));
 for(const name of ['user name','https://github.com/test','-name','name-','a--b','x'.repeat(40)])assert.ok(!validGithubLogin(name));
 for(const email of ['team@example.test','d__test@hotmail.com','first.last+team@example.cl'])assert.ok(validAdminEmail(email));
 for(const email of ['a@localhost','.a@test.cl','a..b@test.cl','a.@test.cl','a@-test.cl','a@test..cl','a b@test.cl','a@test.cl\n','a'.repeat(65)+'@test.cl'])assert.ok(!validAdminEmail(email));
});
test('lookup fails closed for missing accounts, organizations, rate limits and network failures',async()=>{
 const close=fixture();try{
 for(const [response,error]of[[new Response(null,{status:404}),'github_missing'],[Response.json({type:'Organization'}),'github_organization'],[new Response(null,{status:403}),'github_unavailable']])assert.deepEqual(await lookupGithubAccount('test-user',async()=>response),{error});
 assert.deepEqual(await lookupGithubAccount('test-user',async()=>{throw Error('offline');}),{error:'github_unavailable'});
 const account=await lookupGithubAccount('test-user',async(url,options)=>{assert.equal(new URL(url).hostname,'api.github.com');assert.ok(options.headers.authorization.startsWith('Basic '));assert.ok(!url.includes('local-secret'));assert.equal(options.redirect,'error');return Response.json({type:'User',id:101,login:'test-user'});});assert.equal(account.login,'test-user');assert.ok(!JSON.stringify(state.events).includes('local-secret'));
 }finally{close();}
});
test('explicit account recovery opens the GitHub picker with fresh secure OAuth state',async()=>{
 const close=fixture();try {const r=await start.GET(new Request('https://local.test/api/auth/github/start?select_account=1'));const url=new URL(r.headers.get('location'));assert.equal(url.searchParams.get('prompt'),'select_account');assert.equal(url.searchParams.get('state'),'local-opaque-state');assert.equal(r.headers.get('cache-control'),'no-store');assert.ok(state.cookies.every(([value])=>value.httpOnly&&value.secure&&value.sameSite==='lax'));}finally{close();}
});
test('a valid grant plus the protected verified private email creates the admin identity and session',async()=>{
 const close=fixture();try{grant();const r=await callback.GET(oauth());assert.equal(new URL(r.headers.get('location')).pathname,'/admin',JSON.stringify({events:state.events,users:state.sqlite.prepare('SELECT id,role,is_active FROM users').all()}));assert.equal(state.sessions.length,1);assert.ok(state.sessionCookie);assert.equal(state.sqlite.prepare('SELECT github_login FROM admin_github_identities').get().github_login,'test-real-login');assert.equal(state.audit[0].action,'admin.login');}finally{close();}
});
test('wrong account, revoked grant, reused login and unverified email never establish an admin session',async()=>{
 for(const scenario of ['wrong_login','revoked','bound_id','unverified','public_conflict','bad_state']){const close=fixture();try{grant(scenario==='revoked'?{is_active:0}:scenario==='bound_id'?{github_user_id:'999'}:{});if(scenario==='wrong_login')state.github.login='other-person';if(scenario==='unverified')state.emails[0].verified=false;if(scenario==='public_conflict')state.publicConflict=true;const r=await callback.GET(oauth(scenario!=='bad_state'));assert.equal(new URL(r.headers.get('location')).pathname,'/admin/acceso-denegado',scenario);assert.equal(state.sessions.length,0,scenario);assert.equal(state.sqlite.prepare('SELECT count(*) AS n FROM admin_github_identities').get().n,0);assert.ok(state.events.length);assert.equal(state.events[0].metadata.reason,scenario==='bad_state'?'oauth_invalid':scenario==='public_conflict'?'email_conflict':'authorization');if(scenario==='wrong_login'||scenario==='revoked')assert.equal(state.events[0].metadata.cause,'no_active_grant');if(scenario==='bound_id')assert.equal(state.events[0].metadata.cause,'github_identity_mismatch');if(scenario==='unverified')assert.equal(state.events[0].metadata.cause,'verified_email_mismatch');assert.ok(!JSON.stringify(state.events).includes('team@example.test'));}finally{close();}}
});
test('invitation validates input/existence on the server and preserves normalized verified-at-login data',async()=>{
 const close=fixture();try{state.admin={id:'owner',accessLevel:'owner',isProtectedOwner:true};for(const [values,notice]of[[{github_login:'bad user',protected_email:'a@test.cl'},'invalid_login'],[{github_login:'test-user',protected_email:'a..b@test.cl'},'invalid_email']]){const r=await invite.POST(post({...values,access_level:'moderator'}));assert.equal(r.status,400);assert.equal((await r.json()).notice,notice);assert.equal(state.fetches,0);}
 state.lookupResponse=new Response(null,{status:404});let r=await invite.POST(post({github_login:'test-user',protected_email:'team@example.test',access_level:'moderator'}));assert.equal((await r.json()).notice,'github_missing');assert.equal(state.sqlite.prepare('SELECT count(*) AS n FROM admin_github_access').get().n,0);
 state.lookupResponse=null;r=await invite.POST(post({github_login:'@TEST-USER',protected_email:'TEAM@example.test',access_level:'administrator'}));assert.equal(r.status,200);const row=state.sqlite.prepare('SELECT * FROM admin_github_access').get();assert.equal(row.github_login,'test-user');assert.equal(row.github_user_id,'101');assert.equal(row.protected_email,'team@example.test');assert.equal(state.sessions.length,0);assert.equal(state.audit[0].action,'admin.grant_create');}finally{close();}
});
test('only the owner can correct an unused invitation; linked identities and stale forms are immutable',async()=>{
 const close=fixture();try{grant({github_login:'visible-name'});const request=()=>post({intent:'login',previous_login:'visible-name',github_login:'test-real-login'},false);const params={params:Promise.resolve({grantId:'grant'})};state.admin={id:'moderator',accessLevel:'moderator'};assert.equal((await edit.POST(request(),params)).status,403);state.admin={id:'owner',accessLevel:'owner',isProtectedOwner:true};let r=await edit.POST(request(),params);assert.equal(new URL(r.headers.get('location')).searchParams.get('notice'),'login_updated');let row=state.sqlite.prepare('SELECT * FROM admin_github_access').get();assert.equal(row.github_login,'test-real-login');assert.equal(row.protected_email,'team@example.test');assert.equal(row.access_level,'administrator');assert.equal(state.audit[0].action,'admin.grant_login_correct');r=await edit.POST(request(),params);assert.equal(new URL(r.headers.get('location')).searchParams.get('notice'),'identity_bound');state.sqlite.exec("UPDATE admin_github_access SET user_id='linked'");r=await edit.POST(post({intent:'login',previous_login:'test-real-login',github_login:'different'},false),params);assert.equal(new URL(r.headers.get('location')).searchParams.get('notice'),'identity_bound');}finally{close();}
});
