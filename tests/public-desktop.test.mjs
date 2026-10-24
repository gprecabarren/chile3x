import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('desktop composition is gated above mobile and uses shared fluid page edges',async()=>{
 const css=(await source('app/public-desktop.css')).replace(/\/\*[\s\S]*?\*\//g,'').trim();
 assert.ok(css.startsWith('@media (min-width:1100px) {'));
 assert.equal((css.match(/@media/g)??[]).length,2);
 assert.match(css,/@media \(min-width:621px\) and \(max-width:1099px\)/);
 for(const token of ['--public-wide-max:3200px','--public-page-gutter:clamp(24px,2.5vw,80px)','--public-wide-size:','--public-wide-inset:'])assert.ok(css.includes(token));
 assert.doesNotMatch(css,/\.admin-workspace|\.account-workspace|@font-face|@import|backdrop-filter/);
 assert.match(await source('app/layout.tsx'),/import "\.\/public-desktop.css";/);
});

test('desktop cards fill more columns without inflating sparse rows or scaling their photos',async()=>{
 const css=await source('app/public-desktop.css');
 assert.match(css,/--public-card-min:208px;/);
 assert.match(css,/--public-card-max:252px;/);
 assert.match(css,/grid-template-columns:repeat\(auto-fill,minmax\(var\(--public-card-min\),1fr\)\)/);
 assert.match(css,/max-width:var\(--public-card-max\)/);
 assert.match(css,/\.public-profile-image \{ transform:none; filter:none; \}/);
 assert.match(await source('app/directorio/_components.tsx'),/className="public-profile-image"[^>]*unoptimized/);
});

test('header wraps without clipping and section counts stay next to the heading',async()=>{
 const css=await source('app/public-desktop.css');
 assert.match(css,/\.public-navigation \{[\s\S]*flex-wrap:wrap;[\s\S]*overflow:visible;/);
 assert.doesNotMatch(css,/overflow(?:-x)?:\s*(?:hidden|clip|auto|scroll)/);
 assert.match(css,/summary strong \{ grid-column:1; grid-row:1; \}/);
 assert.match(css,/summary > b \{ grid-column:2; grid-row:1;/);
 assert.match(css,/summary::after \{ grid-column:4; grid-row:1\/3;/);
 assert.doesNotMatch(css,/\.button\s*\{[^}]*(?:width|padding|font-size):/);
});

test('intermediate zoom widths keep the age popover in its filter box without changing phones',async()=>{
 const css=await source('app/public-desktop.css');
 assert.match(css,/\.directory-quick-filters \{ position:relative; \}/);
 assert.match(css,/\.quick-filter-age \{ position:static; \}/);
 assert.match(css,/\.quick-filter-age-popover \{ left:10px; right:auto;[^}]*width:min\(250px,calc\(100% - 20px\)\); \}/);
});
