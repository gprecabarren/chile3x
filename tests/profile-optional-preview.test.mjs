import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyPhotoOptionToSelection } from '../lib/gallery-photo-options.ts';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('every supplemental field is inside one collapsed group, with core fields outside', async () => {
  const form = await source('app/mi-cuenta/ProfileForm.tsx');
  const start = form.indexOf('<details ref={optionalRef}'), end = form.indexOf('</details>', start);
  const optional = form.slice(start, end), core = form.slice(form.indexOf('<form ref='), start);
  assert.ok(start > 0 && end > start);
  assert.match(optional, /Características opcionales/);
  assert.doesNotMatch(optional.slice(0, optional.indexOf('>')), /\bopen\b/);
  for (const name of ['handle', 'tier', 'comuna', 'reference_location', 'price_30_min', 'price_60_min', 'price_moment', 'price_night', 'price_amount', 'currency', 'age', 'gender', 'nationality', 'height_cm', 'weight_kg', 'languages', 'travel_city', 'agency_years', 'website', 'instagram_url', 'room_type', 'deposit', 'wifi', 'contact_phone', 'contact_email', 'contact_telegram', 'tags', 'services_included', 'services_additional']) {
    assert.ok(optional.includes(`name="${name}"`), `${name} belongs to optional group`);
    if (name !== 'tier') assert.ok(!core.includes(`name="${name}"`), `${name} must not appear in core`);
  }
  for (const name of ['type', 'display_name', 'region', 'city', 'short_description', 'description', 'contact_whatsapp']) {
    assert.ok(core.includes(`name="${name}"`), `${name} stays in core`);
    assert.ok(!optional.includes(`name="${name}"`));
  }
  assert.doesNotMatch(form, /name="artist_name"|Nombre artista|className="language-selector"/);
  assert.match(form, /onInvalidCapture=[\s\S]*optionalRef.current.open = true/);
  assert.match(form, /sessionStorage.setItem/);
  assert.doesNotMatch(await source('lib/profile-submission.ts'), /"artist_name"/);
});

test('global photo controls preserve crops/regions, invalidate only changed photos, and never touch videos or uploaded files', () => {
  const region = [{ x: 0.2, y: 0.3, width: 0.1, height: 0.1 }];
  const photo = { id: 'photo', image: true, status: 'failed', watermark: false, blurFaces: false, prepared: { name: 'old.jpg' }, file: { name: 'cropped.jpg' }, faceRegions: region, detail: 'old' };
  const done = { ...photo, id: 'done', status: 'completed' }, video = { ...photo, id: 'video', image: false }, already = { ...photo, id: 'already', watermark: true };
  const original = [photo, done, video, already];
  const result = applyPhotoOptionToSelection(original, 'watermark', true);
  assert.equal(result[0].watermark, true); assert.equal(result[0].prepared, undefined); assert.equal(result[0].status, 'ready');
  assert.equal(result[0].file, photo.file); assert.equal(result[0].faceRegions, region);
  assert.equal(result[1], done); assert.equal(result[2], video); assert.equal(result[3], already);
  assert.equal(photo.watermark, false); assert.ok(photo.prepared);
  const blurred = applyPhotoOptionToSelection(result, 'blurFaces', true);
  assert.equal(blurred[0].blurFaces, true); assert.equal(blurred[0].watermark, true);
  const unblurred = applyPhotoOptionToSelection(blurred, 'blurFaces', false);
  assert.equal(unblurred[0].blurFaces, false); assert.equal(unblurred[0].faceRegions, region);
});

test('private preview authorization is route-scoped and excluded from public indexing and metrics', async () => {
  const [directory, profile, account, edit, media, cache] = await Promise.all([
    source('lib/directory.ts'), source('app/perfil/[slug]/page.tsx'), source('app/mi-cuenta/page.tsx'), source('app/mi-cuenta/[profileId]/editar/page.tsx'), source('app/media/[mediaId]/route.ts'), source('worker/public-cache.ts'),
  ]);
  assert.match(directory, /or\(publicProfileCondition, eq\(profiles.ownerId, options.previewOwnerId\)\)/);
  assert.match(directory, /conditions.push\(isNull\(profiles.trashedAt\)\)/);
  assert.match(directory, /inArray\(profileMedia.moderationStatus, \["approved", "pending"\]\)/);
  assert.match(directory, /eq\(profileMedia.visibility, "public"\)/);
  assert.match(profile, /previewOwnerId: viewer\?\.id/);
  assert.match(profile, /Vista previa privada del anuncio[\s\S]*index: false, follow: false/);
  assert.match(profile, /profile.isPublic && !profile.isDemo && <ProfileViewTracker/);
  assert.match(profile, /profile.isPublic && !profile.isDemo && <script/);
  assert.match(profile, /if \(!profile\) notFound\(\)/);
  assert.match(account, /Previsualizar anuncio/); assert.match(edit, /Previsualizar anuncio/);
  assert.match(media, /!record.profile.ownerHiddenAt/); assert.match(media, /user\?\.id !== record.profile.ownerId/);
  assert.match(cache, /private, no-store/);
  const calls = directory.match(/getPublicProfiles\(\{[^}]*previewOwnerId[^}]*\}\)/g) ?? [];
  assert.equal(calls.length, 3, 'only handle/legacy/slug detail route passes preview ownership');
});
