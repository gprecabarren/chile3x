// Disposable, local-only checks. Never use this against the production site.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';

const base = process.env.QA_LOCAL_BASE ?? 'http://localhost:3000';
assert.ok(['http://localhost:3000','http://127.0.0.1:8788'].includes(base));
const fixture = JSON.parse(readFileSync('outputs/qa-media-admin.json', 'utf8'));
assert.ok(fixture.prefix.startsWith('qa_media_'));
const database = resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(resolve('.wrangler/visual-state') + '\\'));
const request = (path, cookie, body, origin = base) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(cookie ? { cookie } : {}), ...(body ? { origin, accept: 'application/json' } : {}), authorization: 'qa-local-cache-bypass' }, ...(body ? { body } : {}), redirect: 'manual' });
const adminStoryPath = `/api/admin/profiles/${fixture.profileId}/historias`;
const imageBytes = readFileSync('public/favicon-192.png');
const data = fields => { const form = new FormData(); for (const [key, value] of Object.entries(fields)) form.set(key, value); return form; };

// A resumed overnight QA run may outlive its one-hour disposable sessions.
// Refresh only these exact fixture identities in the named local database.
const sessionDb = new DatabaseSync(database);
try {
  for (const id of [fixture.admin, fixture.owner]) {
    assert.ok(id.startsWith(fixture.prefix));
    assert.ok(sessionDb.prepare('SELECT id FROM users WHERE id=?').get(id));
    sessionDb.prepare('UPDATE auth_sessions SET expires_at=? WHERE user_id=?').run(new Date(Date.now() + 3600_000).toISOString(), id);
  }
} finally { sessionDb.close(); }

if (process.argv[2] === 'proxy') {
  // Read-only UI preview, using disposable server-side test sessions only.
  // Credentials never go into the browser; every mutation is refused here.
  const server = createServer(async (incoming, outgoing) => {
    if (incoming.method !== 'GET') { outgoing.writeHead(405); outgoing.end('Read-only QA preview'); return; }
    const url = new URL(incoming.url, 'http://localhost:4100');
    let path = url.pathname + url.search;
    if (url.pathname === '/qa/account') path = '/mi-cuenta/ayuda';
    if (url.pathname === '/qa/admin') path = '/admin/ayuda';
    if (url.pathname === '/qa/editor') path = `/admin/anuncios-publicaciones/${fixture.profileId}/editar`;
    if (url.pathname === '/qa/profile') path = `/perfil/@${fixture.prefix.replaceAll('_', '-')}`;
    const cookie = path.startsWith('/admin') || path.startsWith('/foro') ? fixture.adminCookie : fixture.ownerCookie;
    try {
      const result = await fetch(base + path, { headers: { cookie, authorization: 'qa-local-cache-bypass', accept: incoming.headers.accept ?? '*/*', 'sec-fetch-dest': incoming.headers['sec-fetch-dest'] ?? '' }, redirect: 'manual' });
      outgoing.writeHead(result.status, Object.fromEntries([...result.headers].filter(([key]) => !['set-cookie', 'content-length', 'content-encoding', 'transfer-encoding'].includes(key))));
      outgoing.end(Buffer.from(await result.arrayBuffer()));
    } catch { outgoing.writeHead(502); outgoing.end('Local preview unavailable'); }
  });
  server.listen(4100, '127.0.0.1', () => console.log('Read-only QA preview: http://localhost:4100/qa/account · /qa/admin · /qa/editor · /qa/profile'));
} else {
  const db = new DatabaseSync(database);
  try {
    assert.equal(db.prepare('SELECT owner_id FROM profiles WHERE id=?').get(fixture.profileId).owner_id, fixture.owner);
    const story = text => data({ body: text });
    const removeStories = async () => {
      for (const { id } of db.prepare('SELECT id FROM profile_statuses WHERE profile_id=?').all(fixture.profileId)) {
        const result = await request(adminStoryPath, fixture.adminCookie, data({ action: 'delete', story_id: id }));
        assert.equal(result.status, 303);
      }
    };
    if (process.argv[2] === 'cleanup') {
      await removeStories();
      const document = await fetch(base + `/api/perfiles/${fixture.profileId}/documentos/identity`, { method: 'DELETE', headers: { cookie: fixture.adminCookie, origin: base } });
      assert.equal(document.status, 200);
      console.log('Removed only local QA stories and the generated test document.');
    } else if (process.argv[2] === 'expire-preview') {
      const stories=db.prepare('SELECT id,r2_key FROM profile_statuses WHERE profile_id=?').all(fixture.profileId);
      assert.equal(stories.length,3);
      fixture.expiryTestStories=stories;
      writeFileSync('outputs/qa-media-admin.json',JSON.stringify(fixture));
      db.prepare('UPDATE profile_statuses SET expires_at=? WHERE profile_id=?').run(new Date(Date.now()-1000).toISOString(),fixture.profileId);
      console.log('Expired exactly three disposable local stories for the scheduled cleanup test.');
    } else if (process.argv[2] === 'verify-expiry') {
      assert.equal(db.prepare('SELECT count(*) AS n FROM profile_statuses WHERE profile_id=?').get(fixture.profileId).n,0);
      console.log('PASS: the scheduled Worker removed all three expired local story records.');
    } else if (process.argv[2] === 'preview-stories') {
      await removeStories();
      for (const type of ['text','image','video']) {
        const form=data({body:`Historia de ${type} para QA local`});
        if(type==='image')form.set('image',new File([imageBytes],'qa-story.png',{type:'image/png'}));
        if(type==='video')form.set('video',new File([readFileSync('tmp/story-qa-video.mp4')],'qa-story.mp4',{type:'video/mp4'}));
        assert.equal((await request(adminStoryPath,fixture.adminCookie,form)).status,201);
      }
      console.log('Three local-only story previews ready; no production changes.');
    } else {
      const editor = `/admin/anuncios-publicaciones/${fixture.profileId}/editar`;
      const endpoint = `/api/admin/profiles/${fixture.profileId}/editar`;
      const editAuditCount = db.prepare("SELECT count(*) AS n FROM admin_audit_logs WHERE actor_user_id=? AND action='profile.details_update'").get(fixture.admin).n;
      const submission = data({ type: 'escort', tier: 'vip', handle: fixture.prefix.replaceAll('_', '-'), display_name: `${fixture.prefix} editor`, region: 'Región del Biobío', city: 'Concepción', short_description: 'Anuncio temporal de QA', description: 'Publicación ficticia local para comprobar el editor. No publicar en producción.', contact_whatsapp: '56912345678', gender: 'Femenino', age: '25', intent: 'submit', services_included: 'Videollamada' });
      const saved = await request(endpoint, fixture.adminCookie, submission);
      assert.equal(saved.status, 303); assert.ok(saved.headers.get('location').includes('notice=saved'));
      assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(fixture.profileId).status, 'approved');
      assert.equal(db.prepare("SELECT count(*) AS n FROM admin_audit_logs WHERE actor_user_id=? AND action='profile.details_update'").get(fixture.admin).n, editAuditCount + 1);
      assert.equal((await request(endpoint, fixture.ownerCookie, submission)).status, 401);
      assert.equal((await request(endpoint, fixture.adminCookie, submission, 'https://not-local.invalid')).status, 403);
      assert.equal((await request(editor)).status, 307);
      db.prepare("UPDATE admin_github_access SET access_level='support' WHERE user_id=?").run(fixture.admin);
      assert.equal((await request(endpoint, fixture.adminCookie, submission)).status, 403);
      assert.equal((await request(adminStoryPath, fixture.adminCookie, story('Texto no autorizado'))).status, 403);
      db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(fixture.admin);
      const adminHtml = await (await request(editor, fixture.adminCookie)).text();
      assert.ok(adminHtml.includes('Documentos privados') && adminHtml.includes('Historias de') && adminHtml.includes('Guardar cambios del anuncio'));
      const userHtml = await (await request('/mi-cuenta/ayuda', fixture.ownerCookie)).text();
      assert.ok(userHtml.includes('Johnny Sins') && userHtml.includes('WhatsApp') && userHtml.includes('photo-edit'));
      assert.ok(!userHtml.includes('admin-edit') && !userHtml.includes('/admin/configuracion'));
      const helpHtml = await (await request('/admin/ayuda', fixture.adminCookie)).text();
      assert.ok(helpHtml.includes('admin-edit') && !helpHtml.includes('admin-access'));
      assert.match(userHtml, /name="robots" content="[^\"]*noindex/);
      const mediaForm = data({ upload_kind: 'gallery' }); mediaForm.set('file', new File([imageBytes], 'qa-icon.png', { type: 'image/png' }));
      assert.equal((await request(`/api/admin/profiles/${fixture.profileId}/media`, fixture.adminCookie, mediaForm)).status, 201);
      const documentForm = new FormData(); documentForm.set('file', new File([imageBytes], 'qa-document.png', { type: 'image/png' }));
      const documentPath = `/api/perfiles/${fixture.profileId}/documentos/identity`;
      assert.equal((await request(documentPath, fixture.adminCookie, documentForm)).status, 200);
      assert.equal((await request(documentPath, fixture.ownerCookie)).status, 200);
      db.prepare("UPDATE admin_github_access SET access_level='support' WHERE user_id=?").run(fixture.admin);
      assert.equal((await request(documentPath, fixture.adminCookie)).status, 404);
      db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(fixture.admin);
      assert.equal((await request(adminStoryPath, fixture.adminCookie, story('x'.repeat(181)))).status, 400);
      assert.equal((await request(adminStoryPath, fixture.ownerCookie, story('Intento ajeno'))).status, 401);
      assert.equal((await request(adminStoryPath, fixture.adminCookie, story('CSRF'), 'https://not-local.invalid')).status, 403);
      const published = await Promise.all(Array.from({ length: 8 }, (_, i) => request(adminStoryPath, fixture.adminCookie, story(`Estado QA ${i}`))));
      assert.equal(published.filter(result => result.status === 201).length, 5);
      assert.equal(published.filter(result => result.status === 409).length, 3);
      assert.equal(db.prepare("SELECT count(*) AS n FROM profile_statuses WHERE profile_id=? AND story_type='text'").get(fixture.profileId).n, 5);
      const imageStory = story('Historia QA de imagen'); imageStory.set('image', new File([imageBytes], 'qa-story.png', { type: 'image/png' }));
      assert.equal((await request(adminStoryPath, fixture.adminCookie, imageStory)).status, 201);
      const videoBytes=readFileSync('tmp/story-qa-video.mp4');
      const videoStory=()=>{const form=story('Video local QA');form.set('profile_id',fixture.profileId);form.set('video',new File([videoBytes],'qa-clip.mp4',{type:'video/mp4'}));return form;};
      const clips=await Promise.all(Array.from({length:7},(_,i)=>request(i%2?adminStoryPath:'/api/historias',i%2?fixture.adminCookie:fixture.ownerCookie,videoStory())));
      assert.equal(clips.filter(result=>result.status===201).length,3);assert.equal(clips.filter(result=>result.status===409).length,4);
      const [clip]=db.prepare("SELECT id FROM profile_statuses WHERE profile_id=? AND story_type='video'").all(fixture.profileId);
      const partial=await fetch(`${base}/historias/${clip.id}/media`,{headers:{range:'bytes=0-31'}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,32);
      assert.equal((await request('/api/historias',fixture.ownerCookie,data({profile_id:fixture.profileId,body:'x'.repeat(181)}))).status,400);
      const bad=videoStory();bad.set('video',new File([imageBytes],'fake.mp4',{type:'video/mp4'}));const badResponse=await request(adminStoryPath,fixture.adminCookie,bad);assert.equal(badResponse.status,400);assert.match((await badResponse.json()).error,/video/);
      const audit = db.prepare("SELECT actor_github_login,after_data FROM admin_audit_logs WHERE actor_user_id=? AND action='story.create' LIMIT 1").get(fixture.admin);
      assert.equal(audit.actor_github_login, fixture.github); assert.ok(JSON.parse(audit.after_data).expiresAt);
      db.prepare("UPDATE profiles SET status='pending' WHERE id=?").run(fixture.profileId);
      assert.equal((await request(adminStoryPath, fixture.adminCookie, story('Estado no publicado'))).status, 409);
      db.prepare("UPDATE profiles SET status='approved' WHERE id=?").run(fixture.profileId);
      await removeStories();
      assert.equal(db.prepare("SELECT count(*) AS n FROM admin_audit_logs WHERE actor_user_id=? AND action='story.delete'").get(fixture.admin).n, 9);
      console.log('PASS: real local admin edit, status preservation, audit actor, CSRF, capability denial, private documents and both help pages.');
      console.log('PASS: 8 concurrent story requests capped atomically at 5; image/text publication, expiry, visibility rules and audited deletion.');
      console.log('PASS: 7 mixed owner/admin video requests capped at 3; real H.264/AAC clip, 206 range playback, invalid-video and oversized-text errors.');
    }
  } finally {
    db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(fixture.admin);
    db.close();
  }
}
