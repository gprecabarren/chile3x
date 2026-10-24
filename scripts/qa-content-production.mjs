// Read-only production smoke: no session access and no mutations.
import assert from 'node:assert/strict';
const origin='https://chile3x.cl';
for(const path of ['/','/escorts','/escorts/concepcion','/perfil/@lalita','/venta-contenido','/robots.txt','/sitemap.xml','/fonts/dm-sans-latin-variable-20261023.woff2','/assets/theme-liquid-glass-20261023-v4.css','/admin','/admin/muestras','/admin/contenido','/muestra/sam_00000000-0000-4000-8000-000000000000','/assets/missing.js.map','/@fs/C:/Users/private']){
 const started=performance.now(),response=await fetch(origin+path,{redirect:'manual',headers:{'user-agent':'Chile3X-Release-Smoke/1.0'},signal:AbortSignal.timeout(30000)});
 const body=await response.text();
 assert.ok(!body.includes('Error 1102')&&!body.includes('Worker exceeded resource limits'),path);
 assert.doesNotMatch(body,/[A-Z]:[\\/]+Users[\\/]+|QA portada [AB]|\d+:E\{/i,path);
 if(path.includes('/@fs/')||path.endsWith('.map'))assert.equal(response.status,404,path);
 else if(path.startsWith('/admin')){assert.ok([200,303,307].includes(response.status),path+' '+response.status);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(response.headers.get('cache-control'),/no-store/);assert.doesNotMatch(body,/name="home_content_classic"|name="owner_email"|Compartir la presentación/);}
 else{assert.equal(response.status,200,path);if(path==='/'){assert.equal((body.match(/<h1\b/g)??[]).length,1);assert.match(body,/rel="canonical" href="https:\/\/chile3x.cl\/"/);assert.ok(body.includes('/fonts/dm-sans-latin-variable-20261023.woff2'));assert.equal(body.includes('data-theme-stylesheet="liquid-glass"'),response.headers.get('x-chile3x-visual-theme')==='liquid-glass');}}
 if(path.startsWith('/muestra/')){assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(response.headers.get('cache-control'),/no-store/);assert.doesNotMatch(body,/<link rel="canonical"/);}
 if(path==='/sitemap.xml')assert.doesNotMatch(body,/\/admin|\/muestra\//);
 console.log(`PASS ${path}: ${response.status} (${Math.round(performance.now()-started)}ms)`);
}
