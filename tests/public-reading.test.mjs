import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {defaultHomeTexts,parseHomeTexts,HOME_TEXT_FIELDS} from '../lib/home-content-policy.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('reading pages use the shared desktop frame, with a bounded paragraph measure',async()=>{
 const css=await source('app/public-desktop.css'),base=await source('app/public-reading.css');
 assert.match(css,/\.static-page-content,\.legal-page,\.news-article,\.news-index\) \{[^}]*width:var\(--public-wide-size\);[^}]*max-width:none;/);
 assert.match(css,/--public-reading-size:1\.125rem/);
 assert.match(base,/--public-reading-size:1rem/);
 assert.match(base,/max-width:82ch/);
 assert.doesNotMatch(base,/\.public-header|\.admin-workspace|\.account-workspace|backdrop-filter|@font-face|url\(/);
 assert.match(await source('app/layout.tsx'),/import "\.\/public-reading.css"/);
});

test('FAQ and legal information retain native content and accessible indexes',async()=>{
 const faq=await source('app/faq/page.tsx'),legal=await source('app/legal/LegalDocumentContent.tsx');
 assert.match(faq,/className="faq-questions"/);
 assert.match(faq,/<details key=\{question\}><summary>\{question\}<\/summary><p>\{answer\}<\/p><\/details>/);
 assert.match(faq,/"@type": "FAQPage"/);
 assert.match(legal,/className="legal-sections"/);
 assert.match(legal,/href=\{`#\$\{section.id\}`\}/);
 assert.match(legal,/<section id=\{section.id\}/);
 const css=await source('app/public-desktop.css');
 assert.match(css,/\.faq-content summary \{ font-size:1\.25rem;/);
 assert.match(css,/\.legal-content \{ display:grid;/);
 assert.match(await source('app/public-reading.css'),/\.legal-index \{ display:block; \}/);
});

test('news layout retains metadata and content without nested main landmarks',async()=>{
 const article=await source('app/noticias/[slug]/page.tsx'),index=await source('app/noticias/page.tsx');
 assert.match(article,/className="news-article-layout"/);
 assert.doesNotMatch(article+index,/<main\b/);
 for(const value of ['newsStructuredData','safeJsonLd','alternates: { canonical }','dangerouslySetInnerHTML={{ __html: post.contentHtml }}'])assert.ok(article.includes(value));
});

test('retired coverage card keeps only its useful action and adopts the renamed stored default',async()=>{
 assert.equal(defaultHomeTexts('classic').coverageButton,'Explorar regiones de Chile');
 assert.equal(parseHomeTexts('{"coverageButton":"Explorar cobertura","coverageTitle":"Viejo título"}','classic').coverageButton,'Explorar regiones de Chile');
 assert.equal(parseHomeTexts('{"coverageButton":"Mi texto personalizado"}','classic').coverageButton,'Mi texto personalizado');
 assert.ok(!('coverageTitle' in HOME_TEXT_FIELDS));
 const home=await source('app/HomeContent.tsx');
 assert.doesNotMatch(home,/hero-card|coverage-panorama|coverage-stats/);
 assert.match(home,/home-coverage-action" href="#cobertura"/);
 assert.equal((home.match(/<h1\b/g)??[]).length,1);
});

test('desktop reading columns remain grouped, with larger type and no phone overrides',async()=>{
 const css=await source('app/public-desktop.css');
 const start=css.indexOf('/* Balanced reading composition');
 const end=css.indexOf('/* Intermediate effective widths');
 const section=css.slice(start,end);
 assert.ok(start>0&&end>start);
 assert.match(section,/--public-reading-size:1\.25rem/);
 assert.match(section,/\.faq-content \{ grid-template-columns:minmax\(0,1100px\) minmax\(280px,360px\); justify-content:center/);
 assert.match(section,/\.news-article-layout \{ grid-template-columns:minmax\(0,1000px\) minmax\(280px,360px\); justify-content:center/);
 assert.match(section,/\.about-hero-copy > p:not\(\.eyebrow\) \{[^}]*font-size:1\.25rem/);
 assert.match(section,/\.legal-content:not\(:has\(\.legal-index\)\) \{ display:block; width:min\(100%,1080px\)/);
 assert.doesNotMatch(section,/@media|\.public-header|\.public-profile|backdrop-filter/);
 assert.ok(css.lastIndexOf('@media',start)===css.indexOf('@media (min-width:1100px)'));
});
