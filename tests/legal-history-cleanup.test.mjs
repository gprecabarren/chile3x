import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=source('drizzle/0066_legal_history_cleanup.sql');
const obsolete={terms:['2026.10.27.2','2026.10.27.1','2026.10.26.1','2026.10.14.3'],privacy:['2026.10.27.1','2026.10.26.1','2026.10.17.1','2026.10.14.3']};
function database(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE profile_views(profile_id TEXT,viewed_at TEXT);');
 db.exec(source('drizzle/0057_legal_documents_and_city_popularity.sql'));
 for(const [key,versions] of Object.entries(obsolete)){
  const current=key==='terms'?'2026.10.27.3':'2026.10.27.2';
  db.prepare('UPDATE legal_documents SET version=?,published_json=?,draft_json=?,published_at=?,updated_by=? WHERE id=?').run(current,JSON.stringify({title:`Final ${key}`}),JSON.stringify({title:`Borrador ${key}`}),'2026-10-27T19:31:00Z','local_admin',key);
  for(const version of [...versions,current])db.prepare('INSERT INTO legal_document_versions(id,document_id,version,document_json,published_at) VALUES(?,?,?,?,?)').run(`${key}:${version}`,key,version,JSON.stringify({title:`${key} ${version}`}),version.slice(0,10).replaceAll('.','-'));
 }
 db.exec("INSERT INTO users(id) VALUES('local_fixture'); INSERT INTO account_legal_acceptances(id,user_id,terms_version,privacy_version) VALUES('local_acceptance','local_fixture','2026.10.14.3','2026.10.17.1');");
 return db;
}

test('history cleanup removes the eight requested snapshots and preserves final publications, drafts and acceptance facts',()=>{
 const db=database();
 try{
  const documents=db.prepare('SELECT * FROM legal_documents ORDER BY id').all();
  const acceptances=db.prepare('SELECT * FROM account_legal_acceptances').all();
  db.exec(migration);
  assert.deepEqual(db.prepare('SELECT document_id,version FROM legal_document_versions ORDER BY document_id').all().map(row=>({...row})),[{document_id:'privacy',version:'2026.10.27.2'},{document_id:'terms',version:'2026.10.27.3'}]);
  assert.deepEqual(db.prepare('SELECT * FROM legal_documents ORDER BY id').all(),documents);
  assert.deepEqual(db.prepare('SELECT * FROM account_legal_acceptances').all(),acceptances);
  db.exec(migration);
  assert.equal(db.prepare('SELECT count(*) n FROM legal_document_versions').get().n,2);
  assert.deepEqual(db.prepare('SELECT * FROM legal_documents ORDER BY id').all(),documents);
 }finally{db.close();}
});

test('history cleanup protects a currently published target and leaves unrequested versions and future numbering available',()=>{
 const db=database();
 try{
  db.exec("UPDATE legal_documents SET version='2026.10.27.1' WHERE id='privacy'; INSERT INTO legal_document_versions(id,document_id,version,document_json,published_at) VALUES('unrequested','terms','2026.10.17.1','{}','2026-10-17');");
  db.exec(migration);
  assert.equal(db.prepare("SELECT count(*) n FROM legal_document_versions WHERE document_id='privacy' AND version='2026.10.27.1'").get().n,1);
  assert.equal(db.prepare("SELECT count(*) n FROM legal_document_versions WHERE id='unrequested'").get().n,1);
  for(const [key,next] of [['terms',4],['privacy',3]])assert.equal(db.prepare("SELECT coalesce(max(cast(substr(version,12) as integer)),0)+1 n FROM legal_document_versions WHERE document_id=? AND version LIKE '2026.10.27.%'").get(key).n,next);
 }finally{db.close();}
});
