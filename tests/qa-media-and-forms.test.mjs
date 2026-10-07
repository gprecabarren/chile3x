import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { bulkMediaReturnTo, mediaReviewSnapshot, mediaReviewVersion, parseMediaReviewSnapshot, MAX_BULK_MEDIA } from '../lib/media-bulk-review.ts';
import { validPrivacyRegions } from '../lib/face-privacy.ts';
import { profileMetadataForType } from '../lib/profile-type-metadata.ts';
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const file = {id:'med_qa',r2Key:'private-key-not-rendered',byteSize:100,createdAt:'2026-10-07',moderationStatus:'pending',isProfilePhoto:true,visibility:'public'};
test('rental metadata retains property details and never exposes legacy Escort attributes or rates',()=>{
 const metadata={age:'28',height_cm:'165',price_30_min:'90000',onlyfans_url:'https://onlyfans.com/qa',room_type:'individual',wifi:'si',availability:'hours',instagram_url:'https://instagram.com/qa'};
 assert.deepEqual(profileMetadataForType('rental',metadata),{room_type:'individual',wifi:'si',availability:'hours',instagram_url:'https://instagram.com/qa'});
 assert.equal(profileMetadataForType('escort',metadata),metadata);
});

test('review snapshots change when content, cover or moderation state changes and never expose R2 keys', async()=>{
 const original=await mediaReviewVersion(file);
 for(const change of [{r2Key:'replacement'},{byteSize:101},{isProfilePhoto:false},{moderationStatus:'approved'}]) assert.notEqual(await mediaReviewVersion({...file,...change}),original);
 const snapshot=await mediaReviewSnapshot([file]);
 assert.deepEqual(parseMediaReviewSnapshot(JSON.stringify(snapshot)),snapshot);
 assert.ok(!JSON.stringify(snapshot).includes(file.r2Key));
 assert.equal(parseMediaReviewSnapshot(JSON.stringify([...snapshot,...snapshot])),null);
 assert.equal(parseMediaReviewSnapshot('invalid JSON'),null);
 assert.equal(parseMediaReviewSnapshot(JSON.stringify([{id:'../invalid',version:original}])),null);
 assert.equal(parseMediaReviewSnapshot(JSON.stringify(Array.from({length:MAX_BULK_MEDIA+1},(_,i)=>({id:`media_${i}`,version:original})))),null);
});
test('bulk approval cannot redirect to external or unrelated destinations',()=>{
 for(const bad of ['//evil.test','https://evil.test/perfil/@a','/\\evil.test/perfil/@a','/admin/cuentas','/perfil/../../ingresar']) assert.equal(bulkMediaReturnTo(bad,'prf_qa'),'/admin/medios?perfil=prf_qa');
 assert.equal(bulkMediaReturnTo('/perfil/@qa?return_to=%2Fadmin%2Fanuncios-publicaciones','prf_qa'),'/perfil/@qa?return_to=%2Fadmin%2Fanuncios-publicaciones');
});
test('bulk approval is same-origin, permission scoped, snapshot based and transactional without publishing',async()=>{
 const route=await source('app/api/admin/profiles/[profileId]/media/aprobar-todos/route.ts');
 assert.match(route,/assertSameOrigin\(request\)/);assert.match(route,/adminHasCapability\(admin, "media\.moderate"\)/);
 assert.match(route,/mediaReviewVersion\(file\) !== entry.version/);assert.match(route,/review_confirmed/);
 assert.match(route,/db\.batch\(/);assert.match(route,/unchangedFiles/);assert.match(route,/recordAdminAudit\(admin/);
 assert.doesNotMatch(route,/db\.update\(profiles\)|exclusiveContentMedia|sendPortalEmail/);
});
test('manual privacy regions reject outside-image, excessive, zero-sized or nonfinite selections',()=>{
 assert.equal(validPrivacyRegions([{x:.1,y:.1,width:.2,height:.3}]),true);
 for(const region of [{x:-1,y:0,width:.1,height:.1},{x:.9,y:.9,width:.2,height:.2},{x:0,y:0,width:0,height:.1},{x:NaN,y:0,width:.1,height:.1}]) assert.equal(validPrivacyRegions([region]),false);
 assert.equal(validPrivacyRegions(Array.from({length:11},()=>({x:0,y:0,width:.1,height:.1}))),false);
});
test('privacy processing is embedded in the file, avoids unsupported canvas filters and refuses no-face uploads',async()=>{
 const transform=await source('app/mi-cuenta/watermark-image.ts');
 assert.doesNotMatch(transform,/context\.filter\s*=/);
 assert.match(transform,/privacyContext\.drawImage/);assert.match(transform,/context\.drawImage\(privacy/);
 assert.match(transform,/if \(!boxes.length\) throw new Error/);assert.match(transform,/if \(manual.length\)/);
 assert.match(transform,/faceDetectorPromise = null/);
});
test('QA forms preserve original endpoints and put submit and WhatsApp actions at both ends',async()=>{
 const [form,registration,login,recovery,submission,status]=await Promise.all(['app/mi-cuenta/ProfileForm.tsx','app/registro/page.tsx','app/ingresar/page.tsx','app/recuperar-clave/page.tsx','lib/profile-submission.ts','app/api/admin/profiles/[profileId]/status/route.ts'].map(source));
 assert.equal((form.match(/name="intent" type="submit" value="submit"/g)||[]).length,2);
 assert.equal((registration.match(/Solicitar creación de cuenta por WhatsApp/g)||[]).length,2);
 assert.match(login,/auth-split-card/);assert.match(login,/action="\/api\/auth\/login"/);assert.match(recovery,/auth-recovery-card/);
 assert.match(form,/type !== "rental" && <div className="service-columns"/);
 assert.match(submission,/servicesIncluded: typeValue === "rental" \? \[\]/);
 assert.match(status,/existingProfile.type === "escort" \? requestedHealthReviewStatus : "not_requested"/);
});
