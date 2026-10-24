// Loopback-only metadata validation and private object registration.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const f=JSON.parse(readFileSync('outputs/qa-account-stories.json','utf8'));
assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
const db=new DatabaseSync('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite',{readOnly:true});
try{
 const row=()=>db.prepare('SELECT id,revision FROM private_profile_samples WHERE created_by=? AND display_name=? AND migrated_at IS NULL').get(f.prefix+'_admin','QA presentación Auxiliar');
 const original=row();assert.ok(original);
 for(const valid of [false,true]){
  const sample=row(),body=new FormData();
  for(const [key,value] of Object.entries({sample_action:'upload',review_key:'sample:'+sample.id,review_revision:String(sample.revision)}))body.set(key,value);
  const bytes=valid?readFileSync('outputs/qa-video-3s.mp4'):Buffer.from([0,0,0,16,102,116,121,112,105,115,111,109,0,0,0,0]);
  body.set('file',new Blob([bytes],{type:'video/mp4'}),'qa-video.mp4');
  const response=await fetch('http://127.0.0.1:3880/api/admin/muestras/'+sample.id,{method:'POST',body,headers:{cookie:f.cookies.admin,origin:'http://127.0.0.1:3880',accept:'application/json'},signal:AbortSignal.timeout(30000)});
  const result=await response.json();assert.equal(response.status,valid?200:400,JSON.stringify(result));
  if(!valid)assert.equal(row().revision,sample.revision);else assert.equal(result.revision,sample.revision+2);
 }
 assert.equal(db.prepare('SELECT count(*) n FROM private_sample_media WHERE sample_id=? AND media_type=?').get(original.id,'video').n,1);
 console.log('PASS rejected a forged video before storage; accepted a real H.264 video, private ownership and exact commit revision.');
}finally{db.close();}
