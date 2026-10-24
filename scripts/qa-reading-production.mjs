// Read-only production comparison: preserve metadata and informational content.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://chile3x.cl',baseline='outputs/qa-reading-seo-before.json';
const paths=['/','/faq','/contacto','/terminos','/privacidad','/reglas-de-publicacion','/noticias/como-funciona-chile3x-crear-cuenta-publicar-anuncio'];
const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const hash=text=>createHash('sha256').update(plain(text)).digest('hex');
const snapshots={};
for(const path of paths) {
 const response=await fetch(origin+path,{headers:{'user-agent':'Chile3X-Reading-QA/1.0'},signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,path);const html=await response.text();
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('x-frame-options'),'DENY');
 assert.match(response.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);
 assert.match(response.headers.get('strict-transport-security')??'',/max-age=63072000/);
 assert.doesNotMatch(html,/\d+:E\{|Error 1102|Worker exceeded resource limits|[A-Z]:[\\/]+Users[\\/]+/i);
 const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m=>plain(m[1]));assert.equal(h1.length,1,path);
 const title=html.match(/<title>([\s\S]*?)<\/title>/)?.[1];assert.ok(title,path);
 const canonical=html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];assert.ok(canonical,path);
 const description=html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/)?.[1];assert.ok(description,path);
 const robots=html.match(/<meta\b[^>]*name="robots"[^>]*content="([^"]*)"/)?.[1]??null;
 const schemas=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 let body=null;
 if(path==='/faq')body=[...html.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)].map(m=>plain(m[1])).join(' ');
 else if(path==='/contacto')body=html.match(/<section class="static-page-content contact-content">([\s\S]*?)<\/section>/)?.[1];
 else if(path.startsWith('/noticias/'))body=html.match(/<article class="news-article-content"[^>]*>([\s\S]*?)<\/article>/)?.[1];
 else if(path!=='/')body=html.match(/<div class="legal-content">([\s\S]*?)<\/article>/)?.[1];
 if(path!=='/')assert.ok(body,path+' content');
 snapshots[path]={title,canonical,description,robots,h1,schemas,content:body?hash(body):null};
 console.log('PASS public page, one H1, metadata and structured data: '+path);
}
if(process.argv[2]==='capture'){writeFileSync(baseline,JSON.stringify(snapshots,null,2));console.log('PASS captured pre-deployment SEO/content baseline.');}
else if(process.argv[2]==='check'){assert.deepEqual(snapshots,JSON.parse(readFileSync(baseline,'utf8')));console.log('PASS production metadata, schema and information text unchanged on all seven pages.');}
else throw Error('Use capture or check.');
