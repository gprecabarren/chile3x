// Read-only pre/post-deployment preservation of the current About page.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const response=await fetch('https://chile3x.cl/quienes-somos',{signal:AbortSignal.timeout(30000)});
assert.equal(response.status,200);
const html=await response.text();assert.ok(html.length<3_000_000);
assert.doesNotMatch(html,/Worker exceeded resource limits|[A-Z]:[\\/]+Users[\\/]+|\d+:E\{/);
const title=html.match(/<title>([\s\S]*?)<\/title>/)?.[1];assert.ok(title);
const tags=[...html.matchAll(/<(?:meta|link)\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+"|rel="canonical")[^>]*>/g)].map(match=>match[0]);
assert.ok(tags.length>8);
const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(match=>match[1]);assert.equal(h1.length,1);
const schemas=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));assert.ok(schemas.length);
const start=html.indexOf('<section class="about-hero">'),end=html.indexOf('<footer',start);assert.ok(start>0&&end>start);
const body=html.slice(start,end).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const snapshot={title,tags,h1,schemas,bodyHash:createHash('sha256').update(body).digest('hex')};
const path='outputs/qa-about-seo-before-20261024.json';
if(process.argv[2]==='capture'){writeFileSync(path,JSON.stringify(snapshot,null,2));console.log('PASS captured current About metadata, social tags, schemas and visible content.');}
else if(process.argv[2]==='check'){assert.deepEqual(snapshot,JSON.parse(readFileSync(path,'utf8')));console.log('PASS published About metadata/social/canonical/robots/H1/schemas/content unchanged.');}
else throw Error('Use capture or check.');
