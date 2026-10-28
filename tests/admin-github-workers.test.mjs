import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {readFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
// Exercise the actual request options in workerd, whose redirect contract is
// narrower than Node fetch. No network, credentials or persistent data.
const require=createRequire(pathToFileURL(await realpath(new URL('../node_modules/wrangler/package.json',import.meta.url))));
const {Miniflare}=await import(pathToFileURL(require.resolve('miniflare')).href);
test('GitHub invitation lookup uses workerd-supported manual redirects without leaking app credentials',async()=>{
 const source=stripTypeScriptTypes((await readFile(new URL('../lib/admin-github-account.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,''));
 const requests=[];
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-22',outboundService:async request=>{
   requests.push({url:request.url,authorization:request.headers.get('authorization')});
   const login=new URL(request.url).pathname.split('/').at(-1);
   if(login==='missing-user')return new Response(null,{status:404});
   if(login==='rate-limited')return new Response(null,{status:429,headers:{'x-ratelimit-remaining':'0'}});
   if(login==='redirect-user')return new Response(null,{status:302,headers:{location:'https://untrusted.example.test'}});
   return Response.json({login,id:101,type:login==='org-user'?'Organization':'User'});
 },script:`const events=[];const getGitHubOAuthConfig=async()=>({clientId:'test-client',clientSecret:'test-secret'});const recordOperationalEvent=async e=>events.push(e);const validGithubLogin=value=>/^[a-z-]+$/.test(value);${source}\nexport default {async fetch(){const results=[];for(const login of ['valid-user','missing-user','org-user','rate-limited','redirect-user'])results.push(await lookupGithubAccount(login));return Response.json({results,events});}}`});
 try{
  const response=await mf.dispatchFetch('http://local.test'),data=await response.json();
  assert.deepEqual(data.results,[{login:'valid-user',id:'101'},{error:'github_missing'},{error:'github_organization'},{error:'github_unavailable'},{error:'github_unavailable'}]);
  assert.equal(requests.length,5);assert.ok(requests.every(r=>new URL(r.url).hostname==='api.github.com'&&!r.url.includes('test-secret')&&r.authorization==='Basic '+Buffer.from('test-client:test-secret').toString('base64')));
  assert.equal(data.events[0].metadata.cause,'rate_limit');assert.equal(data.events[1].metadata.status,302);assert.ok(!JSON.stringify(data).includes('test-secret'));
 }finally{await mf.dispose();}
});
