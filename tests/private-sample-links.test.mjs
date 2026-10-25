import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(s,c,next){if(s==='./private-sample-policy')return{url:new URL('../lib/private-sample-policy.ts',import.meta.url).href,shortCircuit:true};return next(s,c);}});
const {encryptPrivateSampleToken,decryptPrivateSampleToken}=await import('../lib/private-sample-links.ts');
hooks.deregister();
test('sample links are authenticated, bound to their row, recoverable and randomized at rest',async()=>{
 const secret='a'.repeat(43),token='b'.repeat(64),id='sample-one';
 const first=await encryptPrivateSampleToken(token,id,secret),second=await encryptPrivateSampleToken(token,id,secret);
 assert.notEqual(first,second);assert.ok(!first.includes(token));assert.equal(await decryptPrivateSampleToken(first,id,secret),token);
 await assert.rejects(decryptPrivateSampleToken(first,'sample-two',secret));
 await assert.rejects(decryptPrivateSampleToken(first,id,'c'.repeat(43)));
 await assert.rejects(decryptPrivateSampleToken(first.slice(0,-3)+'AAA',id,secret));
 await assert.rejects(encryptPrivateSampleToken(token,id,''));
});
