import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {GLASS_STYLESHEET} from '../lib/site-theme-policy.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('public action text uses a readable rem baseline, outside private workspaces',async()=>{
 const css=await source('app/public-controls.css');
 assert.match(css,/:is\(\.home-layout,\.directory-root\)\s*\{\s*--public-action-size:1rem;/);
 assert.match(css,/font-size:var\(--public-action-size\);/);
 assert.match(css,/height:auto;/);
 assert.doesNotMatch(css,/\.admin-workspace|\.account-workspace|font-size:\s*(?:[5-9]|1[0-3])px/);
 assert.match(await source('app/modern-controls.css'),/font-size:14px !important/);
});

test('public navigation, city choices, filters, contacts and legal-footer links share readable actions',async()=>{
 const css=await source('app/public-controls.css');
 for(const selector of ['.mobile-public-quick-links a','.mobile-menu-panel a','.commune-list li a','.home-city-directory-links > a','.directory-city-options button','.directory-filter-form select','.quick-filter-toggle','.profile-share-trigger','.public-footer-navigation','.portal-whatsapp-directory'])assert.ok(css.includes(selector),selector);
 assert.match(css,/overflow-wrap:break-word;/);
 assert.match(css,/white-space:normal;/);
 assert.match(css,/\.profile-engagement-actions \{ flex-wrap:wrap;/);
 assert.match(css,/\.public-navigation \{[\s\S]*flex-wrap:wrap;[\s\S]*overflow-x:visible;/);
 assert.match(css,/\.public-header \.mobile-public-quick-links \.mobile-directory-secondary \{ display:none; \}/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/:focus-visible \{ outline:2px/);
 assert.match(css,/\.directory-city-bar-inner \{ position:relative;/);
 assert.match(css,/\.directory-city-bar details \{ position:static;/);
 assert.match(css,/\.directory-city-popover \{ width:min\(650px,100%\); \}/);
 assert.doesNotMatch(css,/\.button\s*\{[^}]*padding:/);
});

test('public readability is base CSS: no extra font, script, glass preload or theme asset mutation',async()=>{
 const [layout,css]=await Promise.all(['app/layout.tsx','app/public-controls.css'].map(source));
 assert.match(layout,/import "\.\/public-controls.css";/);
 assert.doesNotMatch(css,/@import|@font-face|url\(|backdrop-filter|(?:^|[;{\s])transform:/m);
 assert.equal((css.replace(/\/\*[\s\S]*?\*\//g,'').match(/!important/g)??[]).length,1);
 assert.ok(layout.includes('theme === "liquid-glass" && <link rel="stylesheet" href={GLASS_STYLESHEET}'));
 assert.equal(GLASS_STYLESHEET,'/assets/theme-liquid-glass-20261023-v4.css');
});

test('the public directory return link clearly names the home page',async()=>{
 const bar=await source('app/directorio/DirectoryCityBar.tsx');
 assert.match(bar,/<Link href="\/" className="directory-home-link">Volver a la página principal<\/Link>/);
});
