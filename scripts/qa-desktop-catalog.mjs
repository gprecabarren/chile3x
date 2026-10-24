// Disposable loopback fixtures only. Extend the existing manifest so its
// normal cleanup removes every profile/story created here.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const manifest='outputs/qa-account-stories.json';
const f=JSON.parse(readFileSync(manifest,'utf8'));
assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
const root=resolve('.wrangler/visual-state');
const dbPath=resolve(root,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(dbPath.startsWith(root+'\\')||dbPath.startsWith(root+'/'));
const db=new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys=ON; BEGIN');
try{
 for(let i=1;i<=24;i++){
  const id=f.prefix+'_desktop_'+i;
  assert.ok(!f.profiles.includes(id),'Desktop fixture already exists.');
  const tier=i<=12?'vip':i<=20?'premium':'bronze';
  const owner=f.prefix+'_desktop_user_'+i;
  db.prepare("INSERT INTO users(id,email,username,display_name,role,is_active,email_verified_at,city) VALUES(?,?,?,?, 'advertiser',1,?,'Concepción')").run(owner,owner+'@example.invalid',owner,'Cuenta visual '+i,new Date().toISOString());
  db.prepare("INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,region,city,tier,is_demo) VALUES(?,?,'escort','approved',?,?,?,'Región del Biobío','Concepción',?,1)").run(id,owner,id,id,'Perfil visual '+String(i).padStart(2,'0'),tier);
  db.prepare('INSERT INTO profile_details(profile_id,metadata) VALUES(?,?)').run(id,JSON.stringify({age:'25'}));
  if(i<=14)db.prepare("INSERT INTO profile_statuses(id,profile_id,body,story_type,expires_at) VALUES(?,?,?,'text',?)").run(id+'_text',id,'Actualización de prueba local. Texto largo para verificar que la actividad y sus botones se lean sin solapamientos, incluso con zoom del navegador.',new Date(Date.now()+24*3600000).toISOString());
  f.profiles.push(id);
  f.users.push(owner);
 }
 // Publish the cleanup manifest before committing so an interrupted process
 // can never leave committed disposable rows outside its deletion scope.
 writeFileSync(manifest,JSON.stringify(f));
 db.exec('COMMIT');
 console.log('PASS 24 local catalog cards and 14 text stories, registered for cleanup.');
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
