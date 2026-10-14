import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { imagePreparationSize } from '../lib/image-quality.ts';
import { assertImageSource, isImageSource } from '../lib/image-upload-policy.ts';
import { MAX_STORY_IMAGE_BYTES } from '../lib/story-data.ts';
import { readUploadResponse } from '../lib/upload-response.ts';

test('story photo preparation accepts mobile sources and enforces the final 5 MB limit', () => {
  assert.equal(MAX_STORY_IMAGE_BYTES, 5_000_000);
  assert.doesNotThrow(() => assertImageSource(9_200_000));
  assert.throws(() => assertImageSource(20_000_001));
  assert.equal(isImageSource({ name:'IMG_4859.PNG', type:'' }), true);
  assert.equal(isImageSource({ name:'IMG_1234.HEIC', type:'image/heic' }), true);
  assert.deepEqual(imagePreparationSize(1290,2796,1600), {width:738,height:1600});
  const source = readFileSync('app/mi-cuenta/ProfileStoryManager.tsx','utf8');
  assert.match(source,/maxBytes: MAX_STORY_IMAGE_BYTES, maxDimension: 2200/);
  assert.match(source,/data\.set\("image", prepared\.file\)/);
  assert.match(source,/applyWatermark: false, blurFaces: false/);
  assert.match(source,/readUploadResponse\(result/);
  assert.match(source,/navigator\.onLine === false/);
  assert.doesNotMatch(source,/image\.size > MAX_STORY_IMAGE_BYTES/);
});
test('a story storage quota error is not misreported as a file-size problem',async()=>{
  await assert.rejects(()=>readUploadResponse(new Response(JSON.stringify({error:'Se alcanzó el margen de almacenamiento del sitio.'}),{status:413,headers:{'content-type':'application/json'}})),/margen de almacenamiento/);
  await assert.rejects(()=>readUploadResponse(new Response('<html>proxy limit</html>',{status:413}),'Foto final hasta 5 MB.'),/Foto final hasta 5 MB/);
});
