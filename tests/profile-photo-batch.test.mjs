import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deletePhotosSequentially,photoDeletionPlan} from '../lib/profile-photo-batch.ts';

test('photo deletion awaits each authorized revision and stops on an uncertain response',async()=>{
  const deleted=[],failure=new Error('No se pudo confirmar la respuesta.');let active=0;
  const result=await deletePhotosSequentially(['cover','photo','uncertain','last'],async id=>{
    assert.equal(active,0);active++;await new Promise(resolve=>setImmediate(resolve));active--;
    if(id==='uncertain')throw failure;deleted.push(id);
  });
  assert.deepEqual(deleted,['cover','photo']);assert.deepEqual(result.deleted,deleted);assert.equal(result.failedId,'uncertain');assert.equal(result.error,failure);
});
test('a successful photo deletion batch reports every confirmed deletion without retries',async()=>{
  const calls=[],result=await deletePhotosSequentially(['cover','gallery'],async id=>{calls.push(id);});
  assert.deepEqual(calls,['cover','gallery']);assert.deepEqual(result,{deleted:calls,failedId:null,error:undefined});
});
test('delete-all includes a pending original once while preserving videos and exclusive content',()=>{
  assert.deepEqual(photoDeletionPlan([{id:'cover',mediaType:'image',visibility:'public'},{id:'pending',mediaType:'image',visibility:'public',replacementOf:'base'},{id:'base',mediaType:'image',visibility:'public'},{id:'video',mediaType:'video',visibility:'public'},{id:'exclusive',mediaType:'image',visibility:'exclusive'}]),{count:3,ids:['cover','pending','base']});
});
test('shared media editor keeps batch actions discoverable and excludes videos and exclusive files from delete-all',async()=>{
  const source=await readFile(new URL('../app/mi-cuenta/ProfileMediaManager.tsx',import.meta.url),'utf8');
  const tools=await readFile(new URL('../app/admin/medios/AdminPhotoTools.tsx',import.meta.url),'utf8');
  assert.match(source,/const storedPhotos = media\.filter\(item => item\.mediaType === "image" && item\.visibility === "public"\)/);
  assert.match(source,/photoDeletionPlan\(media\)/);
  assert.match(source,/deleteConfirmation !== "ELIMINAR"/);assert.match(source,/AdminPhotoTools showBulkActions/);
  assert.ok(tools.indexOf('{showBulkActions&&')<tools.indexOf('<details ref={root}'));
  for(const text of ['Marca de agua en todas','Difuminar rostros en todas','Quitar marcas de todas','Quitar difuminado de todas'])assert.ok(tools.includes(text));
});
