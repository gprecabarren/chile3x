import test from 'node:test';import assert from 'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{readFileSync,readdirSync}from'node:fs';
import{AGENCY_LEGAL_SECTION,AGENCY_LEGAL_VERSION,agencyLegalFallback}from'../lib/agency-legal-revision.ts';import{validateLegalDocument}from'../lib/legal-document.ts';import{profileGallerySlotsUsed,profilePhotoCapacity}from'../lib/profile-photo-capacity.ts';
test('agency legal migration preserves custom text, drafts, exact prior history and acceptance records',()=>{
 const db=new DatabaseSync(':memory:');try{
 for(const n of readdirSync('drizzle').filter(x=>x.endsWith('.sql')&&!x.startsWith('0068')).sort())db.exec(readFileSync('drizzle/'+n,'utf8'));
 const before=db.prepare('SELECT * FROM legal_documents').all();
 for(const row of before){const doc=JSON.parse(row.published_json);doc.summary='Personalización conservada';const draft=JSON.stringify({...doc,summary:'Borrador conservado'});db.prepare('UPDATE legal_documents SET published_json=?,draft_json=?,version=? WHERE id=?').run(JSON.stringify(doc),draft,'2026.10.27.9',row.id);}
 const custom=db.prepare('SELECT * FROM legal_documents').all();db.exec(readFileSync('drizzle/0068_agency_legal_revision.sql','utf8'));
 for(const row of db.prepare('SELECT * FROM legal_documents').all()){
  const old=custom.find(r=>r.id===row.id),doc=validateLegalDocument(JSON.parse(row.published_json),true);assert.equal(row.version,AGENCY_LEGAL_VERSION);assert.equal(doc.summary,'Personalización conservada');assert.equal(row.draft_json,old.draft_json);assert.deepEqual(doc.sections.at(-1),AGENCY_LEGAL_SECTION);
  assert.equal(db.prepare('SELECT document_json FROM legal_document_versions WHERE document_id=? AND version=?').get(row.id,old.version).document_json,old.published_json);
  assert.deepEqual(doc,agencyLegalFallback(JSON.parse(old.published_json),row.id));
 }
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();}
});
test('photo capacity reserves the previous cover slot and counts pending replacements once',()=>{
 const photo=(isProfilePhoto=false,moderationStatus='approved')=>({mediaType:'image',isProfilePhoto,moderationStatus});
 const nine=Array.from({length:9},()=>photo()),ten=[...nine,photo()],cover=photo(true),pending=photo(true,'pending');
 assert.equal(profilePhotoCapacity([...nine,cover],'profile_photo'),null);assert.match(profilePhotoCapacity([...ten,cover],'profile_photo'),/galería está completa/);
 assert.equal(profilePhotoCapacity(ten,'profile_photo'),null);assert.equal(profilePhotoCapacity([...nine,cover],'gallery'),null);
 assert.match(profilePhotoCapacity([...nine,cover,pending],'gallery'),/espacio reservado/);assert.match(profilePhotoCapacity([pending],'profile_photo'),/principal pendiente/);
 assert.equal(profileGallerySlotsUsed([...nine,cover,pending]),10);
 assert.equal(profileGallerySlotsUsed([...nine,cover,{...pending,replacementOf:'approved-cover'}]),9);
 assert.equal(profilePhotoCapacity([...nine,cover,{mediaType:'video',isProfilePhoto:false,moderationStatus:'approved'}],'profile_photo'),null);
});
