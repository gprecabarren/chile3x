import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('all writing controls use regular text without changing select or action typography',async()=>{
 const [root,css]=await Promise.all([source('app/layout.tsx'),source('app/panel-foundations.css')]);
 assert.match(root,/import "\.\/panel-foundations\.css"/);
 assert.match(css,/input:not\([^\n]+\),\s*textarea \{ font-weight:400 !important; \}/);
 for(const type of ['button','submit','checkbox','radio','file','range'])assert.ok(css.includes(`[type="${type}"]`));
 assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g,''),/\bselect\b[^{}]*\{[^}]*font-weight:400/);
});
test('panel content and branding remain scoped, aligned and responsive across both workspaces',async()=>{
 const css=await source('app/panel-foundations.css');
 assert.match(css,/\.admin-workspace \.admin-root \.admin-content,/);
 assert.match(css,/\.account-workspace \.account-root \.account-content \{[^}]*margin-inline:28px/);
 assert.match(css,/\.admin-sidebar-brand > a:first-child:not\(\.sidebar-return-site\),[\s\S]*border-radius:var\(--corner-9\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
});
test('mail layout uses full-width notes instead of the legacy icon/text grid',async()=>{
 const [page,fields,css]=await Promise.all([source('app/admin/configuracion/[section]/page.tsx'),source('app/admin/configuracion/MailSettingsFields.tsx'),source('app/admin/configuracion/mail-settings.css')]);
 assert.match(page,/admin-mail-settings-page/);assert.match(fields,/mail-settings-note admin-field-full/);
 assert.doesNotMatch(fields,/className="admin-note"/);
 assert.match(css,/\.admin-settings-page-form \{[^}]*max-width:none/);
 assert.match(css,/\.mail-settings-note \{ display:block/);
 assert.match(css,/align-content:start/);assert.match(css,/height:48px/);
});
test('mobile Telegram layouts and hidden news uploads cannot inherit overflowing desktop grids',async()=>{
 const css=await source('app/panel-foundations.css');
 assert.match(css,/\.admin-news-editor :is\(\.rich-news-toolbar,\.news-cover-uploader\) input\[type="file"\] \{[^}]*width:1px;[^}]*min-height:0/);
 assert.match(css,/\.telegram-admin-metrics \{ grid-template-columns:repeat\(auto-fit/);
 assert.match(css,/@media\(max-width:780px\)[\s\S]*\.telegram-user-flow/);
 assert.match(css,/\.account-workspace \.account-danger-actions,\s*\.admin-workspace \.admin-account-control-actions \{ grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.browser-session-boundary\[data-session-checking="true"\] \* \{ visibility:hidden !important/);
 assert.match(css,/\.session-check-screen \{ position:fixed/);
});

test('touch navigation cannot keep a second active-looking hover, admin selection is gray and mobile account branding is compact',async()=>{
 const [admin,account,css]=await Promise.all([source('app/admin/admin-workspace.css'),source('app/mi-cuenta/account-workspace.css'),source('app/panel-foundations.css')]);
 for(const sheet of [admin,account])assert.match(sheet,/@media\(hover:hover\) and \(pointer:fine\)[^\n]+:hover:not\(\.is-current\)/);
 assert.match(admin,/nav a\.is-current \{[^}]*background:#263145/);
 assert.match(css,/\.account-sidebar-head \.account-brand-home \{ width:fit-content;[^}]*min-height:28px/);
});
