import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertImageSource, imageHeaderType, isImageSource, MAX_IMAGE_UPLOAD_BYTES, IMAGE_UPLOAD_RULES } from '../lib/image-upload-policy.ts';
import { defaultPhotoCrop, photoCropBounds, movePhotoCrop, resizePhotoCrop } from '../lib/photo-crop.ts';
import { mediaReviewSnapshot, parseMediaReviewSnapshot, MAX_EXCLUSIVE_BULK_MEDIA } from '../lib/media-bulk-review.ts';
import { readUploadResponse, uploadMediaRequest } from '../lib/upload-response.ts';
import { adminAuditInstant, adminAuditDate } from '../lib/admin-audit-date.ts';
import { readMediaUploadForm } from '../lib/media-upload-form.ts';
import { mediaByteRange } from '../lib/media-byte-range.ts';
const source = path => readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('9.2 MB PNG and phone MIME aliases are accepted as sources, not stored originals', async () => {
  assert.doesNotThrow(() => assertImageSource(9_200_000));
  assert.equal(MAX_IMAGE_UPLOAD_BYTES,10_000_000);
  assert.match(IMAGE_UPLOAD_RULES,/máximo final de 10 MB/);
  assert.match(await source('lib/media.ts'),/MAX_IMAGE_BYTES = MAX_IMAGE_UPLOAD_BYTES/);
  for (const file of [{name:'IMG_4859.PNG',type:''},{name:'photo',type:'image/jpg'},{name:'IMG_1234.HEIC',type:'image/heic'},{name:'download.jfif',type:''}]) assert.equal(isImageSource(file),true);
  for (const file of [{name:'danger.svg',type:'image/svg+xml'},{name:'photo.txt',type:'text/plain'}]) assert.equal(isImageSource(file),false);
  for (const bytes of [0,-1,NaN,Infinity,20_000_001]) assert.throws(() => assertImageSource(bytes));
  assert.equal(imageHeaderType(new Uint8Array([255,216,255,224])),'image/jpeg');
  assert.equal(imageHeaderType(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
  assert.equal(imageHeaderType(new TextEncoder().encode('RIFFxxxxWEBPxxxx')),'image/webp');
  assert.equal(imageHeaderType(new TextEncoder().encode('<svg/>')),null);
  for (const path of ['app/mi-cuenta/ProfileMediaManager.tsx','app/mi-cuenta/ExclusiveContentManager.tsx']) {
    const code=await source(path); assert.match(code,/isImageSource\(/); assert.doesNotMatch(code,/original.size > 5_000_000|file.size > 5_000_000/); assert.match(code,/IMAGE_UPLOAD_RULES/); assert.match(code,/uploadMediaRequest/);
  }
  assert.match(await source('lib/profile-media-upload.ts'),/file.size > \(imageType \? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES\)/);
});

test('touch crop moving and all four corners stay bounded, preserve aspect ratio and do not upscale', () => {
  for (const [width,height] of [[1290,2796],[320,200],[1400,1400]]) for (const ratio of ['original','square','portrait','landscape']) {
    const crop={...defaultPhotoCrop,ratio,zoom:2};
    for (const corner of ['nw','ne','sw','se']) for (const delta of [-10000,-90,0,90,10000]) {
      const next=resizePhotoCrop(width,height,crop,corner,delta,delta);
      const bounds=photoCropBounds(width,height,next);
      assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=width && bounds.y+bounds.height<=height,JSON.stringify({next,bounds}));
      assert.ok(next.zoom>=1 && next.zoom<=4);
      assert.ok(bounds.outputWidth<=bounds.width && bounds.outputHeight<=bounds.height);
    }
    for (const delta of [-10000,10000]) { const bounds=photoCropBounds(width,height,movePhotoCrop(width,height,crop,delta,delta)); assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=width && bounds.y+bounds.height<=height); }
  }
});

test('exclusive snapshot allows the complete 20-photo/4-video library but public cap remains 20', async () => {
  const files=Array.from({length:MAX_EXCLUSIVE_BULK_MEDIA},(_,i)=>({id:`ecm_${i}`,r2Key:`content/${i}`,byteSize:100,createdAt:'2026-10-13',moderationStatus:'pending',visibility:'exclusive',isProfilePhoto:false}));
  const snapshot=await mediaReviewSnapshot(files);
  assert.equal(parseMediaReviewSnapshot(JSON.stringify(snapshot)),null);
  assert.equal(parseMediaReviewSnapshot(JSON.stringify(snapshot),MAX_EXCLUSIVE_BULK_MEDIA).length,24);
  assert.equal(parseMediaReviewSnapshot(JSON.stringify([...snapshot,{...snapshot[0],id:'extra'}]),MAX_EXCLUSIVE_BULK_MEDIA),null);
  const route=await source('app/api/admin/contenido/colecciones/[collectionId]/aprobar-todos/route.ts');
  for (const pattern of [/assertSameOrigin/,/media.moderate/,/review_confirmed/,/mediaReviewVersion/,/unchangedFiles/,/liveCollection/,/recordAdminAudit/,/media.exclusive_bulk_approve/]) assert.match(route,pattern);
  assert.doesNotMatch(route,/db.update\(profiles\)|exclusiveContentAccess|\.delete\(/);
});

test('upload errors distinguish authentication, permission, server, malformed response and network', async () => {
  await assert.rejects(readUploadResponse(Response.json({error:'Ingresa para subir archivos.'},{status:401})),/iniciar sesión/);
  await assert.rejects(readUploadResponse(Response.json({error:'No tienes permiso.'},{status:403})),/permisos/);
  await assert.rejects(readUploadResponse(Response.json({error:'Error de almacenamiento. Código QA-1.'},{status:500})),/QA-1.*problema del servidor/);
  await assert.rejects(readUploadResponse(new Response('gateway',{status:502})),/HTTP 502/);
  const original=globalThis.fetch;
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};
  try { await assert.rejects(uploadMediaRequest('/api/perfiles/qa/media',new FormData()),/conexión.*confirmar.*duplicarlo/); } finally {globalThis.fetch=original;}
});

test('multipart parser accepts a 9.2 MB photo and rejects oversized, damaged or interrupted requests', async () => {
  const form=new FormData();form.set('file',new File([new Uint8Array(9_200_000)],'IMG_4859.png',{type:'image/png'}));
  const parsed=await readMediaUploadForm(new Request('http://localhost/upload',{method:'POST',body:form}),MAX_IMAGE_UPLOAD_BYTES);
  assert.equal(parsed.get('file').size,9_200_000);
  await assert.rejects(readMediaUploadForm(new Request('http://localhost/upload',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=x','content-length':'10256001'},body:'x'}),MAX_IMAGE_UPLOAD_BYTES),e=>e.status===413);
  await assert.rejects(readMediaUploadForm(new Request('http://localhost/upload',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'},body:'damaged'}),MAX_IMAGE_UPLOAD_BYTES),/incompleta o dañada/);
  await assert.rejects(readMediaUploadForm(new Request('http://localhost/upload',{method:'POST',body:'wrong format'}),MAX_IMAGE_UPLOAD_BYTES),/carga válida/);
  let cancelled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(10_256_001));},cancel(){cancelled=true;}});
  await assert.rejects(readMediaUploadForm(new Request('http://localhost/upload',{method:'POST',duplex:'half',headers:{'content-type':'multipart/form-data; boundary=x'},body:stream}),MAX_IMAGE_UPLOAD_BYTES),e=>e.status===413);
  assert.equal(cancelled,true);
  const interrupted=new ReadableStream({start(controller){controller.error(new Error('connection reset'));}});
  await assert.rejects(readMediaUploadForm(new Request('http://localhost/upload',{method:'POST',duplex:'half',headers:{'content-type':'multipart/form-data; boundary=x'},body:interrupted}),MAX_IMAGE_UPLOAD_BYTES),/interrumpió antes de completarse/);
});

test('admin timeline keeps UTC timestamps and the home loads ten entries only for authorized administrators', async () => {
  assert.equal(adminAuditInstant('2026-10-13 01:05:00'),'2026-10-13T01:05:00Z');
  assert.equal(adminAuditDate('2026-10-13 01:05:00'),adminAuditDate('2026-10-13T01:05:00Z'));
  const code=await source('app/admin/page.tsx'); assert.match(code,/adminHasCapability\(admin, "audit.view"\) \? getDb/); assert.match(code,/\.limit\(10\)/); assert.match(code,/datetime\(/);
  assert.match(await source('app/admin/RecentAdminActivity.tsx'),/actorGithubLogin/);
});

test('video previews load near viewport, seek a paused frame, and reset on first intentional playback', async () => {
  const code=await source('app/MediaVideo.tsx');
  for (const pattern of [/IntersectionObserver/,/preload="none"/,/playsInline/,/Math.min\(1, video.duration \/ 2\)/,/video.currentTime = 0/,/observer.disconnect\(\)/]) assert.match(code,pattern);
  assert.doesNotMatch(code,/autoPlay|fetch\(|canvas|localStorage/);
  for (const path of ['app/perfil/[slug]/page.tsx','app/admin/medios/page.tsx','app/mi-cuenta/ProfileMediaManager.tsx','app/mi-cuenta/ExclusiveContentManager.tsx','app/mi-cuenta/contenido/page.tsx']) assert.match(await source(path),/<MediaVideo/);
});

test('video byte ranges are bounded and public/private streams still check authorization first', async () => {
  for(const [header,expected] of [['bytes=0-1',{offset:0,length:2}],['bytes=5-',{offset:5,length:5}],['bytes=-3',{offset:7,length:3}],['bytes=0-999',{offset:0,length:10}],['bytes=-999',{offset:0,length:10}],['bytes=10-','unsatisfiable'],['bytes=-0','unsatisfiable'],['bytes=5-3','unsatisfiable'],['bytes=0-1,4-5',null],['invalid',null]]) assert.deepEqual(mediaByteRange(header,10),expected);
  for(const path of ['app/media/[mediaId]/route.ts','app/contenido/[mediaId]/route.ts']) {
    const code=await source(path);assert.ok(code.indexOf('getCurrentUser()')<code.indexOf('mediaByteRange(request'));assert.match(code,/status: range \? 206 : 200/);assert.match(code,/content-range/);assert.match(code,/new Response\(object.body/);assert.doesNotMatch(code,/object.arrayBuffer/);
  }
});
