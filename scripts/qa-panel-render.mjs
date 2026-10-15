// Read-only render audit against the disposable loopback QA proxies.
// Checking HTTP status alone misses streamed RSC errors returned with HTTP 200.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const fixture=JSON.parse(readFileSync('outputs/qa-account-moderation.json','utf8'));
assert.match(fixture.prefix,/^qa_account_[a-f0-9]+$/);
const paths=[];
function walk(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())walk(path);else if(entry.name==='page.tsx')paths.push('/'+path.replaceAll('\\','/').replace(/^app\//,'').replace(/\/page\.tsx$/,''));}}
walk('app/admin');walk('app/mi-cuenta');
const sections=['operacion','seo','google','x','apple','contacto','correo','contenido','ayuda','medios'];
const targets=paths.flatMap(path=>path.includes('[section]')?sections.map(section=>path.replace('[section]',section)):[path]).map(path=>path.replace('[userId]',fixture.users[1]).replace('[profileId]',fixture.profiles[path.startsWith('/admin')&&!path.includes('/cuentas/')?3:0]));
targets.push('/admin/medios?tipo=exclusive','/admin/medios?cuenta='+fixture.users[1],'/admin/anuncios-publicaciones?estado=pending','/mi-cuenta/contenido?tab=galeria');
const results=[];
for(const path of targets){
 const started=Date.now(),origin=path.startsWith('/admin')?'http://127.0.0.1:3002':'http://127.0.0.1:3001';
 try{
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(30_000)}),html=await response.text();
  const streamedError=/\d+:E\{/.test(html),headings=[...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(match=>match[1].replace(/<[^>]*>/g,'').slice(0,100)),heading=headings.find(text=>text!=='Preparando acceso seguro')??headings[0]??null;
  const failed=response.status>=400||streamedError||(!heading&&html.length<1000);
  const result={path,status:response.status,failed,streamedError,heading,ms:Date.now()-started};results.push(result);console.log(JSON.stringify(result));
 }catch(error){const result={path,failed:true,error:error.name,ms:Date.now()-started};results.push(result);console.log(JSON.stringify(result));}
}
mkdirSync('outputs/qa-2026-10-15',{recursive:true});writeFileSync('outputs/qa-2026-10-15/panel-render-audit.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({checked:results.length,failures:results.filter(result=>result.failed).length}));
if(results.some(result=>result.failed))process.exitCode=1;
