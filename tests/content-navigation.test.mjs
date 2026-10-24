import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {ADMIN_CONTENT_SECTIONS,ADMIN_CONTENT_GROUPS,activeAdminContentSection,isAdminContentPath} from '../lib/admin-content-navigation.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('content navigation selects the most specific route, including nested editors',()=>{
 for(const [path,href] of [
  ['/admin/noticias/nueva','/admin/noticias'],
  ['/admin/noticias/article/editar','/admin/noticias'],
  ['/admin/patrocinadores/item','/admin/patrocinadores'],
  ['/admin/documentos-legales/terms','/admin/documentos-legales'],
  ['/admin/contenido/seo','/admin/contenido/seo'],
  ['/admin/contenido/seo/paginas','/admin/contenido/seo/paginas'],
  ['/admin/contenido/inicio','/admin/contenido/inicio'],
 ]) assert.equal(activeAdminContentSection(path)?.href,href,path);
 for(const path of [null,'/admin/contenidofalso','/admin/noticias-falso','/admin/configuracion'])assert.equal(isAdminContentPath(path),false);
 assert.equal(activeAdminContentSection('/admin/contenido'),undefined);
 assert.equal(isAdminContentPath('/admin/contenido'),true);
 assert.equal(new Set(ADMIN_CONTENT_SECTIONS.map(section=>section.href)).size,ADMIN_CONTENT_SECTIONS.length);
 for(const section of ADMIN_CONTENT_SECTIONS)assert.ok(ADMIN_CONTENT_GROUPS.some(group=>group.id===section.group));
});

test('content hub separates visible text from metadata, labels current location and keeps permission filtering',async()=>{
 const [navigation,hub,shell,home,editor,styles]=await Promise.all([
  source('app/admin/contenido/ContentNavigation.tsx'),source('app/admin/contenido/page.tsx'),
  source('app/admin/_components.tsx'),source('app/admin/contenido/inicio/HomeTextEditor.tsx'),
  source('app/admin/contenido/seo/paginas/page.tsx'),source('app/panel-controls.css')]);
 assert.match(navigation,/activeAdminContentSection\(pathname\)/);
 assert.match(navigation,/hrefs.includes\(section.href\)/);
 assert.match(navigation,/Índice de editores/);assert.match(navigation,/Estás en/);
 assert.match(navigation,/aria-current=\{current\?\.href === section.href \? 'page'/);
 assert.match(navigation,/admin-content-active-mark/);
 assert.match(navigation,/sections.some\(section => section.href === href\)/);
 assert.match(navigation,/<optgroup/);
 for(const code of [hub,shell])assert.match(code,/adminHasCapability/);
 assert.match(hub,/ADMIN_CONTENT_GROUPS.map/);assert.match(hub,/<h3>/);
 assert.match(home,/Textos visibles de esta portada/);assert.match(home,/SEO y enlaces compartidos de esta portada/);
 assert.match(home,/name=\{`\$\{layout\}:\$\{key\}`\}/);
 assert.match(editor,/No cambia el texto visible dentro de la página/);
 assert.match(styles,/\.admin-content-navigation \.button\[aria-current="page"\]/);
 assert.match(styles,/\.admin-workspace \.admin-root > \.admin-content-navigation \{ display:block/);
 assert.match(await source('app/admin/contenido/seo/paginas/information-seo.css'),/\.info-seo-page \.info-seo-navigation \.button\[aria-current="page"\]/);
 assert.match(styles,/@media\(max-width:700px\)/);
 assert.doesNotMatch(styles,/backdrop-filter|transform:|overflow:hidden/);
});

test('private controls use shared DM Sans, flatter fields and intrinsic actions without public overrides',async()=>{
 const [base,controls,modern]=await Promise.all([source('app/globals.css'),source('app/panel-controls.css'),source('app/modern-controls.css')]);
 assert.match(base,/--font-site: "DM Sans Chile3X"/);
 assert.match(base,/body \* \{ font-family: var\(--font-site\) !important/);
 assert.match(controls,/font-size:16px; line-height:1.5/);
 assert.match(controls,/box-shadow:none/);
 assert.match(controls,/admin-account-card-actions > \.button/);
 assert.match(controls,/flex:0 1 auto; width:auto/);
 assert.match(modern,/admin-workspace,\.account-workspace\) \.button.*border-radius:var\(--corner-10\); font-size:14px !important/);
 assert.doesNotMatch(controls,/^\.(?:site-header|hero|button)\b/m);
});
