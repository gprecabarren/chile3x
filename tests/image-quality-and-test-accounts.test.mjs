import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { imagePreparationSize, imageQualityWarning } from '../lib/image-quality.ts';
import { isReservedTestEmail } from '../lib/test-email.ts';
const source = path => readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('image preparation preserves small sources, aspect ratio and bounded large uploads',()=>{
  assert.deepEqual(imagePreparationSize(476,663,2200),{width:476,height:663});
  assert.deepEqual(imagePreparationSize(4000,3000,2200),{width:2200,height:1650});
  for (const width of [0,-1,NaN,Infinity]) assert.throws(()=>imagePreparationSize(width,1000,2200));
  assert.match(imageQualityWarning(476,663),/476 × 663/);
  assert.equal(imageQualityWarning(1000,1400),'');
});

test('reserved QA recipients never reach an email provider',async()=>{
  for (const email of ['a@invalid','Paola@cuentas.chile3x.invalid','a@sub.invalid ']) assert.equal(isReservedTestEmail(email),true);
  for (const email of ['a@gmail.com','a@notinvalid.com','a@invalid.example.com']) assert.equal(isReservedTestEmail(email),false);
  assert.match(await source('lib/account-email.ts'),/if \(isReservedTestEmail\(email\)\) return false/);
});

test('photos avoid cropping, enlargement and cover stretching, retaining full-photo links',async()=>{
  const css=await source('app/globals.css');
  assert.match(css,/\.public-profile-image \{ object-fit: scale-down; \}/);
  assert.match(css,/\.profile-page-cover, \.profile-media-grid img \{ object-fit: scale-down; \}/);
  assert.match(css,/align-self: start; width: 100%; min-height: 0; aspect-ratio: 4 \/ 5/);
  assert.match(await source('app/perfil/[slug]/page.tsx'),/Ver foto completa/);
});

test('watermark is large, monochrome, centered and optional for owners and administrators',async()=>{
  const transform=await source('app/mi-cuenta/watermark-image.ts');
  assert.match(transform,/context\.fillText\(text, width \/ 2, height \/ 2\)/);
  assert.match(transform,/width \* 0\.76/);
  assert.match(transform,/rgba\(255, 255, 255, 0\.28\)/);
  assert.match(transform,/return \{ file, facesBlurred: 0, qualityWarning \}/);
  assert.doesNotMatch(transform,/watermarkPositions|globalCompositeOperation|logo-primary/);
  const manager=await source('app/mi-cuenta/ProfileMediaManager.tsx');
  assert.match(manager,/candidate\?\.watermark \?\? photoWatermark/);
  assert.doesNotMatch(manager,/candidate.image && adminMode && <label/);
  assert.match(manager,/if \(image\) \{/);
});

test('QA listings remain honest and noindex while normal messaging and moderation stay enabled',async()=>{
  const profile=await source('app/perfil/[slug]/page.tsx');
  assert.match(profile,/robots: profile.isDemo \? \{ index: false, follow: false \}/);
  assert.match(profile,/Ficha de prueba: no representa un servicio disponible/);
  assert.match(profile,/profile.status === "approved" && <ProfileReviews/);
  const chat=await source('lib/internal-messages.ts');
  assert.doesNotMatch(chat,/if \(!profile \|\| profile.isDemo/);
  assert.match(chat,/profile.ownerUserId === visitorUserId/);
  assert.match(chat,/blockedByAnyone/);
  assert.match(chat,/rate_limited/);
  const setup=await source('scripts/prepare-test-accounts.mjs');
  assert.match(setup,/profiles.length !== 27/);
  assert.match(setup,/role='advertiser'/);
  assert.doesNotMatch(setup,/SET is_demo=0|role='admin'/);
  assert.match(setup,/rollback.sql/);
});
