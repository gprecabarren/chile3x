import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { multipartBodyLimit } from '../worker/upload-limits.ts';
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin editor and save endpoint require moderation; owner controls remain scoped to the owner', async () => {
  const [page, route, update, list, owner, editor] = await Promise.all([
    source('app/admin/anuncios-publicaciones/[profileId]/editar/page.tsx'), source('app/api/admin/profiles/[profileId]/editar/route.ts'), source('lib/profile-submission.ts'),
    source('app/admin/anuncios-publicaciones/page.tsx'), source('app/mi-cuenta/page.tsx'), source('app/mi-cuenta/[profileId]/editar/page.tsx'),
  ]);
  for (const value of [page, route]) { assert.match(value, /getCurrentAdmin\(\)/); assert.match(value, /adminHasCapability\(admin, "profiles.moderate"\)/); assert.match(value, /isNull\(profiles.trashedAt\)/); }
  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /updateProfile\(profileId, before.profile.ownerId, submission, \{ adminEditor: true \}\)/);
  assert.match(route, /profile.details_update/);
  assert.match(update, /options.adminEditor \? existing.profile.status/);
  assert.match(update, /options.adminEditor \? sql`\$\{profiles.verificationStatus\}`/);
  assert.match(update, /status: options.adminEditor \? sql`\$\{profiles.status\}`/);
  assert.match(list, /href=\{editHref\}>Editar anuncio/);
  for (const anchor of ['fotos-y-videos', 'documentos-privados', 'historias']) { assert.ok(page.includes(anchor)); assert.ok(list.includes(anchor)); }
  assert.match(owner, /Documentos privados/); assert.match(editor, /eq\(profiles.ownerId, user.id\)/);
});

test('private document reads and mutations require ownership or the private-view capability', async () => {
  const [route, page] = await Promise.all([source('app/api/perfiles/[profileId]/documentos/[kind]/route.ts'), source('app/admin/anuncios-publicaciones/[profileId]/editar/page.tsx')]);
  assert.equal((route.match(/adminHasCapability\(sessionAdmin, "private.view"\)/g) ?? []).length, 2);
  assert.match(route, /user\?\.id !== record.profile.ownerId/);
  assert.match(route, /profile\?\.ownerId === user.id/);
  assert.match(route, /private, no-store/);
  assert.match(page, /canReadDocuments && row.profile.type === "escort" \? getVerificationDocuments/);
});

test('administrative stories are authorized, bound to the listing, bounded atomically and audited', async () => {
  const [route, manager, audit] = await Promise.all([source('app/api/admin/profiles/[profileId]/historias/route.ts'), source('app/mi-cuenta/ProfileStoryManager.tsx'), source('lib/admin-audit.ts')]);
  assert.match(route, /assertSameOrigin\(request\)/); assert.match(route, /getCurrentAdmin\(\)/);
  assert.match(route, /"profiles.moderate"/); assert.match(route, /"media.moderate"/);
  assert.match(route, /eq\(profileStatuses.profileId, profileId\)/);
  assert.match(route, /profile.status !== "approved" \|\| profile.hiddenAt/);
  assert.match(route, /MAX_STORY_IMAGE_BYTES/); assert.match(route, /MAX_STORY_TEXT_LENGTH/);
  assert.match(route, /SELECT count\(\*\) FROM profile_statuses/); assert.match(route, /u.is_active = 1/);
  assert.match(route, /inserted.meta.changes/); assert.match(route, /usage.bytes \+ imageData.byteLength > MEDIA_HARD_LIMIT_BYTES/);
  assert.match(route, /story.create/); assert.match(route, /story.delete/); assert.match(route, /recordAdminAudit\(admin/);
  assert.match(manager, /adminMode \? `\/api\/admin\/profiles\/\$\{profileId\}\/historias` : "\/api\/historias"/);
  assert.match(manager, /name="story_id" value=\{story.id\}/);
  assert.match(audit, /"story.create"/); assert.match(audit, /"story.delete"/);
  assert.equal(multipartBodyLimit('/api/admin/profiles/prf_test/historias'), multipartBodyLimit('/api/historias'));
});
