import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { LOAD_RECOVERY_SCRIPT } from '../lib/load-recovery.ts';

function harness({text='',stuck=false}={}){
 let now=1,reloads=0,interval,click;const events={},boxes=[];
 const document={visibilityState:'visible',body:{innerText:text,appendChild:box=>boxes.push(box)},getElementById:id=>boxes.find(box=>box.id===id),querySelector:selector=>selector==='main'?(text?{textContent:text}:null):(stuck?{}:null),createElement:()=>({style:{},setAttribute(){},querySelector:()=>({addEventListener:(_,fn)=>{click=fn;}})})};
 const context={document,location:{origin:'https://example.invalid',reload:()=>reloads++},Date:{now:()=>now},setInterval:fn=>{interval=fn;return 1;},clearInterval:()=>{interval=undefined;},window:{addEventListener:(name,fn)=>{events[name]=fn;}}};
 runInNewContext(LOAD_RECOVERY_SCRIPT,context);return {boxes,events,document,tick:ms=>{now+=ms;interval?.();},click:()=>click?.(),reloads:()=>reloads};
}
test('blank page recovery works without React or external assets and never reloads automatically',()=>{
 const h=harness();h.tick(1500);h.tick(10500);assert.equal(h.boxes.length,1);assert.match(h.boxes[0].innerHTML,/No se pudo completar la carga/);assert.equal(h.reloads(),0);h.tick(20000);assert.equal(h.boxes.length,1);h.click();assert.equal(h.reloads(),1);
});
test('ordinary content and hidden tabs never show a spurious recovery screen',()=>{
 const normal=harness({text:'Anuncio y formulario sin guardar'});normal.tick(1500);normal.tick(30000);assert.equal(normal.boxes.length,0);
 const hidden=harness();hidden.document.visibilityState='hidden';hidden.tick(60000);assert.equal(hidden.boxes.length,0);
});
test('an essential script failure can recover a session placeholder without reading credentials or resubmitting',()=>{
 const h=harness({text:'Preparando acceso seguro',stuck:true});h.events.error({target:{tagName:'SCRIPT',src:'https://example.invalid/assets/old.js'}});h.tick(1500);h.tick(10500);assert.equal(h.boxes.length,1);assert.equal(h.reloads(),0);
 assert.doesNotMatch(LOAD_RECOVERY_SCRIPT,/fetch\(|XMLHttpRequest|sessionStorage|localStorage|document\.cookie|requestSubmit|\.submit\(/);
});
