import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('SEO guide uses already loaded current values and explicitly separates Home and global priority',async()=>{
  const guide=await source('app/admin/contenido/seo/SeoSettingsHelp.tsx');
  for(const expected of ['settings.site_title','parseHomeTexts(settings[`home_content_${layout}`], layout)','readHomeLayout(settings.home_layout)','copy.seoTitle','no lo reemplaza','valores guardados al cargar','Título general A','Título de portada B','interruptor global sí afecta al Home','/admin/contenido/inicio'])assert.ok(guide.includes(expected),expected);
  assert.doesNotMatch(guide,/getSettings|fetch\(|useEffect|useState|localStorage|dangerouslySetInnerHTML|<form|<input/);
  const [global,home,pages,preview]=await Promise.all(['app/admin/configuracion/[section]/page.tsx','app/admin/contenido/inicio/page.tsx','app/admin/contenido/seo/paginas/page.tsx','app/admin/contenido/seo/SeoPreview.tsx'].map(source));
  for(const text of [global,home,pages])assert.match(text,/SeoSettingsGuide/);
  assert.match(global,/Título de respaldo del sitio \(no cambia el Home\)/);
  assert.match(preview,/no es la vista del Home/);
  assert.match(home,/activeLayout=\{readHomeLayout\(settings.home_layout\)\}/);
});

test('help exposes the scope, missing Rank Math analysis and obsolete controls without claiming ranking quality',async()=>{
  const [guide,editor,css]=await Promise.all(['app/admin/contenido/seo/SeoSettingsHelp.tsx','app/admin/contenido/seo/paginas/InformationSeoEditor.tsx','app/admin/contenido/seo/seo-settings-help.css'].map(source));
  for(const expected of ['No implementado','Palabras clave objetivo, densidad','legibilidad','contenido pilar','noarchive','÷ 8 × 100','100/100 no significa','rankmath.com/kb/seo-score-vs-content-ai-score/','developers.google.com/search/docs/crawling-indexing/robots-meta-tag'])assert.ok(guide.includes(expected),expected);
  assert.ok(editor.indexOf('className="info-seo-summary"')<editor.indexOf('<form onSubmit={prepare}'));
  assert.match(editor,/id="information-technical-score"/);assert.match(editor,/passedChecks/);
  assert.match(css,/max-width:700px/);assert.match(css,/:focus-visible/);
  assert.doesNotMatch(css,/backdrop-filter|transform:|overflow:hidden|\.public-header/);
});

test('Home help preserves input names, payload and independent saved layouts',async()=>{
  const editor=await source('app/admin/contenido/inicio/HomeTextEditor.tsx');
  for(const expected of ['open={layout===activeLayout}','name={`${layout}:${key}`}','body.set(`home_content_${layout}`','defaultValue={copy[field]}','HOME_REQUIRED_TEXT_FIELDS.has(field)','Este es el título que manda para /','No cambia el H1 visible','id={`home-${layout}-${group}`}','aria-describedby={helpId}'])assert.ok(editor.includes(expected),expected);
});
