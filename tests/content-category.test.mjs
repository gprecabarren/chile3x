import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { isContentOnly, sellsContent, profileMatchesDirectoryCategory, publicProfileTypeLabel } from '../lib/profile-content-category.ts';
import { directoryOrderScore, readDirectoryOrderSeed } from '../lib/directory-order.ts';
import { profileSeoTitle, profileSeoDescription } from '../lib/profile-seo-content.ts';

test('content categories are explicit and independent of private files, platforms or links', () => {
  const base = { type: 'escort', tier: 'vip', tags: [], details: { metadata: { onlyfans_url: 'https://onlyfans.com/example' } } };
  assert.equal(sellsContent(base), false);
  assert.equal(sellsContent({...base, hasPrivateLibrary: true}), false);
  for(const tier of ['vip','premium','bronze']) {
    const mixed = {...base, tier, tags:['venta-contenido','masajes']};
    assert.equal(isContentOnly(mixed), false);
    assert.equal(sellsContent(mixed), true);
    for(const category of [tier,'masajes','contenido']) assert.equal(profileMatchesDirectoryCategory(mixed,category), true);
    const only = {...mixed, details: {metadata:{content_only:'1'}}};
    assert.equal(isContentOnly(only), true);
    for(const category of ['vip','premium','bronze','masajes','agency','rental']) assert.equal(profileMatchesDirectoryCategory(only,category), false);
    assert.equal(profileMatchesDirectoryCategory(only,'contenido'), true);
    assert.equal(publicProfileTypeLabel(only),'Venta de contenido');
  }
  for(const type of ['agency','rental']) {
    const other={...base,type,contentOnly:true,tags:['venta-contenido'],details:{metadata:{content_only:'1'}}};
    assert.equal(isContentOnly(other),false); assert.equal(sellsContent(other),false);
  }
});

test('creator metadata and full profile have the same non-escort SEO identity', () => {
  for(const flags of [{contentOnly:true},{details:{metadata:{content_only:'1'}}}]) {
    const p={type:'escort',displayName:'Vale',city:'Concepción',...flags};
    assert.equal(profileSeoTitle(p),'Vale, venta de contenido en Concepción');
    assert.doesNotMatch(profileSeoDescription(p,'Región VIII del Biobío'),/escort|putas|VIP/);
  }
});

test('seeded D1 arithmetic matches JS and adjacent pages do not repeat or skip stable listings', () => {
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY)');
    const ids=Array.from({length:77},(_,i)=>i<10?`prf_demo_legacy_${i}`:`prf_00000000-0000-4000-a000-${((i+1)*52389121).toString(16).padStart(12,'0')}`);
    ids.forEach(id=>db.prepare('INSERT INTO profiles VALUES(?)').run(id));
    let suffix='0';
    for(let i=-8;i<0;i++)suffix=`((${suffix} * 131 + coalesce(unicode(lower(substr(id, ${i}, 1))), 0)) % 2147483647)`;
    const sorted=seed=>db.prepare(`SELECT id FROM profiles ORDER BY (${suffix} * ?) % 2147483647, id`).all(seed).map(r=>r.id);
    for(const seed of [1,9231,999999,1000000]) {
      const all=sorted(seed);
      assert.deepEqual(all,[...ids].sort((a,b)=>directoryOrderScore(a,seed)-directoryOrderScore(b,seed)||a.localeCompare(b)));
      const pages=[0,24,48,72].flatMap(offset=>db.prepare(`SELECT id FROM profiles ORDER BY (${suffix} * ?) % 2147483647, id LIMIT 24 OFFSET ?`).all(seed,offset).map(r=>r.id));
      assert.deepEqual(pages,all); assert.equal(new Set(pages).size,77);
    }
    assert.notDeepEqual(sorted(9231),sorted(999999));
    assert.equal(readDirectoryOrderSeed('9231'),9231);
    for(const raw of ['0','-1','1000001','NaN','12;DROP TABLE','',undefined]) {
      const seed=readDirectoryOrderSeed(raw);assert.ok(seed>=1&&seed<=1000000);
    }
  } finally { db.close(); }
});

test('shared editor, public groups and wrapping badge lanes expose the category consistently', async () => {
  const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');
  const [form,submission,groups,filters,css,metadata,pagination]=await Promise.all(['app/mi-cuenta/ProfileForm.tsx','lib/profile-submission.ts','app/directorio/_components.tsx','app/directorio/DirectoryFilters.tsx','app/globals.css','lib/seo.ts','app/directorio/DirectoryPagination.tsx'].map(read));
  assert.match(form,/name="content_only" checked=\{contentOnly\}/);
  assert.match(submission,/if \(contentOnly\) metadata.content_only = "1"/);
  assert.match(submission,/if \(contentOnly && !tags.includes\("venta-contenido"\)\) tags.push/);
  assert.ok(groups.indexOf('id: "masajes"') < groups.indexOf('id: "contenido"') && groups.indexOf('id: "contenido"') < groups.indexOf('id: "agency"'));
  assert.match(groups,/!isContentOnly\(profile\)/);
  assert.match(filters,/<option value="contenido">▧ Venta de contenido<\/option>/);
  assert.match(css,/\.public-card-secondary-badges \.public-card-detail-badges \{ position: static;/);
  assert.match(css,/\.public-card-primary-badges, \.public-card-secondary-badges[^}]*flex-wrap: wrap/);
  assert.match(metadata,/key !== "orden"/); assert.match(pagination,/params.set\("orden", String\(orderSeed\)\)/);
});
