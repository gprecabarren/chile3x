// Read-only documentation checks. Does not build, deploy, read secrets or use D1/R2.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const full=read('README.md');
const start='<!-- TECHNICAL_HANDOFF_START -->',end='<!-- TECHNICAL_HANDOFF_END -->';
assert.equal(full.split(start).length,2,'Exactly one handoff start marker');
assert.equal(full.split(end).length,2,'Exactly one handoff end marker');
assert.ok(full.indexOf(start)<full.indexOf(end));
const body=full.slice(full.indexOf(start)+start.length,full.indexOf(end));
assert.equal((body.match(/^```/gm)??[]).length%2,0,'Balanced code fences');
assert.match(body,/No es una auditoría exhaustiva línea por línea/);
assert.doesNotMatch(body,/[A-Z]:[\\/]+Users[\\/]+|\bgh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i);
const anchors=[...body.matchAll(/<a id="([^"]+)"><\/a>/g)].map(match=>match[1]);
assert.equal(new Set(anchors).size,anchors.length,'Unique handoff anchors');
let local=0,internal=0;
for(const match of body.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)){
  const target=match[1];
  if(target.startsWith('#')){assert.ok(anchors.includes(target.slice(1)),'Missing anchor '+target);internal++;continue;}
  if(/^https:\/\//.test(target))continue;
  assert.doesNotMatch(target,/^[a-z]+:|^\/|\\/i,'Relative repository link expected');
  const path=resolve(root,decodeURIComponent(target.split('#')[0]));
  const within=relative(root,path);
  assert.ok(within&&!within.startsWith('..')&&!isAbsolute(within),'Link outside repository');
  assert.ok(existsSync(path),'Missing reference '+target);local++;
}
const pkg=JSON.parse(read('package.json'));
for(const version of [pkg.engines.node,pkg.packageManager,pkg.dependencies.react,pkg.dependencies.next,pkg.devDependencies.vinext,pkg.devDependencies.vite,pkg.devDependencies.typescript,pkg.dependencies['drizzle-orm'],pkg.devDependencies.wrangler])assert.ok(body.includes('`'+version+'`'),'Version changed; review the handoff: '+version);
assert.ok(full.indexOf('## Resumen y navegación de Mi cuenta')>full.indexOf(end),'Historical material remains after the handoff');
console.log(`PASS README handoff: ${local} local references, ${internal} internal links, ${anchors.length} unique anchors and declared dependency versions. No application or cloud mutations.`);
