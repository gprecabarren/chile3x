import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const file=path=>new URL('../'+path,import.meta.url);
const policy=(await readFile(file('lib/video-trim-policy.ts'),'utf8')).replace('"./video-policy"',JSON.stringify(file('lib/video-policy.ts').href));
const {defaultVideoTrim,validateVideoTrim,moveVideoTrim,videoTimeLabel}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(policy)).toString('base64'));

test('a long original defaults to 15 seconds; short originals keep their full duration',()=>{
  assert.deepEqual(defaultVideoTrim(23.06),{start:0,end:15});
  assert.deepEqual(defaultVideoTrim(3.3),{start:0,end:3.3});
  for(const duration of [0,-1,NaN,Infinity])assert.throws(()=>defaultVideoTrim(duration),/duración/);
  assert.deepEqual(validateVideoTrim(23.06,{start:12,end:23.06}),{start:12,end:23.06});
});
test('invalid, reversed, overlong and out-of-source selections never reach conversion',()=>{
  for(const trim of [{start:-1,end:4},{start:0,end:24},{start:5,end:5},{start:8,end:7},{start:NaN,end:4},{start:1,end:Infinity},{start:1,end:17}])assert.throws(()=>validateVideoTrim(23.06,trim));
  assert.throws(()=>validateVideoTrim(1,{start:1.0000005,end:1.0000008}));
});
test('moving either handle preserves source bounds and a positive maximum 15 second clip',()=>{
  for(const duration of [.001,3,15,23.06,120])for(const point of ['start','end'])for(const value of [-5,0,.01,5,12,23.06,1000]){
    const trim=moveVideoTrim(duration,defaultVideoTrim(duration),point,value);
    assert.doesNotThrow(()=>validateVideoTrim(duration,trim));
  }
  assert.deepEqual(moveVideoTrim(23.06,{start:0,end:15},'end',23.06),{start:8.059999999999999,end:23.06});
  assert.equal(videoTimeLabel(12.25),'0:12.25');assert.equal(videoTimeLabel(65.2),'1:05.20');
});
