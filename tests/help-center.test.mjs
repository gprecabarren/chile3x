import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { getHelpTopics, helpKnowledge } from '../lib/help-knowledge.ts';
import { helpAnswer, helpTopicLink, normalizeHelpQuery, searchHelpTopics, sensitiveHelpQuery } from '../lib/help-search.ts';
import { HELP_BETA_NOTICE } from '../lib/help-types.ts';
import { ADMIN_ACCESS_CAPABILITIES } from '../lib/admin-permissions.ts';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const account = getHelpTopics('account');
const admin = getHelpTopics('admin', { capabilities: ADMIN_ACCESS_CAPABILITIES.administrator });

test('help catalog is role-scoped before serialization, including private/admin and tester capabilities', () => {
  assert.ok(account.length >= 25 && admin.length >= 16);
  assert.equal(new Set(helpKnowledge.map(topic => topic.id)).size, helpKnowledge.length);
  assert.ok(account.every(topic => topic.audience !== 'admin' && !topic.capability && !topic.testerOnly));
  assert.ok(account.every(topic => !topic.link.href.startsWith('/admin')));
  const support = getHelpTopics('admin', { capabilities: ADMIN_ACCESS_CAPABILITIES.support });
  assert.ok(!support.some(topic => ['admin-documents', 'admin-edit', 'admin-access', 'admin-config'].includes(topic.id)));
  assert.ok(!admin.some(topic => topic.id === 'admin-access'));
  assert.ok(getHelpTopics('admin', { capabilities: [...ADMIN_ACCESS_CAPABILITIES.owner] }).some(topic => topic.id === 'admin-access'));
  assert.ok(getHelpTopics('account', { tester: true }).some(topic => topic.id === 'tester'));
});

test('chat understands task questions, conjugations, accents and photo/video vocabulary', () => {
  for (const [query, id] of [
    ['¿Cómo cambio una foto?', 'photo-edit'], ['reemplazar foto', 'photo-edit'], ['CAMBIAR FOTOGRAFÍA', 'photo-edit'],
    ['No puedo subir un video', 'upload-error'], ['no me deja subir una imagen PNG', 'upload-error'],
    ['¿Dónde veo mis comentarios?', 'reviews'], ['¿Cómo edito un anuncio?', 'edit'],
    ['¿Cómo publico una historia?', 'stories'], ['recuperar contraseña', 'password'],
    ['desvincular Google', 'social'], ['eliminar cuenta', 'account-close'], ['Hola', 'general-help'],
  ]) {
    const answer = helpAnswer(account, query);
    assert.equal(answer.kind, 'answer', query);
    assert.equal(answer.topics[0].id, id, query);
  }
  for (const [query, id] of [['¿Cómo edito un anuncio?', 'admin-edit'], ['¿Cómo apruebo todas las fotos?', 'admin-media'], ['¿Cómo publico una historia?', 'admin-stories'], ['aprobar comentarios', 'admin-reviews']]) {
    assert.equal(helpAnswer(admin, query).topics[0]?.id, id, query);
  }
});

test('ambiguous and unsupported questions do not invent answers or actions', () => {
  assert.equal(helpAnswer(account, 'fotos').kind, 'choices');
  assert.equal(helpAnswer(account, 'orbita orbital galactica').kind, 'fallback');
  assert.equal(helpAnswer(account, ' ').kind, 'fallback');
  assert.ok(normalizeHelpQuery('x'.repeat(50_000)).length <= 500);
  assert.ok(searchHelpTopics(account, 'foto', 500).length <= 20);
  assert.equal(helpAnswer(account, 'aprobar fotos').topics[0]?.id, 'media-review');
});

test('owned-announcement links are exact and have a safe generic fallback', () => {
  const profile = { id: 'prf_owned', name: 'Anuncio propio', publicPath: '/perfil/@propio' };
  assert.equal(helpTopicLink(account.find(topic => topic.id === 'photo-edit'), profile), '/mi-cuenta/prf_owned/editar#fotos-y-videos');
  assert.equal(helpTopicLink(account.find(topic => topic.id === 'documents'), profile), '/mi-cuenta/prf_owned/editar#documentos-privados');
  assert.equal(helpTopicLink(account.find(topic => topic.id === 'stories'), profile), '/mi-cuenta/prf_owned/historias');
  assert.equal(helpTopicLink(account.find(topic => topic.id === 'preview'), profile), '/perfil/@propio');
  assert.equal(helpTopicLink(account.find(topic => topic.id === 'photo-edit')), '/mi-cuenta#mis-anuncios');
});

test('every catalog destination exists and never performs an API mutation', async () => {
  for (const topic of helpKnowledge) {
    assert.ok(topic.link.href.startsWith('/') && !topic.link.href.startsWith('//'));
    assert.ok(!topic.link.href.startsWith('/api/'));
    assert.ok(topic.steps.length >= 3);
    const path = topic.link.href.split(/[?#]/)[0];
    await access(new URL(`../app${path}/page.tsx`, import.meta.url));
  }
  assert.match(HELP_BETA_NOTICE, /errores[\s\S]*WhatsApp/);
});

test('help is private, read-only, locally ephemeral and uses configured support contacts', async () => {
  const [client, userPage, adminPage, navigation, adminNavigation] = await Promise.all([
    source('app/help/HelpCenter.tsx'), source('app/mi-cuenta/ayuda/page.tsx'), source('app/admin/ayuda/page.tsx'), source('app/mi-cuenta/_components.tsx'), source('app/admin/_components.tsx'),
  ]);
  assert.doesNotMatch(client, /fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML/);
  assert.match(client, /HELP_BETA_NOTICE/);
  assert.match(client, /aria-live="polite"/);
  assert.match(client, /no es IA generativa/);
  assert.match(client, /sensitiveHelpQuery\(text\)/);
  assert.match(userPage, /getCurrentUser\(\)/); assert.match(userPage, /eq\(profiles.ownerId, user.id\)/);
  assert.match(adminPage, /getCurrentAdmin\(\)/); assert.match(adminPage, /adminHasCapability\(admin, capability\)/);
  for (const page of [userPage, adminPage]) { assert.match(page, /privatePageMetadata/); assert.match(page, /publicWhatsappContacts\(settings\)/); }
  assert.match(navigation, /href="\/mi-cuenta\/ayuda"/); assert.match(adminNavigation, /href="\/admin\/ayuda"/);
  assert.ok(sensitiveHelpQuery('mi correo es privado@example.invalid'));
  assert.ok(sensitiveHelpQuery('mi clave es super-secreta'));
  assert.ok(!sensitiveHelpQuery('como cambio mi contraseña'));
});
