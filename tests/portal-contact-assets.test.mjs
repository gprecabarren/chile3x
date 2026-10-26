import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('shared contact logos load from the private preview origin rather than blocked third-party hosts', async()=>{
 const icon=await readFile(new URL('../app/PortalContactIcon.tsx',import.meta.url),'utf8');
 const images=[...icon.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(match=>match[1]);
 assert.ok(images.length>0);
 for(const path of images){
  assert.ok(path.startsWith('/assets/'),path);
  const data=await readFile(new URL('../public'+path,import.meta.url));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(data.length>8);
 }
 assert.doesNotMatch(icon,/src="https?:\/\//);
});
