import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/d1';
import {getTableConfig} from 'drizzle-orm/sqlite-core';
import {adminFormTarget} from '../lib/admin-form-target.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('administrative submission uses native attributes despite action/method named controls and respects button overrides',()=>{
  const attributes=values=>({getAttribute:name=>values[name]??null,get action(){throw Error('Named control shadowed action');},get method(){throw Error('Named control shadowed method');}});
  const form=attributes({action:'/api/admin/users/local-account',method:'post'}),current='https://chile3x.cl/admin/cuentas/local-account';
  assert.equal(adminFormTarget(form,undefined,current).pathname,'/api/admin/users/local-account');
  assert.equal(adminFormTarget(form,attributes({formaction:'/api/admin/users/another-account'}),current).pathname,'/api/admin/users/another-account');
  assert.equal(adminFormTarget(form,attributes({formmethod:'get'}),current),null);
  assert.equal(adminFormTarget(form,attributes({formaction:'https://other.invalid/action'}),current),null);
  assert.equal(adminFormTarget(attributes({method:'post'}),undefined,current).href,current);
});

test('password admin update, login and owner change execute real hashing and transactional session revocation',async t=>{
  const sqlite=new DatabaseSync(':memory:');
  const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),execute(){const s=sqlite.prepare(query);if(s.columns().length)return{results:s.all(...args)};const r=s.run(...args);return{results:[],meta:{changes:Number(r.changes)}};},async all(){return this.execute();},async run(){return this.execute();},async raw(){const s=sqlite.prepare(query);s.setReturnArrays(true);return s.all(...args);}});
  const binding={prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  const state=globalThis.__passwordAuthQA={db:drizzle(binding),admin:{id:'admin',role:'admin',accessLevel:'administrator',githubLogin:'local-admin'},user:null,cookies:[],headers:new Headers(),captcha:true};
  const dbStub='data:text/javascript,'+encodeURIComponent('export const getDb=async()=>globalThis.__passwordAuthQA.db;');
  const headerStub='data:text/javascript,'+encodeURIComponent('export const headers=async()=>globalThis.__passwordAuthQA.headers;export const cookies=async()=>({get(name){const item=(globalThis.__passwordAuthQA.headers.get("cookie")??"").split("; ").find(x=>x.startsWith(name+"="));return item?{value:item.slice(name.length+1)}:undefined;}});');
  const authCode=(await source('lib/auth.ts')).replace(/from "([^"\n]+)"/g,(_match,path)=>'from '+JSON.stringify(path==='@/db'?dbStub:path==='next/headers'?headerStub:path==='react'?import.meta.resolve('react'):path.startsWith('@/')?new URL('../'+path.slice(2)+'.ts',import.meta.url).href:path.startsWith('./')?new URL('../lib/'+path.slice(2)+'.ts',import.meta.url).href:import.meta.resolve(path)));
  const authUrl='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(authCode)).toString('base64');
  const hooks=registerHooks({resolve(specifier,context,next){const stubs={
    '@/db':dbStub,'next/headers':headerStub,
    '@/lib/auth':'data:text/javascript,'+encodeURIComponent(`export * from ${JSON.stringify(authUrl)};export const getCurrentAdmin=async()=>globalThis.__passwordAuthQA.admin;export const getCurrentUser=async()=>globalThis.__passwordAuthQA.user;`),
    'next/server':'data:text/javascript,'+encodeURIComponent('export const NextRequest=Request;export const NextResponse={redirect(url,status){const r=new Response(null,{status,headers:{location:String(url)}});r.cookies={set(value){globalThis.__passwordAuthQA.cookies.push(value);}};return r;},json:Response.json};'),
    '@/lib/account-email':'data:text/javascript,'+encodeURIComponent('export const createAccountToken=async()=>{throw Error("Unexpected email token")};export const sendAccountEmail=async()=>{throw Error("Unexpected email delivery")};'),
    '@/lib/turnstile-server':'data:text/javascript,'+encodeURIComponent('export const verifyTurnstile=async()=>globalThis.__passwordAuthQA.captcha;'),
    '@/lib/operations':'data:text/javascript,'+encodeURIComponent('export const recordOperationalEvent=async()=>{};'),
  };if(stubs[specifier])return{url:stubs[specifier],shortCircuit:true};if(specifier.startsWith('@/'))return{url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};if((specifier.startsWith('./')||specifier.startsWith('../'))&&!/\.[a-z]+$/i.test(specifier))return{url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context);}});
  try{
    const schema=await import('../db/schema.ts');for(const table of Object.values(schema)){let config;try{config=getTableConfig(table);}catch{continue;}if(['collaboration_guards','review_reservations','settings_revision'].includes(config.name))continue;sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${config.columns.filter(c=>c.name!=='revision').map(c=>`"${c.name}" ${c.getSQLType()}${c.primary?' PRIMARY KEY':''}`).join(',')})`);}
    sqlite.exec(await source('drizzle/0056_admin_collaboration.sql'));sqlite.exec('CREATE UNIQUE INDEX qa_browser_session_unique ON auth_sessions(browser_key_hash)');
    sqlite.exec("INSERT INTO users(id,email,role,is_active,email_verified_at) VALUES('admin','admin@example.invalid','admin',1,'2026-01-01'),('owner','owner@example.invalid','advertiser',1,'2026-01-01'),('other','other@example.invalid','advertiser',1,'2026-01-01')");
    const auth=await import(authUrl),adminRoute=await import('../app/api/admin/users/[userId]/route.ts'),login=await import('../app/api/auth/login/route.ts'),ownerRoute=await import('../app/api/mi-cuenta/datos/route.ts');
    const old='old-'+crypto.randomUUID(),next='next-'+crypto.randomUUID(),final='final-'+crypto.randomUUID(),initialHash=await auth.hashPassword(old);sqlite.prepare("UPDATE users SET password_hash=? WHERE id='owner'").run(initialHash);
    sqlite.exec("INSERT INTO auth_sessions(id,user_id,token_hash) VALUES('old-a','owner','a'),('old-b','owner','b'),('other-session','other','other'); INSERT INTO account_tokens(id,user_id,purpose,token_hash,expires_at) VALUES('reset','owner','reset_password','reset',9999999999999),('verify','owner','verify_email','verify',9999999999999)");
    function request(path,values={},origin='https://chile3x.cl',cookie='__Host-chile3x_browser='+'A'.repeat(43)){state.cookies=[];const body=new FormData();for(const[k,v]of Object.entries(values))body.set(k,String(v));const r=new Request('https://chile3x.cl'+path,{method:'POST',headers:{origin,cookie},body});state.headers=r.headers;return r;}
    const adminCall=(values={},options={})=>adminRoute.POST(request('/api/admin/users/owner',{action:'set_password',password:next,return_to:'/admin/cuentas/owner',review_key:'account:owner',review_revision:sqlite.prepare("SELECT revision FROM users WHERE id='owner'").get().revision,...values},options.origin),{params:Promise.resolve({userId:options.userId??'owner'})});
    await t.test('CSRF, authorization, missing account, invalid passwords and stale revisions do not change credentials',async()=>{
      assert.equal((await adminCall({}, {origin:'https://foreign.invalid'})).status,403);state.admin=null;assert.equal((await adminCall()).status,401);state.admin={id:'admin',role:'admin',accessLevel:'administrator',githubLogin:'local-admin'};
      assert.match((await adminCall({}, {userId:'gone'})).headers.get('location'),/notice=account_missing/);
      for(const password of['short','x'.repeat(257)])assert.match((await adminCall({password})).headers.get('location'),/notice=password_invalid/);
      assert.equal((await adminCall({review_revision:0})).status,409);assert.equal(sqlite.prepare("SELECT password_hash FROM users WHERE id='owner'").get().password_hash,initialHash);assert.equal(sqlite.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='owner'").get().n,2);
    });
    await t.test('admin change saves a real hash, revokes target sessions/reset tokens, preserves others and audits the action',async()=>{
      const response=await adminCall({mutation_id:crypto.randomUUID()});assert.match(response.headers.get('location'),/notice=password_updated/);const saved=sqlite.prepare("SELECT password_hash FROM users WHERE id='owner'").get().password_hash;
      assert.notEqual(saved,next);assert.equal(await auth.verifyPassword(next,saved),true);assert.equal(await auth.verifyPassword(old,saved),false);assert.equal(sqlite.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='owner'").get().n,0);assert.equal(sqlite.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='other'").get().n,1);assert.deepEqual(sqlite.prepare("SELECT purpose FROM account_tokens WHERE user_id='owner'").all().map(r=>r.purpose),['verify_email']);assert.equal(sqlite.prepare("SELECT count(*) n FROM admin_audit_logs WHERE action='account.password_update'").get().n,1);assert.equal(sqlite.prepare('SELECT count(*) n FROM admin_mutation_receipts').get().n,1);
    });
    await t.test('verified login distinguishes email/password errors without returning identities and keeps only a short email retry cookie',async()=>{
      for(const[email,password,error]of[['owner@example.invalid',old,'password_incorrect'],['unknown@example.invalid',next,'email_unknown']]){const r=await login.POST(request('/api/auth/login',{email,password,return_to:'/mi-cuenta'}));const destination=new URL(r.headers.get('location'));assert.equal(destination.searchParams.get('error'),error);assert.equal(destination.searchParams.has('email'),false);assert.equal(destination.searchParams.has('userId'),false);const cookie=state.cookies.find(c=>c.name==='chile3x_login_email');assert.equal(cookie.value,email);assert.equal(cookie.httpOnly,true);assert.equal(cookie.secure,true);assert.equal(cookie.path,'/ingresar');assert.equal(cookie.maxAge,300);assert.ok(!JSON.stringify(state.cookies).includes(password));}
      for(const[email,password,error]of[['bad address',next,'email_format'],['owner@example.invalid','','password_required']])assert.equal(new URL((await login.POST(request('/api/auth/login',{email,password}))).headers.get('location')).searchParams.get('error'),error);
      state.captcha=false;for(const email of['owner@example.invalid','unknown@example.invalid'])assert.match((await login.POST(request('/api/auth/login',{email,password:next}))).headers.get('location'),/error=antispam/);state.captcha=true;
    });
    let currentSession;
    await t.test('new password can sign in and creates a real browser-bound session while clearing retry email',async()=>{
      const r=await login.POST(request('/api/auth/login',{email:'owner@example.invalid',password:next}));assert.equal(new URL(r.headers.get('location')).pathname,'/mi-cuenta');const cookie=state.cookies.find(c=>c.name==='chile3x_user_session'&&c.value);assert.ok(cookie);currentSession=cookie.value;assert.equal(sqlite.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='owner'").get().n,1);assert.equal(state.cookies.find(c=>c.name==='chile3x_login_email').maxAge,0);
    });
    await t.test('normal password change keeps this session, revokes other sessions/reset tokens and stores a valid replacement hash',async()=>{
      sqlite.exec("INSERT INTO auth_sessions(id,user_id,token_hash) VALUES('another-owner-device','owner','device');INSERT INTO account_tokens(id,user_id,purpose,token_hash,expires_at) VALUES('reset-again','owner','reset_password','again',9999999999999)");state.user={id:'owner'};
      const r=await ownerRoute.POST(request('/api/mi-cuenta/datos',{action:'change_password',password:final,password_confirmation:final},'https://chile3x.cl','__Host-chile3x_browser='+'A'.repeat(43)+'; chile3x_user_session='+currentSession));assert.match(r.headers.get('location'),/notice=password_saved/);assert.deepEqual(sqlite.prepare("SELECT id FROM auth_sessions WHERE user_id='owner'").all().map(r=>r.id),[currentSession.split('.')[0]]);assert.equal(sqlite.prepare("SELECT count(*) n FROM account_tokens WHERE purpose='reset_password'").get().n,0);assert.equal(await auth.verifyPassword(final,sqlite.prepare("SELECT password_hash FROM users WHERE id='owner'").get().password_hash),true);
    });
  }finally{hooks.deregister();sqlite.close();delete globalThis.__passwordAuthQA;}
});
