import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {GLASS_STYLESHEET} from '../lib/site-theme-policy.ts';

const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('both panel sidebar heads use a plain home link with a decorative arrow, not a logo or action button',async()=>{
 for(const panel of ['admin','mi-cuenta']){
  const component=await source(`app/${panel}/_components.tsx`);
  const brand=component.match(/const brand\s*=([^;]+);/)?.[1];
  assert.ok(brand);
  assert.match(brand,/<Link href="\/" className="sidebar-return-site">/);
  assert.match(brand,/<span aria-hidden="true">←<\/span><span>Volver al sitio web<\/span>/);
  assert.doesNotMatch(brand,/OfficialChile3xLogo|<img\b|button-primary|target=|onClick=/);
 }
});

test('both sidebar footers omit initial avatars, enlarge identity text and compact the home-link area',async()=>{
 for(const panel of ['admin','mi-cuenta']){
  const component=await source(`app/${panel}/_components.tsx`);
  const identity=component.match(/const identity\s*=([^;]+);/)?.[1];assert.ok(identity);
  assert.doesNotMatch(identity,/sidebar-avatar|slice\(0,\s*1\)|aria-hidden="true"/);
  assert.match(identity,/<strong/);assert.match(identity,/<small/);
 }
 const css=await source('app/modern-controls.css');
 assert.match(css,/\.admin-workspace \.admin-sidebar-head,\.account-workspace \.account-sidebar-head \{ min-height:60px; padding:8px 14px; \}/);
 assert.match(css,/sidebar-identity strong \{ font-size:14px; line-height:1.5; \}/);
 assert.match(css,/sidebar-identity small \{ font-size:12px; line-height:1.5; \}/);
});

test('shared return link wraps on narrow drawers, retains a touch target and focus, and avoids the old logo box',async()=>{
 const [base,legacy,glass]=await Promise.all(['app/modern-controls.css','app/panel-foundations.css','public'+GLASS_STYLESHEET].map(source));
 assert.match(base,/\.sidebar-return-site\s*\{[^}]*display:flex;[^}]*gap:10px;[^}]*min-width:0;[^}]*min-height:44px;[^}]*background:transparent;/);
 assert.match(base,/\.sidebar-return-site > span:last-child\s*\{[^}]*white-space:normal;[^}]*overflow-wrap:break-word;/);
 assert.match(base,/\.sidebar-return-site:focus-visible\s*\{[^}]*outline:2px/);
 assert.equal((legacy.match(/a:first-child:not\(\.sidebar-return-site\)/g)??[]).length,4);
 assert.match(glass,/\.sidebar-return-site\s*\{[^}]*background:transparent!important;[^}]*box-shadow:none!important;/);
});
