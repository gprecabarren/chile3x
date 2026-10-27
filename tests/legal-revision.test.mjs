import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { LEGAL_REVISION_DOCUMENTS, LEGAL_REVISION_DATE, LEGAL_REVISION_VERSION } from '../lib/legal-revision-2026-10-26.ts';
import { validateLegalDocument } from '../lib/legal-document.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=source('drizzle/0065_legal_privacy_revision.sql');
const original=JSON.parse(execFileSync(process.execPath,['scripts/export-legal-defaults.mjs','9796fdd'],{encoding:'utf8',windowsHide:true}));
function database(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE profile_views(profile_id TEXT,viewed_at TEXT);');
 db.exec(source('drizzle/0057_legal_documents_and_city_popularity.sql'));
 db.exec("INSERT INTO users(id) VALUES('disposable_local'); INSERT INTO account_legal_acceptances(id,user_id,terms_version,privacy_version) VALUES('acceptance','disposable_local','2026.10.14.3','2026.10.14.3');");
 return db;
}

test('legal revision archives the exact former defaults and publishes the same editor documents and metadata',()=>{
 const db=database();
 try{
  const draft=structuredClone(original.terms);draft.summary='Borrador local que debe sobrevivir';
  db.prepare("UPDATE legal_documents SET draft_json=? WHERE id='terms'").run(JSON.stringify(draft));
  db.prepare("UPDATE legal_documents SET published_json=? WHERE id='privacy'").run(JSON.stringify(original.privacy,null,2));
  const before=db.prepare('SELECT * FROM legal_documents ORDER BY id').all();
  const acceptance=db.prepare('SELECT * FROM account_legal_acceptances').all();
  db.exec(migration);
  for(const row of db.prepare('SELECT * FROM legal_documents ORDER BY id').all()){
   assert.equal(row.version,LEGAL_REVISION_VERSION);assert.equal(row.published_at,LEGAL_REVISION_DATE);
   assert.deepEqual(validateLegalDocument(JSON.parse(row.published_json),true),LEGAL_REVISION_DOCUMENTS[row.id]);
   assert.equal(row.revision,before.find(old=>old.id===row.id).revision+1);
   assert.equal(row.draft_json,before.find(old=>old.id===row.id).draft_json);
   const history=db.prepare('SELECT * FROM legal_document_versions WHERE document_id=? ORDER BY version').all(row.id);
   assert.equal(history.length,2);
   assert.deepEqual(JSON.parse(history[0].document_json),original[row.id]);
   assert.deepEqual(JSON.parse(history[1].document_json),LEGAL_REVISION_DOCUMENTS[row.id]);
  }
  assert.deepEqual(db.prepare('SELECT * FROM account_legal_acceptances').all(),acceptance);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='_legal_release_20261026'").get().n,0);
  const published=db.prepare('SELECT * FROM legal_documents ORDER BY id').all();
  db.exec(migration);
  assert.deepEqual(db.prepare('SELECT * FROM legal_documents ORDER BY id').all(),published);
  assert.equal(db.prepare('SELECT count(*) n FROM legal_document_versions').get().n,4);
 }finally{db.close();}
});

test('custom publication, newer versions, and conflicting history cannot be overwritten by the revision',()=>{
 for(const scenario of ['custom','newer','history','malformed','malformed-history']){
  const db=database();
  try{
   const custom=structuredClone(original.terms);custom.sections[0].blocks[0].text='Personalización local vigente';
   if(scenario==='custom')db.prepare("UPDATE legal_documents SET published_json=?,draft_json=? WHERE id='terms'").run(JSON.stringify(custom),JSON.stringify(custom));
   if(scenario==='newer')db.exec("UPDATE legal_documents SET version='2026.10.27.1' WHERE id='terms'");
   if(scenario==='history')db.prepare("INSERT INTO legal_document_versions(id,document_id,version,document_json,published_at) VALUES('existing','terms','2026.10.26.1',?,'2026-10-26')").run(JSON.stringify(custom));
   if(scenario==='malformed')db.exec("UPDATE legal_documents SET published_json='{broken' WHERE id='terms'");
   if(scenario==='malformed-history')db.exec("INSERT INTO legal_document_versions(id,document_id,version,document_json,published_at) VALUES('existing','terms','2026.10.26.1','{broken','2026-10-26')");
   const before=db.prepare("SELECT * FROM legal_documents WHERE id='terms'").get();
   const history=db.prepare("SELECT * FROM legal_document_versions WHERE document_id='terms'").all();
   db.exec(migration);
   assert.deepEqual(db.prepare("SELECT * FROM legal_documents WHERE id='terms'").get(),before,scenario);
   assert.deepEqual(db.prepare("SELECT * FROM legal_document_versions WHERE document_id='terms'").all(),history,scenario);
   assert.equal(db.prepare("SELECT version FROM legal_documents WHERE id='privacy'").get().version,LEGAL_REVISION_VERSION);
  }finally{db.close();}
 }
});

test('the explicitly reviewed privacy publication is archived and upgraded, but further edits are preserved',()=>{
 for(const changed of [false,true]){
  const db=database();
  try{
   const setup=migration.slice(0,migration.indexOf('UPDATE _legal_release_20261026 SET eligible=1'));
   db.exec(setup);
   const reviewed=db.prepare("SELECT reviewed_version,reviewed_json FROM _legal_release_20261026 WHERE document_id='privacy'").get();
   assert.equal(reviewed.reviewed_version,'2026.10.17.1');
   const document=JSON.parse(reviewed.reviewed_json);
   if(changed)document.summary+=' Cambio posterior que no se debe sustituir.';
   db.exec('DROP TABLE _legal_release_20261026');
   db.prepare("UPDATE legal_documents SET version=?,published_json=?,published_at='2026-10-17' WHERE id='privacy'").run(reviewed.reviewed_version,JSON.stringify(document,null,2));
   const before=db.prepare("SELECT * FROM legal_documents WHERE id='privacy'").get();
   db.exec(migration);
   const after=db.prepare("SELECT * FROM legal_documents WHERE id='privacy'").get();
   if(changed){assert.deepEqual(after,before);assert.equal(db.prepare("SELECT count(*) n FROM legal_document_versions WHERE document_id='privacy'").get().n,0);}
   else{
    assert.equal(after.version,LEGAL_REVISION_VERSION);
    assert.deepEqual(JSON.parse(after.published_json),LEGAL_REVISION_DOCUMENTS.privacy);
    assert.deepEqual(JSON.parse(db.prepare("SELECT document_json FROM legal_document_versions WHERE document_id='privacy' AND version='2026.10.17.1'").get().document_json),document);
   }
  }finally{db.close();}
 }
});

test('all complete SQL statements remain within the D1 statement size limit',()=>{
 // SQLite handles quoted semicolons; split only after a complete SQL statement.
 const db=new DatabaseSync(':memory:');
 try{
  let statement='';let inString=false;let inComment=false;
  for(let i=0;i<migration.length;i++){
   const char=migration[i];statement+=char;
   if(inComment){if(char==='\n')inComment=false;continue;}
   if(!inString&&char==='-'&&migration[i+1]==='-'){statement+=migration[++i];inComment=true;continue;}
   if(char==="'"){
    if(inString&&migration[i+1]==="'"){statement+=migration[++i];continue;}
    inString=!inString;
   }
   if(char===';'&&!inString){assert.ok(Buffer.byteLength(statement,'utf8')<100_000);statement='';}
  }
  assert.equal(inString,false);assert.equal(statement.trim(),'');
 }finally{db.close();}
});
