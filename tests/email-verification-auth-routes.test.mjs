import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

// Execute the real route logic with isolated dependencies. No CAPTCHA bypass,
// network request, real session, email or production DB is used by these tests.
const pathUrl = path => JSON.stringify(new URL(`../${path}`,import.meta.url).href);
const fixtureModule = `data:text/javascript,${encodeURIComponent(`
 const state = () => globalThis.__emailRouteQA;
 export const users={}, accountAppleIdentities={},accountGoogleIdentities={},accountXIdentities={},accountAuthEvents={},xRegistrationIntents={};
 export const and=(...x)=>x, eq=(...x)=>x;
 export const TURNSTILE_AUTH_LOGIN_ACTION='login', TURNSTILE_AUTH_REGISTER_ACTION='register';
 export const ACCOUNT_REACTIVATION_COOKIE='reactivate', ACCOUNT_REACTIVATION_DURATION_SECONDS=600;
 export const MIN_PASSWORD_LENGTH=10, GOOGLE_REGISTRATION_COOKIE='google', APPLE_REGISTRATION_COOKIE='apple',X_REGISTRATION_COOKIE='x',registrationStateCookie='form';
 export const NextRequest=Request;
 export const NextResponse={redirect(url,status){const response=new Response(null,{status,headers:{location:url.toString()}}); response.cookies={set(...args){state().cookies.push(args)},delete(){}};return response;}};
 export function assertSameOrigin(request){if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('origin');}
 export async function getDb(){return {select(){return {from(){return {where(){return {limit:async()=>state().existing?[state().existing]:[]}}}}}},insert(){return {values:async value=>{state().inserted.push(value)}}}};}
 export const safeAccountReturnTo=value=>value?.startsWith('/mi-cuenta')?value:'/mi-cuenta';
 export const sessionCookieOptions=()=>({httpOnly:true,sameSite:'lax'}),getUserSessionCookieName=()=> 'local-user-session',getUserSessionDuration=()=>2592000;
 export async function createUserSession(id,request,method){state().sessions.push({id,method});return 'test-only-session';}
 export async function hashPassword(){return 'not-a-real-password-hash';} export async function verifyPassword(){return state().passwordCorrect;}
 export async function verifyTurnstile(){return state().captchaValid;}
 export async function createAccountReactivationIntent(){state().reactivations++;return 'test-reactivation';}
 export function readAccountIdentity(){return {firstName:'Local',documentType:'foreign',documentNumber:'LOCAL',foreignCountry:'Test',birthDate:'1990-01-01',city:'Concepción',phone:''};}
 export const encodeRegistrationState=()=>'',registrationStateFromForm=()=>({});
 export async function generateUniqueAccountUsername(){return 'local-test';} export async function isReservedAdminEmail(){return false;}
 export async function readGoogleRegistrationIntent(){return null;} export async function readAppleRegistrationIntent(){return null;}
 export async function readXRegistrationIntent(){return null;}
 export async function consumeGoogleRegistrationIntent(){} export async function consumeAppleRegistrationIntent(){}
 export async function createAdminNotification(){} export async function recordOperationalEvent(){}
 export async function requestVerificationEmail(){if(state().mailThrows)throw Error('isolated delivery failure');return state().delivered;}
`)}`;
async function loadRoute(path) {
 let source=await readFile(new URL(`../${path}`,import.meta.url),'utf8');
 source=source.replace(/from "([^"\n]+)"/g,(_match,name)=>`from ${name==='@/lib/email-verification-policy'?pathUrl('lib/email-verification-policy.ts'):JSON.stringify(fixtureModule)}`);
 return import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
}
const register = await loadRoute('app/api/auth/register/route.ts');
const login = await loadRoute('app/api/auth/login/route.ts');
function fixture(overrides={}) {
 globalThis.__emailRouteQA={existing:null,inserted:[],cookies:[],sessions:[],reactivations:0,passwordCorrect:true,captchaValid:true,delivered:false,mailThrows:false,...overrides};
 return globalThis.__emailRouteQA;
}
function request(path, values={}) {
 const form=new FormData();for(const [key,value] of Object.entries({display_name:'Test local',email:'test@example.invalid',password:'test-only-not-used',password_confirmation:'test-only-not-used',adult_confirmed:'yes',legal_confirmed:'yes',return_to:'/mi-cuenta',...values}))form.set(key,value);
 const request=new Request('https://chile3x.cl'+path,{method:'POST',body:form,headers:{origin:'https://chile3x.cl'}});request.cookies={get(){return undefined;}};return request;
}
test('password registration creates an immediate session with a 7-day deadline even if mail delivery fails', async(t)=>{
 t.mock.method(console,'error',()=>{});
 try {for(const mailThrows of [false,true]) {
  const state=fixture({mailThrows}); const started=Date.now(); const response=await register.POST(request('/api/auth/register'));
  assert.equal(response.status,303);assert.match(response.headers.get('location'),/^https:\/\/chile3x.cl\/mi-cuenta\?/);
  assert.equal(state.inserted.length,1);assert.equal(state.inserted[0].emailVerifiedAt,null);assert.equal(state.inserted[0].registrationAuthMethod,'password');
  assert.ok(Date.parse(state.inserted[0].emailVerificationDeadline)>=started+7*86400000);
  assert.equal(state.sessions.length,1);assert.equal(state.sessions[0].method,'password');assert.equal(state.cookies[0][0].value,'test-only-session');
 }}finally{delete globalThis.__emailRouteQA;}
});
test('password login admits grace, restricts expired accounts and never overrides administrative/self blocks', async()=>{
 try {for(const [changes,destination] of [
  [{},'/mi-cuenta'],[{emailVerificationDeadline:'2000-01-01T00:00:00Z'},'/verificar-correo'],
  [{emailVerificationDeadline:'2000-01-01T00:00:00Z',emailVerificationExemptAt:'2026-01-01'},'/mi-cuenta'],
  [{adminDisabledAt:'2026-01-01'},'/ingresar'],[{isActive:false},'/ingresar'],[{selfDisabledAt:'2026-01-01',isActive:false},'/reactivar-cuenta'],
 ]) {
  const state=fixture({existing:{id:'local',role:'visitor',createdAt:new Date().toISOString(),passwordHash:'fake',emailVerifiedAt:null,emailVerificationDeadline:new Date(Date.now()+7*86400000).toISOString(),emailVerificationExemptAt:null,isActive:true,selfDisabledAt:null,adminDisabledAt:null,...changes}});
  const response=await login.POST(request('/api/auth/login'));assert.equal(new URL(response.headers.get('location')).pathname,destination);
  assert.equal(state.sessions.length,destination==='/mi-cuenta'||destination==='/verificar-correo'?1:0);
 }}finally{delete globalThis.__emailRouteQA;}
});
test('registration and login preserve anti-spam rejection',async()=>{
 try {for(const route of [register,login]) {const state=fixture({captchaValid:false});const response=await route.POST(request('/api/auth/register'));assert.match(response.headers.get('location'),/error=antispam/);assert.equal(state.sessions.length,0);assert.equal(state.inserted.length,0);}}
 finally{delete globalThis.__emailRouteQA;}
});
