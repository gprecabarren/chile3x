import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {INFORMATION_PAGES,INFO_SETTING_KEYS,informationPageId,informationImagePath,parseInfoSeoOverrides,readInfoSeoOverrides,resolveInfoSeo,informationTechnicalChecks,infoSeoChanges,infoRobotsChanged} from '../lib/information-seo-policy.ts';
import {readBoundedJson} from '../lib/bounded-json.ts';
import {INFORMATION_SEO_DEFAULTS} from '../lib/information-seo-defaults.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const origin='https://chile3x.cl';
const defaults={title:'Contacto | Chile3X',description:'Canales oficiales del sitio.',socialTitle:'Contacto',socialDescription:'Información de contacto.',image:'/chile3x-logo-dark.jpeg?v=3',imageAlt:'Marca del sitio',path:'/contacto',origin,source:'Configuración de la página'};

test('information editor is limited to documents; no Home, catalog or private overrides',()=>{
 assert.equal(Object.keys(INFORMATION_PAGES).length,6);
 for(const key of ['contacto','faq','terminos','privacidad','reglas','nosotros']){assert.equal(informationPageId(key),key);assert.ok(INFO_SETTING_KEYS[key]);}
 for(const key of ['inicio','/','perfil','escorts','admin','__proto__','constructor',null,[]])assert.equal(informationPageId(key),null);
});
test('empty installation inherits exact metadata and never writes defaults into overrides',()=>{
 assert.deepEqual(readInfoSeoOverrides('',origin),{});
 const effective=resolveInfoSeo(defaults,{},true);
 for(const key of ['title','description','socialTitle','socialDescription','image','imageAlt'])assert.equal(effective[key],defaults[key]);
 assert.equal(effective.canonical,origin+'/contacto');assert.equal(effective.index,true);assert.equal(effective.follow,true);
 assert.deepEqual(infoSeoChanges({},{}),[]);
 assert.throws(()=>readInfoSeoOverrides('{broken',origin));
});
test('override validation is bounded, plain text and rejects unsupported robots/canonical fields',()=>{
 for(const input of [null,[],{title:''},{title:'<script>bad</script>'},{title:'x'.repeat(181)},{title:'C:/Users/name/file'},{description:'a\u0000b'},{canonical:'https://attacker.invalid'},{noarchive:true},{indexing:'index'},{following:'follow'},{noSnippet:'false'},{maxSnippet:-2},{maxVideoPreview:1.5},{maxImagePreview:'huge'},JSON.parse('{"__proto__":{}}')])assert.throws(()=>parseInfoSeoOverrides(input,origin));
 const expected={title:'Nuevo título',noSnippet:true,maxVideoPreview:-1,maxSnippet:0,maxImagePreview:'standard'};
 assert.deepEqual(parseInfoSeoOverrides({...expected,noImageIndex:false},origin),expected);
});
test('social images cannot expose private media, remote hosts, local paths or active payloads',()=>{
 for(const path of ['/chile3x-logo-dark.jpeg?v=3','/assets/card-1.webp',origin+'/assets/card.png'])assert.ok(informationImagePath(path,origin));
 for(const path of ['https://attacker.invalid/card.png','http://127.0.0.1/card.png','file:///C:/Users/name/card.png','C:/Users/name/card.png','//attacker.invalid/card.jpg','/api/media/card.jpg','/media/private.jpg','/assets/card.svg','/assets/../private.jpg','/assets/%2e%2e/private.jpg','/assets/card.png?track=1','/assets/card.png#hash','/assets/card\\x.png'])assert.equal(informationImagePath(path,origin),null,path);
 assert.equal(parseInfoSeoOverrides({image:origin+'/assets/card.png'},origin).image,'/assets/card.png');
 assert.doesNotThrow(()=>resolveInfoSeo(defaults,{image:'https://['},true));
});
test('global restrictions take precedence and intentional noindex does not lower technical score',()=>{
 for(const overrides of [{},{indexing:'noindex'},{following:'nofollow'},{maxSnippet:0,noSnippet:true}]){
  const value=resolveInfoSeo(defaults,overrides,false);assert.equal(value.index,false);assert.equal(value.follow,false);
  assert.equal(informationTechnicalChecks(defaults,overrides,false).score,100);
 }
 assert.equal(informationTechnicalChecks(defaults,{image:'https://bad.invalid/card.png'},true).score,88);
 assert.deepEqual(infoSeoChanges({title:'Old'},{title:'New',noSnippet:true}),['title','noSnippet']);
 assert.equal(infoRobotsChanged({indexing:'noindex'},{}),true);
 assert.equal(infoRobotsChanged({title:'Old'},{title:'New'}),false);
});
test('JSON request reader rejects overflow and malformed JSON even without a declared size',async()=>{
 const request=value=>new Request(origin+'/api/admin/contenido/seo/contacto',{method:'POST',headers:{'content-type':'application/json'},body:value});
 assert.deepEqual(await readBoundedJson(request('{"a":1}'),16_384),{a:1});
 await assert.rejects(readBoundedJson(request(' '.repeat(17000)),16_384),/tamaño/);
 await assert.rejects(readBoundedJson(request('{broken'),16_384));
 await assert.rejects(readBoundedJson(new Request(origin,{method:'POST',body:'{}'}),16_384),/Formato/);
});
test('editor and API protect authorization, stale snapshots, confirmation and immutable routes',async()=>{
 const api=await source('app/api/admin/contenido/seo/[pageId]/route.ts'),page=await source('app/admin/contenido/seo/paginas/page.tsx'),editor=await source('app/admin/contenido/seo/paginas/InformationSeoEditor.tsx');
 for(const text of ['assertSameOrigin(request)','getCurrentAdmin()','settings.manage','readBoundedJson(request, 16_384)','informationPageId','informationSeoSnapshot(current)','guardedBatch','conflictResponse()','recordAdminAudit','confirmRobots !== true'])assert.ok(api.includes(text),text);
 assert.match(api,/private, no-store/);assert.match(page,/privatePageMetadata/);
 assert.match(editor,/Sin cambios: se conserva/);assert.match(editor,/key=\{effective.imageUrl\}/);assert.match(editor,/response.status === 409 \|\| response.status >= 500/);
 assert.doesNotMatch(editor,/focusKeyword|noarchive|dangerouslySetInnerHTML|localStorage|setInterval/);
 const renderer=await source('lib/information-seo.ts');assert.match(renderer,/if \(!Object.keys\(overrides\).length\) return base/);
 assert.match(await source('app/sitemap.ts'),/hiddenInformationPages/);
 const css=await source('app/admin/contenido/seo/paginas/information-seo.css');assert.doesNotMatch(css,/backdrop-filter|transform:|\.public-header/);
});

test('about metadata has one source of truth and preserves its separate social description and absolute title',async()=>{
 const about=INFORMATION_SEO_DEFAULTS.nosotros;
 assert.notEqual(about.description,about.socialDescription);
 assert.equal(about.socialTitle,about.title+' | Chile3X');
 assert.equal(INFORMATION_PAGES.nosotros.path,'/quienes-somos');
 const publicPage=await source('app/quienes-somos/page.tsx'),server=await source('lib/information-seo.ts'),admin=await source('app/admin/contenido/seo/paginas/page.tsx');
 assert.match(publicPage,/generateMetadata\(\).*informationPageMetadata\('nosotros'\)/);
 assert.doesNotMatch(publicPage,/export const metadata/);
 assert.match(server,/if \(pageId === 'nosotros'\) base.title = \{ absolute: defaults.title \}/);
 assert.match(server,/socialDescription: defaults.socialDescription/);
 assert.doesNotMatch(admin,/Quiénes somos · consulta|import \{ metadata as aboutMetadata/);
 assert.match(admin,/const readOnly = query.pagina === 'inicio';/);
 assert.match(await source('lib/site-settings.ts'),/seo_info_nosotros: ""/);
});
