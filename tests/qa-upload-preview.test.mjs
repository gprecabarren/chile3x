import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { defaultPhotoCrop, photoCropBounds } from '../lib/photo-crop.ts';
const source = path => readFile(new URL(`../${path}`,import.meta.url),'utf8');
const locationsUrl = new URL('../app/locations.ts', import.meta.url).href;
const profileSource = (await source('lib/profile.ts')).replace('"@/app/locations"', JSON.stringify(locationsUrl));
const { availabilityDays, getAvailabilityStatus, readAvailability, serializeAvailability, validateAvailability } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(profileSource)).toString('base64')}`);

test('24-hour weekly schedules cover the final minute and preserve normal ranges',()=>{
  const data = new FormData();
  for (const day of availabilityDays) { data.set(`availability_${day.key}_enabled`,'on'); data.set(`availability_${day.key}_opens`,'00:00'); data.set(`availability_${day.key}_closes`,'24:00'); }
  assert.equal(validateAvailability(data),null);
  const entries=readAvailability(serializeAvailability(data)); assert.equal(entries.length,7);
  for (const instant of ['2026-10-10T02:59:59Z','2026-10-10T03:00:00Z','2026-10-12T15:00:00Z']) assert.equal(getAvailabilityStatus(entries,new Date(instant)).isOpen,true);
  assert.match(getAvailabilityStatus(entries,new Date('2026-10-10T02:59:59Z')).text,/24 horas/);
  data.set('availability_mon_opens','24:00'); assert.ok(validateAvailability(data));
  assert.equal(readAvailability('mon=24:00-24:00|tue=09:00-18:00|wed=00:00-24:30').length,1);
  const normal=readAvailability('mon=09:00-18:00'); assert.equal(normal[0].closesAt,'18:00');
});
test('crop bounds preserve source limits, aspect ratio and never upscale',()=>{
  assert.deepEqual(photoCropBounds(323,559,defaultPhotoCrop),{x:0,y:0,width:323,height:559,outputWidth:323,outputHeight:559});
  for (const ratio of ['original','square','portrait','landscape']) for (const zoom of [1,2,4]) for(const position of [0,50,100]) {
    const bounds=photoCropBounds(1600,2400,{...defaultPhotoCrop,ratio,zoom,horizontal:position,vertical:position});
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=1600 && bounds.y+bounds.height<=2400);
    assert.ok(bounds.outputWidth<=bounds.width && bounds.outputHeight<=bounds.height);
  }
  for(const crop of [{zoom:0},{zoom:NaN},{horizontal:101},{maxDimension:10000},{ratio:'fake'}]) assert.throws(()=>photoCropBounds(400,700,{...defaultPhotoCrop,...crop}));
});
test('media shortcuts and honest previews apply to every listing without extra server processing',async()=>{
  const [account,manager,preview,crop,css]=await Promise.all(['app/mi-cuenta/page.tsx','app/mi-cuenta/ProfileMediaManager.tsx','app/mi-cuenta/SelectedPhotoPreview.tsx','app/mi-cuenta/PhotoCropEditor.tsx','app/globals.css'].map(source));
  assert.match(account,/editar#fotos-y-videos/);assert.match(manager,/id="fotos-y-videos"/);
  assert.match(manager,/candidate.originalFile.name/);assert.match(manager,/candidate\?\.prepared/);
  assert.match(manager,/prepared: undefined, faceRegions: \[\]/);
  assert.match(preview,/lazy\(\(\) => import\("\.\/PhotoCropEditor"\)\)/);
  assert.match(preview,/URL.revokeObjectURL\(url\)/);assert.match(preview,/onBusyChange\(true\)/);
  assert.match(crop,/canvas.toBlob/);assert.doesNotMatch(crop,/fetch\(/);
  assert.match(css,/\.profile-media-manager \.media-owner-preview img \{ object-fit: contain;/);
  assert.match(css,/\.admin-media-preview img \{ object-fit: contain;/);
  assert.match(css,/\.profile-public-gallery-manager > \.gallery-upload-candidates \{ grid-column: 1 \/ -1/);
});
