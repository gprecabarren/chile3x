import test from 'node:test';
import assert from 'node:assert/strict';
import {applyGalleryOrder, galleryOrderIds, moveGalleryOrder, validGalleryOrder} from '../lib/media-order.ts';

const media=[{id:'cover',mediaType:'image',isProfilePhoto:true},{id:'a',mediaType:'image',isProfilePhoto:false},{id:'v1',mediaType:'video',isProfilePhoto:false},{id:'b',mediaType:'image',isProfilePhoto:false},{id:'exclusive',mediaType:'image',isProfilePhoto:false,visibility:'exclusive'},{id:'v2',mediaType:'video',isProfilePhoto:false}];
test('gallery movements preserve principal, other media types and exclusive files',()=>{
  assert.deepEqual(galleryOrderIds(media,'image'),['a','b']);
  assert.deepEqual(moveGalleryOrder(media,'b',-1),{kind:'image',order:['b','a']});
  const reordered=applyGalleryOrder(media,'image',['b','a']);
  assert.deepEqual(reordered.map(x=>x.id),['cover','b','v1','a','exclusive','v2']);
  assert.deepEqual(media.map(x=>x.id),['cover','a','v1','b','exclusive','v2']);
  assert.deepEqual(applyGalleryOrder(reordered,'video',['v2','v1']).map(x=>x.id),['cover','b','v2','a','exclusive','v1']);
  for(const[id,direction]of[['a',-1],['b',1],['cover',1],['exclusive',-1],['missing',1]])assert.equal(moveGalleryOrder(media,id,direction),null);
});
test('orders must contain the exact gallery with no duplicate, foreign, missing or mixed-type IDs',()=>{
  for(const order of [null,{},[],['a'],['a','a'],['b','foreign'],['a','v1'],['cover','a','b'],['a',3]])assert.equal(validGalleryOrder(media,'image',order),false);
  for(const kind of [null,'other','IMAGE'])assert.equal(validGalleryOrder(media,kind,['a','b']),false);
  assert.equal(validGalleryOrder(media,'video',['v2','v1']),true);
  assert.throws(()=>applyGalleryOrder(media,'image',['foreign']),/no coincide/);
});
