import test from'node:test';import assert from'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{readFileSync,readdirSync}from'node:fs';
const migration=readFileSync('drizzle/0067_agency_management.sql','utf8');
test('agency migration is additive, preserves historical links without silently expanding permissions and retains the exact old quota exception',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');try{
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0067').sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
 db.exec("INSERT INTO users(id,email,username)VALUES('schema-operator','operator@example.invalid','schema-operator'),('schema-person','person@example.invalid','schema-person'); INSERT INTO profiles(id,owner_id,type,slug,display_name,region,city)VALUES('schema-agency','schema-operator','agency','schema-agency','Agencia local','Región del Biobío','Concepción'),('schema-personal','schema-person','escort','schema-personal','Persona local','Región del Biobío','Concepción');INSERT INTO agency_members(id,agency_profile_id,member_profile_id)VALUES('schema-link','schema-agency','schema-personal');");
 const old=db.prepare('SELECT id,owner_id,status,revision FROM profiles ORDER BY id').all(),legacy=db.prepare("SELECT sql FROM sqlite_master WHERE name='profiles_one_escort_insert'").get().sql;
 db.exec(migration);assert.deepEqual(db.prepare('SELECT id,owner_id,status,revision FROM profiles ORDER BY id').all(),old);assert.equal(db.prepare('SELECT can_manage FROM agency_members').get().can_manage,0);assert.equal(db.prepare('SELECT documents_authorized FROM agency_members').get().documents_authorized,0);
 const exemptions=db.prepare('SELECT * FROM escort_profile_limit_exemptions').all();assert.equal(exemptions.length,1);const exempt=exemptions[0];assert.ok(legacy.includes(exempt.user_id));assert.ok(legacy.includes(exempt.email_key));
 db.prepare("INSERT INTO users(id,email,username)VALUES(?,?,'schema-exempt')").run(exempt.user_id,exempt.email_key);
 const add=db.prepare("INSERT INTO profiles(id,owner_id,type,slug,display_name,region,city)VALUES(?,?,'escort',?,'Persona local','Región del Biobío','Concepción')");add.run('schema-exempt-1',exempt.user_id,'schema-exempt-1');add.run('schema-exempt-2',exempt.user_id,'schema-exempt-2');
 assert.throws(()=>add.run('schema-second','schema-person','schema-second'),/escort_profile_owner_conflict/);
 db.prepare("INSERT INTO profiles(id,owner_id,type,agency_custodian_id,slug,display_name,region,city)VALUES('schema-child','schema-operator','escort','schema-agency','schema-child','Persona gestionada','Región del Biobío','Concepción')").run();
 assert.throws(()=>db.exec("UPDATE profiles SET trashed_at=CURRENT_TIMESTAMP WHERE id='schema-agency'"),/agency_has_dependents/);
 db.exec("UPDATE profiles SET trashed_at=CURRENT_TIMESTAMP WHERE id='schema-child';UPDATE profiles SET trashed_at=CURRENT_TIMESTAMP WHERE id='schema-agency'");assert.throws(()=>db.exec("UPDATE profiles SET trashed_at=NULL WHERE id='schema-child'"),/agency_custody_conflict/);db.exec("UPDATE profiles SET trashed_at=NULL WHERE id='schema-agency';UPDATE profiles SET trashed_at=NULL WHERE id='schema-child'");
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();}
});
