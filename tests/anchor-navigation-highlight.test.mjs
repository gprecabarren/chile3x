import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createAnchorNavigationHighlight} from '../lib/anchor-navigation-highlight.ts';
import {navigationIsActive} from '../lib/navigation-active.ts';

function fixture(pathname='/',hash='') {
  const browser=new EventTarget(),counts=new Map();
  browser.location={pathname,hash};
  browser.document={documentElement:{clientWidth:1000}};
  const add=browser.addEventListener.bind(browser),remove=browser.removeEventListener.bind(browser);
  browser.addEventListener=(type,fn,options)=>{counts.set(type,(counts.get(type)??0)+1);add(type,fn,options);};
  browser.removeEventListener=(type,fn,options)=>{counts.set(type,(counts.get(type)??0)-1);remove(type,fn,options);};
  return {browser,counts,store:createAnchorNavigationHighlight(browser)};
}

test('coverage starts unselected, activates on every click and survives automatic anchor scroll',()=>{
  const {browser,store}=fixture();let notifications=0;
  const stop=store.subscribe(()=>notifications++);
  assert.equal(store.getSnapshot(),'');
  store.activate('/#cobertura');browser.location.hash='#cobertura';
  browser.dispatchEvent(new Event('scroll'));
  assert.equal(store.getSnapshot(),'/#cobertura');
  browser.dispatchEvent(new Event('wheel'));
  assert.equal(store.getSnapshot(),'');assert.equal(browser.location.hash,'#cobertura');
  store.activate('/#cobertura');assert.equal(store.getSnapshot(),'/#cobertura');
  browser.dispatchEvent(new Event('touchmove'));assert.equal(store.getSnapshot(),'');
  assert.equal(notifications,4);stop();
});

test('cross-page and browser history anchors activate, but dismissed hash is not reactivated on remount',()=>{
  const {browser,store}=fixture('/escorts');let stop=store.subscribe(()=>{});
  store.activate('/#cobertura');browser.location.pathname='/';browser.location.hash='#cobertura';
  browser.dispatchEvent(new Event('hashchange'));assert.equal(store.getSnapshot(),'/#cobertura');
  browser.dispatchEvent(new Event('touchmove'));stop();stop=store.subscribe(()=>{});
  assert.equal(store.getSnapshot(),'');
  browser.location.pathname='/escorts';browser.location.hash='';browser.dispatchEvent(new Event('popstate'));
  assert.equal(store.getSnapshot(),'');assert.equal(navigationIsActive('/escorts','/escorts'),true);
  browser.location.pathname='/';browser.location.hash='#cobertura';browser.dispatchEvent(new Event('popstate'));
  assert.equal(store.getSnapshot(),'/#cobertura');stop();
});

test('late anchor arrival cannot re-highlight after the user already scrolled',()=>{
  const {browser,store}=fixture('/escorts');const stop=store.subscribe(()=>{});
  store.activate('/#cobertura');browser.dispatchEvent(new Event('wheel'));
  browser.location.pathname='/';browser.location.hash='#cobertura';
  browser.dispatchEvent(new Event('hashchange'));assert.equal(store.getSnapshot(),'');
  store.activate('/#cobertura');assert.equal(store.getSnapshot(),'/#cobertura');
  browser.dispatchEvent(new Event('touchmove'));
  browser.dispatchEvent(new Event('hashchange'));assert.equal(store.getSnapshot(),'');stop();
});

test('desktop/mobile copies share listeners, keyboard and scrollbar dismiss; subscriptions clean up',()=>{
  const previous=globalThis.Element;
  globalThis.Element=class extends EventTarget {closest(){return null;}};
  try {
    const {browser,store,counts}=fixture('/','#cobertura');
    const a=store.subscribe(()=>{}),b=store.subscribe(()=>{});
    assert.equal(counts.get('wheel'),1);assert.equal(counts.get('touchmove'),1);
    const key=new Event('keydown');Object.defineProperty(key,'key',{value:'PageDown'});browser.dispatchEvent(key);
    assert.equal(store.getSnapshot(),'');
    store.activate('/#cobertura');const pointer=new Event('pointerdown');Object.defineProperty(pointer,'clientX',{value:1005});browser.dispatchEvent(pointer);
    assert.equal(store.getSnapshot(),'');a();assert.equal(counts.get('wheel'),1);b();
    for(const count of counts.values())assert.equal(count,0);
  } finally {if(previous===undefined)delete globalThis.Element;else globalThis.Element=previous;}
});

test('the header keeps native URLs/history, page selection, modified clicks and caller handlers',async()=>{
  const code=await readFile(new URL('../app/directorio/PublicNavigationLink.tsx',import.meta.url),'utf8');
  for(const expected of ['onClick?.(event)','event.defaultPrevented','event.metaKey','event.ctrlKey','props.download','target.origin === window.location.origin','"location" : "page"','isAnchor ? subscribe : noSubscription'])assert.ok(code.includes(expected),expected);
  assert.doesNotMatch(code,/preventDefault\(|replaceState|pushState|removeAttribute|scrollTo\(|fetch\(|localStorage/);
});
