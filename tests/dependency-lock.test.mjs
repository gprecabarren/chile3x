import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('Cloudflare frozen PNPM install uses the existing pinned graph and matching overrides',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 const lock=(await readFile(new URL('../pnpm-lock.yaml',import.meta.url),'utf8')).replaceAll('\r\n','\n');
 assert.equal(manifest.packageManager,'pnpm@9.15.5');
 const block=lock.split('\noverrides:\n')[1]?.split('\nimporters:')[0];
 assert.ok(block,'The locked dependency overrides must be preserved.');
 const overrides=Object.fromEntries(block.split('\n').filter(line=>/^  \S/.test(line)).map(line=>{const position=line.indexOf(': ');return[line.slice(2,position).replace(/^'|'$/g,''),line.slice(position+2).trim()];}));
 assert.deepEqual(manifest.pnpm.overrides,overrides);
 for(const [name,version]of Object.entries({...manifest.dependencies,...manifest.devDependencies})){
  assert.match(version,/^\d+\.\d+\.\d+$/,'Direct versions remain exact: '+name);
  assert.ok([name,`'${name}'`].some(key=>lock.includes(`      ${key}:\n        specifier: ${version}\n`)),'Locked direct version: '+name);
 }
});
