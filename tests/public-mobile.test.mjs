import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('mobile compactness is isolated from desktop and private panels',async()=>{
 const css=(await source('app/public-mobile.css')).replace(/\/\*[\s\S]*?\*\//g,'').trim();
 assert.ok(css.startsWith('@media (max-width:860px) {'));
 assert.equal((css.match(/@media/g)??[]).length,3);
 assert.doesNotMatch(css,/min-width:|\.admin-workspace|\.account-workspace|@font-face|@import|url\(|backdrop-filter|!important/);
 const layout=await source('app/layout.tsx');
 assert.ok(layout.indexOf('import "./public-mobile.css";')>layout.indexOf('import "./public-desktop.css";'));
});

test('mobile navigation retains its old compact text, separate from action labels',async()=>{
 const css=await source('app/public-mobile.css');
 assert.match(css,/\.mobile-public-quick-links a \{[^}]*min-height:36px;[^}]*font-size:12px;[^}]*line-height:1\.2;/);
 assert.match(css,/grid-template-columns:1\.3fr \.8fr 1fr;/);
 assert.match(css,/\.public-header-actions \.button \{[^}]*min-height:40px;[^}]*font-size:1rem;/);
 assert.doesNotMatch(css,/(?:^|[;\s])height:40px;/);
});

test('narrow phones keep the header actions in one row without hiding or truncating them',async()=>{
 const css=await source('app/public-mobile.css');
 assert.match(css,/@media \(max-width:360px\)/);
 assert.match(css,/\.public-header-actions:not\(\.is-signed-in\),[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/font-size:\.875rem;/);
 assert.doesNotMatch(css,/text-overflow|display:none|overflow:(?:hidden|clip);[^}]*\.public-header/);
 assert.match(css,/\.filter-mobile-toggle small \{[^}]*clip-path:inset\(50%\)/);
});

test('the two home hero actions have equal mobile widths without stretching desktop',async()=>{
 const css=await source('app/public-mobile.css');
 assert.match(css,/@media \(max-width:620px\) \{\s*\/\*[\s\S]*?\*\/\s*:root body \.home-layout--classic \.hero-actions > \.button \{\s*width:100%;\s*min-height:44px;/);
 assert.match(await source('app/home-layouts.css'),/\.home-layout--classic \.home-coverage-action \{ width:auto; min-height:44px;/);
});
