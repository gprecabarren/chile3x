import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.ts';
import { browserSessionState, parseSessionToken, sessionMatchesMode } from '../lib/session-policy.ts';

const url = path => new URL('../'+path, import.meta.url).href;
const stub = 'data:text/javascript,'+encodeURIComponent(`
 export const safeAdminReturnTo=value=>value||'/admin', safeAccountReturnTo=value=>value||'/mi-cuenta';
 export const cache=fn=>fn;
 export const headers=async()=>globalThis.__sessionIsolation.headers;
 export const getDb=async()=>globalThis.__sessionIsolation.db;
`);
let emailSource=await readFile(new URL('../lib/admin-email.ts',import.meta.url),'utf8');
emailSource=emailSource.replace(/from "([^"\n]+)"/g,(_match,path)=>'from '+JSON.stringify(path==='drizzle-orm'?import.meta.resolve('drizzle-orm'):path==='@/db/schema'?url('db/schema.ts'):stub));
const emailUrl='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(emailSource)).toString('base64');
const emailPolicy=await import(emailUrl);
let source = await readFile(new URL('../lib/auth.ts',import.meta.url),'utf8');
source=source.replace(/from "([^"\n]+)"/g,(_match,path)=> 'from '+JSON.stringify(path==='drizzle-orm'?import.meta.resolve('drizzle-orm'):path==='@/db/schema'?url('db/schema.ts'):path==='@/lib/admin-email'?emailUrl:path==='@/lib/session-policy'?url('lib/session-policy.ts'):path==='@/lib/session-context'?url('lib/session-context.ts'):path==='@/lib/email-verification-policy'?url('lib/email-verification-policy.ts'):stub));
const authUrl='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64');
const auth=await import(authUrl);
let completionSource=await readFile(new URL('../lib/apple-session-completion.ts',import.meta.url),'utf8');
completionSource=completionSource.replace(/from "([^"\n]+)"/g,(_match,path)=>'from '+JSON.stringify(path==='drizzle-orm'?import.meta.resolve('drizzle-orm'):path==='@/db/schema'?url('db/schema.ts'):path==='@/lib/auth'?authUrl:path==='@/lib/session-policy'?url('lib/session-policy.ts'):stub));
const completion=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(completionSource)).toString('base64'));
const hash=secret=>createHash('sha256').update(secret).digest('hex');

function fixture(cookie='') {
 const sqlite = new DatabaseSync(':memory:');
 sqlite.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,username TEXT,display_name TEXT,role TEXT,is_active INT,created_at TEXT,email_verified_at TEXT,email_verification_deadline TEXT,email_verification_exempt_at TEXT);
 CREATE TABLE auth_sessions(id TEXT PRIMARY KEY,user_id TEXT,token_hash TEXT,auth_method TEXT,ip_address TEXT,user_agent TEXT,country_code TEXT,region TEXT,city TEXT,timezone TEXT,last_seen_at TEXT,expires_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE admin_github_access(id TEXT,user_id TEXT,access_level TEXT,github_login TEXT,is_protected_owner INT,is_active INT,protected_email TEXT);
 CREATE TABLE admin_github_identities(id TEXT,user_id TEXT,github_email TEXT);
 CREATE TABLE account_google_identities(id TEXT,user_id TEXT,google_email TEXT);
 CREATE TABLE account_apple_identities(id TEXT,user_id TEXT,apple_email TEXT);
 CREATE TABLE auth_session_completions(id TEXT PRIMARY KEY,user_id TEXT,token_hash TEXT,return_to TEXT,previous_sessions TEXT,expires_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
 const now=new Date().toISOString(), expires=new Date(Date.now()+3600000).toISOString();
 for(const [id,role,method] of [['user','advertiser','password'],['admin','admin','github']]) {
  sqlite.prepare('INSERT INTO users VALUES(?,?,?,?,?,1,?,?,NULL,NULL)').run(id,id+'@example.invalid',id,'QA '+id,role,now,now);
  sqlite.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,last_seen_at,expires_at) VALUES(?,?,?,?,?,?)').run(id,id,hash('secret-'+id),method,now,expires);
 }
 sqlite.prepare('INSERT INTO admin_github_access(id,user_id,access_level,github_login,is_protected_owner,is_active) VALUES(?,?,?,?,1,1)').run('grant','admin','owner','qa-admin');
 const binding={prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return {async raw(){statement.setReturnArrays(true);return statement.all(...args)},async run(){return {success:true,meta:statement.run(...args)}},async all(){return {results:statement.all(...args)}}};}}}};
 globalThis.__sessionIsolation={headers:new Headers({cookie}),db:drizzle(binding,{schema})};
 return {sqlite,setCookie(value){globalThis.__sessionIsolation.headers=new Headers({cookie:value})},close(){sqlite.close();delete globalThis.__sessionIsolation;}};
}

test('strict token and cookie policy reject ambiguity without reinterpreting credentials',()=>{
 for(const value of ['a.b.c','a%2Eb','a.b.','a..b','a.b c','a.'.repeat(500)]) assert.equal(parseSessionToken(value),null);
 assert.deepEqual(parseSessionToken('session_id.secret-value'),{id:'session_id',secret:'secret-value'});
 for(const cookie of ['chile3x_user_session=user.secret; chile3x_admin_session=admin.secret','chile3x_user_session=; chile3x_user_session=user.secret','chile3x_user_session=user.secret; chile3x_admin_session=malformed']) assert.equal(browserSessionState(cookie).conflict,true);
 assert.equal(sessionMatchesMode('account','admin','password'),false);
 assert.equal(sessionMatchesMode('admin','admin','unknown'),false);
 assert.equal(sessionMatchesMode('admin','admin','password'),false);
});

test('real auth readers never resolve two identities or accept tokens in the wrong mode',async()=>{
 const f=fixture();try {
  f.setCookie('chile3x_user_session=user.secret-user'); assert.equal((await auth.getCurrentUser()).id,'user'); assert.equal(await auth.getCurrentAdmin(),null);
  f.setCookie('chile3x_admin_session=admin.secret-admin'); assert.equal((await auth.getCurrentAdmin()).id,'admin'); assert.equal(await auth.getCurrentUser(),null);
  for(const cookie of ['chile3x_user_session=user.secret-user; chile3x_admin_session=admin.secret-admin','chile3x_user_session=admin.secret-admin','chile3x_admin_session=user.secret-user','chile3x_user_session=user%2Esecret-user','chile3x_user_session=user.secret-user.extra','chile3x_user_session=x.y; chile3x_user_session=user.secret-user']) {
   f.setCookie(cookie);assert.equal(await auth.getCurrentUser(),null,cookie);assert.equal(await auth.getCurrentAdmin(),null,cookie);assert.equal(await auth.getVerificationUser(),null,cookie);
  }
  f.setCookie('chile3x_admin_session=admin.secret-admin'); f.sqlite.exec("UPDATE auth_sessions SET auth_method='password' WHERE id='admin'");assert.equal(await auth.getCurrentAdmin(),null);
  f.setCookie('chile3x_user_session=user.secret-user');f.sqlite.exec("UPDATE admin_github_access SET protected_email='user@example.invalid'");assert.equal(await auth.getCurrentUser(),null);
 } finally {f.close();}
});

test('historical linked-provider collisions fail closed for existing sessions and new password logins',async()=>{
 const f=fixture();try {
  f.sqlite.exec("INSERT INTO account_google_identities VALUES('google','user','Reserved@Example.Invalid'); UPDATE admin_github_access SET protected_email=' reserved@example.invalid '");
  assert.equal(await emailPolicy.isReservedPublicAccountIdentity('user'),true);
  assert.equal(await emailPolicy.hasPublicAccountEmail('reserved@example.invalid'),true);
  assert.equal(await emailPolicy.hasAdministrativeEmailConflict('admin',null),false);
  f.setCookie('chile3x_user_session=user.secret-user');assert.equal(await auth.getCurrentUser(),null);
  f.setCookie('chile3x_admin_session=admin.secret-admin');assert.equal(await auth.getCurrentAdmin(),null);
  await assert.rejects(()=>auth.createUserSession('user',new Request('https://chile3x.cl/login'),'password'),/Esta identidad no puede/);
  await assert.rejects(()=>auth.createAdminSession('admin',new Request('https://chile3x.cl/admin')),/correo está vinculado a una cuenta pública/);
  f.sqlite.exec("UPDATE admin_github_access SET protected_email=NULL; INSERT INTO admin_github_identities VALUES('github','admin','RESERVED@example.invalid')");
  assert.equal(await emailPolicy.hasAdministrativeEmailConflict('admin',null),true);
  f.sqlite.exec("UPDATE account_google_identities SET google_email='safe@example.invalid'; UPDATE admin_github_access SET protected_email='reserved@example.invalid',is_active=0");
  assert.equal(await emailPolicy.isReservedPublicAccountIdentity('user'),false);
  f.sqlite.exec("INSERT INTO account_apple_identities VALUES('apple','user','reserved@example.invalid')");
  assert.equal(await emailPolicy.isReservedPublicAccountIdentity('user'),true);
 }finally{f.close();}
});

test('delayed Apple completion revokes the newer same-browser login and consumes its ticket once',async()=>{
 const f=fixture();try {
  const proofs=await auth.captureBrowserSessionProofs(new Request('https://chile3x.cl/start',{headers:{cookie:'chile3x_admin_session=admin.secret-admin'}}));
  const ticket=await completion.createAppleSessionCompletion('user','/mi-cuenta',proofs);
  const later=await auth.createAdminSession('admin',new Request('https://chile3x.cl/github',{headers:{cookie:'chile3x_admin_session=admin.secret-admin'}}));
  const record=await completion.consumeAppleSessionCompletion(ticket);assert.ok(record);
  assert.equal(await completion.consumeAppleSessionCompletion(ticket),null);
  const token=await auth.createUserSession(record.userId,new Request('https://chile3x.cl/api/auth/apple/finish',{headers:{cookie:`chile3x_admin_session=${later}`}}),'apple');
  await auth.revokeAuthAttemptSessions(record.previousSessions);
  f.setCookie(`chile3x_admin_session=${later}`);assert.equal(await auth.getCurrentAdmin(),null);
  f.setCookie(`chile3x_user_session=${token}`);assert.equal((await auth.getCurrentUser()).id,'user');
  assert.equal(f.sqlite.prepare("SELECT count(*) n FROM auth_sessions WHERE user_id='admin'").get().n,0);
 }finally{f.close();}
});

test('an old conflicting administrative grant can still be revoked without widening access',async()=>{
 const db=new DatabaseSync(':memory:');try {
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,role TEXT);CREATE TABLE admin_github_access(id TEXT PRIMARY KEY,protected_email TEXT,is_active INT);CREATE TABLE admin_github_identities(id TEXT PRIMARY KEY,github_email TEXT);
   CREATE TABLE account_google_identities(id TEXT PRIMARY KEY,user_id TEXT,google_email TEXT);CREATE TABLE account_apple_identities(id TEXT PRIMARY KEY,user_id TEXT,apple_email TEXT);CREATE TABLE apple_auth_attempts(id TEXT);
   INSERT INTO users VALUES('normal','normal@example.invalid','visitor');INSERT INTO admin_github_access VALUES('legacy','normal@example.invalid',1);`);
  db.exec(await readFile(new URL('../drizzle/0045_help_and_session_isolation.sql',import.meta.url),'utf8'));
  db.exec(await readFile(new URL('../drizzle/0046_same_origin_apple_completion.sql',import.meta.url),'utf8'));
  assert.doesNotThrow(()=>db.exec("UPDATE admin_github_access SET is_active=0 WHERE id='legacy'"));
  assert.throws(()=>db.exec("UPDATE admin_github_access SET is_active=1 WHERE id='legacy'"),/public_email_reserved/);
 }finally{db.close();}
});

test('both session switch directions revoke the presented identity but preserve another device',async()=>{
 for(const mode of ['account','admin']) {
  const opposite=mode==='account'?'admin':'user'; const target=mode==='account'?'user':'admin';const f=fixture();try {
   f.sqlite.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,last_seen_at,expires_at) SELECT ?,user_id,token_hash,auth_method,last_seen_at,expires_at FROM auth_sessions WHERE id=?').run('other-device',opposite);
   const request=new Request('https://chile3x.cl/auth',{headers:{cookie:`chile3x_${mode==='account'?'admin':'user'}_session=${opposite}.secret-${opposite}`}});
   const token=await (mode==='account'?auth.createUserSession(target,request):auth.createAdminSession(target,request));
   assert.equal(f.sqlite.prepare('SELECT id FROM auth_sessions WHERE id=?').get(opposite),undefined);
   assert.ok(f.sqlite.prepare('SELECT id FROM auth_sessions WHERE id=?').get('other-device'));
   f.setCookie(`chile3x_${mode==='account'?'admin':'user'}_session=${opposite}.secret-${opposite}`);assert.equal(await auth.getCurrentAdmin(),null);assert.equal(await auth.getCurrentUser(),null);
   f.setCookie(`chile3x_${mode==='account'?'user':'admin'}_session=${token}`);assert.equal((await (mode==='account'?auth.getCurrentUser():auth.getCurrentAdmin())).id,target);
   const cookies=[]; (mode==='account'?auth.setUserSessionCookie:auth.setAdminSessionCookie)({cookies:{set(value){cookies.push(value)}}},token);
   assert.equal(cookies[0].value,token);assert.equal(cookies[1].maxAge,0);assert.notEqual(cookies[0].name,cookies[1].name);
  }finally{f.close();}
 }
});

test('Apple cross-site callback revokes initiation-bound proofs without needing SameSite cookies',async()=>{
 const f=fixture();try {
  const proofs=await auth.captureBrowserSessionProofs(new Request('https://chile3x.cl/start',{headers:{cookie:'chile3x_admin_session=admin.secret-admin'}}));
  assert.ok(!proofs.includes('secret-admin'));
  await auth.revokeAuthAttemptSessions(proofs);assert.equal(f.sqlite.prepare("SELECT id FROM auth_sessions WHERE id='admin'").get(),undefined);
  assert.ok(f.sqlite.prepare("SELECT id FROM auth_sessions WHERE id='user'").get());
  await auth.revokeAuthAttemptSessions(JSON.stringify([{id:'user',hash:hash('wrong')}]));assert.ok(f.sqlite.prepare("SELECT id FROM auth_sessions WHERE id='user'").get());
 }finally{f.close();}
});

test('database admission guards reject case-folded, provider and revoked-grant email collisions in both directions',async()=>{
 const db=new DatabaseSync(':memory:');try {
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,role TEXT);CREATE TABLE admin_github_access(id TEXT PRIMARY KEY,protected_email TEXT,is_active INT);CREATE TABLE admin_github_identities(id TEXT PRIMARY KEY,github_email TEXT);
   CREATE TABLE account_google_identities(id TEXT PRIMARY KEY,user_id TEXT,google_email TEXT);CREATE TABLE account_apple_identities(id TEXT PRIMARY KEY,user_id TEXT,apple_email TEXT);CREATE TABLE apple_auth_attempts(id TEXT);`);
  db.exec(await readFile(new URL('../drizzle/0045_help_and_session_isolation.sql',import.meta.url),'utf8'));
  db.prepare('INSERT INTO admin_github_access VALUES(?,?,0)').run('revoked','Admin@Example.Invalid');
  assert.throws(()=>db.prepare('INSERT INTO users VALUES(?,?,?)').run('bad',' admin@example.invalid ','visitor'),/admin_email_reserved/);
  db.prepare('INSERT INTO users VALUES(?,?,?)').run('normal','normal@example.invalid','visitor');
  db.prepare('INSERT INTO account_google_identities VALUES(?,?,?)').run('google','normal','provider@example.invalid');
  assert.throws(()=>db.prepare('INSERT INTO admin_github_access VALUES(?,?,1)').run('bad','PROVIDER@example.invalid'),/public_email_reserved/);
  assert.throws(()=>db.prepare('INSERT INTO admin_github_identities VALUES(?,?)').run('bad','NORMAL@example.invalid'),/public_email_reserved/);
  assert.throws(()=>db.prepare('UPDATE users SET email=? WHERE id=?').run('admin@example.invalid','normal'),/admin_email_reserved/);
  assert.throws(()=>db.prepare('INSERT INTO account_apple_identities VALUES(?,?,?)').run('bad','normal','admin@example.invalid'),/admin_email_reserved/);
  assert.equal(db.prepare('SELECT email FROM users WHERE id=?').get('normal').email,'normal@example.invalid');
 }finally{db.close();}
});
