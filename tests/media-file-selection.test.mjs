import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/lib/media-file-selection.ts') && specifier.startsWith('./')) return next(specifier+'.ts',context);
  return next(specifier,context);
} });
const { selectGalleryFiles } = await import('../lib/media-file-selection.ts');
const image = (name='foto.png',size=100) => ({name,type:'image/png',size});
const video = (name='video.mp4',size=100) => ({name,type:'video/mp4',size});
const options = {imageCount:0,videoCount:0,imageLimit:10,videoLimit:3};

test('mixed multi-file selection routes all photos and videos without changing source order or objects',()=>{
  const files=Object.freeze([image('uno.png'),video('uno.mp4'),image('dos.png'),video('dos.mov')]);
  const result=selectGalleryFiles(files,options);
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.selected.map(x=>[x.file.name,x.image]),[['uno.png',true],['uno.mp4',false],['dos.png',true],['dos.mov',false]]);
  result.selected.forEach((x,i)=>assert.equal(x.file,files[i]));
});
test('typed sections reject the other kind, retaining every valid file from a multiple selection',()=>{
  for(const kind of ['image','video']){
    const result=selectGalleryFiles([image('a.png'),video('b.mp4'),image('c.png'),video('d.mp4')],{...options,kind});
    assert.equal(result.selected.length,2);assert.equal(result.errors.length,2);
    assert.ok(result.selected.every(x=>x.image===(kind==='image')));
    assert.match(result.errors[0],kind==='image'?/solo fotos/:/solo videos/);
  }
});
test('the combined stored and pending count caps public galleries, including a large single drop',()=>{
  const result=selectGalleryFiles([...Array.from({length:9},(_,i)=>image(i+'.png')),...Array.from({length:6},(_,i)=>video(i+'.mp4'))],{...options,imageCount:8,videoCount:2});
  assert.deepEqual(result.selected.map(x=>x.file.name),['0.png','1.png','0.mp4']);
  assert.equal(result.errors.length,12);assert.match(result.errors[0],/máximo de 10 fotos/);assert.match(result.errors.at(-1),/máximo de 3 videos/);
});
test('the private library uses its own 20 photo / 4 video limits through the same validator',()=>{
  const result=selectGalleryFiles([image(),image(),video(),video()],{imageCount:19,videoCount:3,imageLimit:20,videoLimit:4});
  assert.equal(result.selected.length,2);assert.equal(result.errors.length,2);
  assert.match(result.errors[0],/20 fotos/);assert.match(result.errors[1],/4 videos/);
});
test('empty, non-finite, oversized and unsupported sources never consume a valid selection slot',()=>{
  const files=[image('vacía.png',0),image('grande.png',20_000_001),image('nan.png',NaN),video('vacío.mp4',0),video('grande.mp4',50_000_001),video('infinito.mp4',Infinity),{name:'documento.txt',type:'text/plain',size:1},image('buena.png',20_000_000),video('bueno.mp4',50_000_000)];
  const result=selectGalleryFiles(files,{...options,imageCount:9,videoCount:2});
  assert.deepEqual(result.selected.map(x=>x.file.name),['buena.png','bueno.mp4']);assert.equal(result.errors.length,7);
  assert.ok(result.errors.every(x=>!x.includes('máximo de 10 fotos')&&!x.includes('máximo de 3 videos')));
});
test('mobile file names without MIME types and an empty drop retain existing source format rules',()=>{
  const result=selectGalleryFiles([{name:'IMG_001.HEIC',type:'',size:123},{name:'CLIP.MOV',type:'',size:123}],options);
  assert.deepEqual(result.selected.map(x=>x.image),[true,false]);assert.deepEqual(result.errors,[]);
  assert.deepEqual(selectGalleryFiles([],options),{selected:[],errors:[]});
});
