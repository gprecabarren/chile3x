import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { stripTypeScriptTypes } from 'node:module';
import { adminHasCapability } from '../lib/admin-permissions.ts';
import { FORUM_LIMITS, ForumInputError, forumOrder, forumPage, forumSearch, forumSearchPattern, forumText } from '../lib/forum-policy.ts';
const source = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const locationsUrl = new URL('../app/locations.ts', import.meta.url).href;
const profileSource = source('lib/profile.ts').replace('"@/app/locations"', JSON.stringify(locationsUrl));
const { isAvailableEveryDay24Hours, readAvailability } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(profileSource)).toString('base64')}`);
const form = fields => { const f=new FormData(); for(const [k,v] of Object.entries(fields)) f.set(k,v); return f; };

test('24/7 collapses exactly all seven full days, not partial weeks or repeated day keys',()=>{
  const days=['mon','tue','wed','thu','fri','sat','sun'];
  const all=readAvailability(days.map(day=>`${day}=00:00-24:00`).join('|'));
  assert.equal(isAvailableEveryDay24Hours(all),true);
  assert.equal(isAvailableEveryDay24Hours(all.slice(0,6)),false);
  assert.equal(isAvailableEveryDay24Hours(Array(7).fill(all[0])),false);
  assert.equal(isAvailableEveryDay24Hours(all.map((d,i)=>i===0?{...d,opensAt:'01:00'}:d)),false);
  assert.equal(isAvailableEveryDay24Hours(readAvailability('mon=24:00-00:00')),false);
});
test('forum capability never grants normal staff access to the private beta',()=>{
  for(const role of ['owner','administrator']) assert.equal(adminHasCapability({accessLevel:role},'forum.manage'),true);
  for(const role of ['moderator','editor','support']) assert.equal(adminHasCapability({accessLevel:role},'forum.manage'),false);
  assert.equal(adminHasCapability(null,'forum.manage'),false);
});
test('forum forms are bounded, whitespace aware, and literal searches escape SQL wildcard characters',()=>{
  assert.equal(forumText(form({x:'  texto  '}),'x',20),'texto');
  for(const x of ['', 'x'.repeat(21),'mal\u0000']) assert.throws(()=>forumText(form({x}),'x',20),ForumInputError);
  assert.equal(forumText(form({x:''}),'x',20,false),'');
  assert.equal(forumOrder(form({orden:'20'})),20);
  for(const orden of ['-1','10000','1.5','no']) assert.throws(()=>forumOrder(form({orden})),ForumInputError);
  assert.equal(forumPage('-1'),1); assert.equal(forumPage('9999'),1000); assert.equal(forumPage('2'),2);
  assert.equal(forumSearch('x'.repeat(500)).length,FORUM_LIMITS.query);
  assert.equal(forumSearchPattern('50%_a\\b'),'%50\\%\\_a\\\\b%');
});
test('forum migration touches no existing announcements and seeds every Chilean region',()=>{
  const migration=source('drizzle/0044_private_forum_beta.sql');
  assert.doesNotMatch(migration,/\b(?:ALTER|DROP|DELETE|UPDATE)\b/i);
  const db=new DatabaseSync(':memory:'); try{
    db.exec(migration);
    assert.equal(db.prepare('select count(*) n from forum_sections').get().n,44);
    for(const id of ['xv','i','ii','iii','iv','v','rm','vi','vii','xvi','viii','ix','xiv','x','xi','xii']) assert.ok(db.prepare('select id from forum_sections where id=?').get(`foro_region_${id}`));
    assert.equal(db.prepare('select count(*) n from forum_topics').get().n,0);
  } finally {db.close();}
});
test('all forum pages authenticate before querying; API authenticates before parsing; no public indexing or caches',()=>{
  for(const path of ['app/foro/page.tsx','app/foro/nuevo/page.tsx','app/foro/secciones/page.tsx','app/foro/tema/[topicId]/page.tsx']){
    const text=source(path); assert.ok(text.indexOf('await requireForumAdmin()')<text.lastIndexOf('await Promise.all(')||text.includes('await requireForumAdmin(); const sections = await getForumSections()'));
  }
  const api=source('app/api/admin/foro/route.ts'); assert.ok(api.indexOf('adminHasCapability(admin, "forum.manage")')<api.indexOf('await readForm(request)'));
  assert.match(api,/assertSameOrigin/); assert.match(api,/private, no-store/); assert.match(api,/recordAdminAudit/);
  assert.match(source('lib/forum.ts'),/t.section_id = forum_sections.id/);
  assert.match(source('lib/forum.ts'),/p.topic_id = forum_topics.id/);
  assert.doesNotMatch(source('worker/public-cache.ts'),/"\/foro"/);
  assert.match(source('worker/index.ts'),/pathname === "\/foro" \|\| pathname.startsWith\("\/foro\/"\)/);
  assert.match(source('worker/index.ts'),/"x-robots-tag", "noindex, nofollow, nosnippet"/);
  assert.match(source('app/robots.ts'),/"\/foro"/);
});
test('help toggle hides both navigation variants and rejects direct URLs; portrait has license and bot identity',()=>{
  assert.match(source('app/mi-cuenta/_components.tsx'),/helpEnabled && <AccountNavigationLink href="\/mi-cuenta\/ayuda"/);
  assert.match(source('app/mi-cuenta/ayuda/page.tsx'),/account_help_enabled !== "enabled"\) notFound/);
  const help=source('app/help/HelpCenter.tsx'); assert.match(help,/BOT DE AYUDA DE CHILE3X/); assert.match(help,/CC BY-SA 2.5/); assert.doesNotMatch(help,/bot humorístico/i);
});
test('advertiser WhatsApp uses its own tracked contact and appears ahead of team, with server-owned profile scope',()=>{
  const menu=source('app/FloatingWhatsappMenu.tsx'); assert.ok(menu.indexOf('<TrackedContactLink')<menu.indexOf('{contacts.map('));
  assert.match(menu,/kind="whatsapp"/); assert.match(menu,/profileId=\{advertiser.profileId\}/);
  assert.match(source('app/perfil/[slug]/page.tsx'),/href: profile.isPublic && !profile.isDemo \? contacts.whatsapp : null/);
  assert.match(menu,/advertiser && !advertiser.href/);
});
test('legal documents have visible versions, current story expiry, and no blanket anonymous-message claim',()=>{
  const terms=source('app/terminos/page.tsx'),privacy=source('app/privacidad/page.tsx');
  for(const text of [terms,privacy]){assert.match(text,/version="2026.10.14.2"/); assert.match(text,/texto.*24 horas/);assert.doesNotMatch(text,/conservarse por más tiempo|historial anonimizado/);}
  assert.match(privacy,/no se guardan como conversación en la base de datos/);
});
