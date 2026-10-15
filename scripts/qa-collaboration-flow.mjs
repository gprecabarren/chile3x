// End-to-end writes are restricted to disposable fixtures on local Worker/D1/R2.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const fixture=JSON.parse(readFileSync('outputs/qa-account-moderation.json','utf8'));
assert.match(fixture.prefix,/^qa_account_[a-f0-9]+$/);
const origins={admin:'http://127.0.0.1:3002',admin2:'http://127.0.0.1:3005',owner:'http://127.0.0.1:3001'};
const uploaded=[];
async function send(role,path,body,method='POST'){
 const origin=origins[role];const response=await fetch(origin+path,{method,body,headers:{origin,accept:'application/json'},signal:AbortSignal.timeout(30_000),redirect:'manual'});
 const result=await response.json();return {response,result};
}
async function version(id){const response=await fetch(origins.admin+'/api/admin/colaboracion?key='+encodeURIComponent('profile:'+id));assert.equal(response.status,200);const result=await response.json();return result.resources[0].revision;}
async function lease(role,id,intent,token=''){const form=new FormData();form.set('key','profile:'+id);form.set('intent',intent);form.set('token',token);return send(role,'/api/admin/colaboracion',form);}
async function upload(role,id,revision){
 const form=new FormData();form.set('review_key','profile:'+id);form.set('review_revision',String(revision));form.set('upload_kind','gallery');form.set('file',new File([readFileSync('public/favicon-192.png')],'qa-only-logo.png',{type:'image/png'}));
 const response=await send(role,(role==='owner'?'/api/perfiles/':'/api/admin/profiles/')+id+'/media',form);
 if(response.result.media)uploaded.push({profileId:id,id:response.result.media.id});return response;
}
const id=fixture.profiles[3],ownerProfile=fixture.profiles[0];let token;
try{
 const claim=await lease('admin',id,'claim');assert.equal(claim.response.status,200);token=claim.result.token;
 assert.equal((await lease('admin2',id,'claim')).response.status,409);
 assert.equal((await lease('admin',id,'renew',token)).response.status,200);
 assert.equal((await lease('admin2',id,'renew',token)).response.status,409);
 assert.equal((await upload('admin2',id,await version(id))).response.status,409);
 await lease('admin',id,'release',token);token=undefined;
 console.log('PASS: competing review claims, renewal ownership and blocked cross-admin upload');
 const revision=await version(id),races=await Promise.all([upload('admin',id,revision),upload('admin2',id,revision)]);
 assert.deepEqual(races.map(item=>item.response.status).sort(),[201,409]);
 console.log('PASS: simultaneous uploads have one committed winner and one explicit conflict');
 const ownerRevision=await version(ownerProfile),ownerLease=await lease('admin',ownerProfile,'claim');assert.equal(ownerLease.response.status,200);
 try{
  const first=await upload('owner',ownerProfile,ownerRevision);assert.equal(first.response.status,201);assert.equal(first.result.media.moderationStatus,'pending');
  const second=await upload('owner',ownerProfile,first.result.revision);assert.equal(second.response.status,201);
  const stale=await upload('owner',ownerProfile,ownerRevision);assert.equal(stale.response.status,409);
 }finally{await lease('admin',ownerProfile,'release',ownerLease.result.token);}
 console.log('PASS: owner uploads remain pending, use returned versions sequentially and invalidate stale reviews');
}finally{
 if(token)await lease('admin',id,'release',token);
 for(const media of uploaded){const form=new FormData();form.set('review_key','profile:'+media.profileId);form.set('review_revision',String(await version(media.profileId)));const result=await send('admin',`/api/admin/profiles/${media.profileId}/media/${media.id}`,form,'DELETE');assert.equal(result.response.status,200);}
 console.log('Disposable local upload records and objects removed. No production writes or real emails.');
}
