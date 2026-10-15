import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';
import { registerHooks } from 'node:module';
import { adminHasCapability } from '../lib/admin-permissions.ts';
const source = path => readFile(new URL('../'+path,import.meta.url),'utf8');
const dataUrl = text => 'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const linkStub = dataUrl(`import {createElement} from ${JSON.stringify(import.meta.resolve('react'))};export default function Link({prefetch,children,...props}){return createElement('a',props,children);}`);
async function component(path) {
 let code=ts.transpileModule(await source(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 code=code.replace(/from "([^"\n]+)"/g,(_all,name)=>`from ${JSON.stringify(name==='@/app/NavigationLink'?linkStub:name==='@/lib/profile'?new URL('../lib/profile.ts',import.meta.url).href:import.meta.resolve(name))}`);
 return import(dataUrl(code));
}
const aliases=registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return {url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
const { MediaRecordLinks }=await component('app/admin/medios/MediaRecordLinks.tsx');
const { ModerationInbox }=await component('app/admin/ModerationInbox.tsx');
aliases.deregister();
const links=markup=>[...markup.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([,href,label])=>({href:href.replaceAll('&amp;','&'),label}));
const ownerId='owner/1';
const profile={id:'exact/id',slug:'same-display-name',handle:'same-display-name',status:'pending',trashedAt:null};
const returnTo='/admin/medios?estado=pending&tipo=exclusive';
const permissions={canAccounts:true,canProfiles:true,canRecycle:true};

test('media always opens the exact pending listing and its owner rather than a name search',()=>{
 const result=links(renderToStaticMarkup(createElement(MediaRecordLinks,{ownerId,profile,returnTo,...permissions})));
 assert.deepEqual(result.map(item=>item.label),['Ver cuenta','Revisar anuncio','Previsualizar anuncio']);
 assert.equal(result[0].href,'/admin/cuentas/owner%2F1?return_to='+encodeURIComponent(returnTo));
 assert.equal(result[1].href,'/admin/anuncios-publicaciones/exact%2Fid/editar?return_to='+encodeURIComponent(returnTo));
 assert.match(result[2].href,/^\/perfil\/@same-display-name\?return_to=/);assert.doesNotMatch(result[1].href,/\?q=/);
});
test('unlinked exclusive libraries go to all account listings, and trash never generates a broken public preview',()=>{
 const result=links(renderToStaticMarkup(createElement(MediaRecordLinks,{ownerId,returnTo,...permissions})));
 assert.deepEqual(result.map(item=>item.label),['Ver cuenta','Ver anuncios de la cuenta']);assert.match(result[1].href,/#anuncios$/);
 const trash=links(renderToStaticMarkup(createElement(MediaRecordLinks,{ownerId,profile:{...profile,trashedAt:'2026-10-15'},returnTo,...permissions})));
 assert.deepEqual(trash.map(item=>item.label),['Ver cuenta','Abrir anuncio en papelera']);assert.doesNotMatch(JSON.stringify(trash),/\/perfil\//);
 const restricted=links(renderToStaticMarkup(createElement(MediaRecordLinks,{ownerId,profile,returnTo,canAccounts:false,canProfiles:false,canRecycle:false})));
 assert.deepEqual(restricted.map(item=>item.label),['Previsualizar anuncio']);
});
test('moderation queue places account first and does not render account links for roles without account permissions',async()=>{
 const initial={pendingProfiles:1,pendingMedia:0,pendingExclusive:0,unread:1,items:[{id:profile.id,ownerId,name:'Pending listing',city:'Concepción',status:'pending',files:0,newest:'2026-10-15',unread:1}]};
 const result=links(renderToStaticMarkup(createElement(ModerationInbox,{initial,canAccounts:true,canProfiles:true,canMedia:true,canAudit:false})));
 assert.ok(result.findIndex(item=>item.label==='Ver cuenta')<result.findIndex(item=>item.label==='Revisar anuncio'));
 for(const role of ['moderator','editor','support']) {
  assert.equal(adminHasCapability({accessLevel:role},'accounts.manage'),false);
  const html=renderToStaticMarkup(createElement(ModerationInbox,{initial,canAccounts:false,canProfiles:true,canMedia:true,canAudit:false}));assert.doesNotMatch(html,/Ver cuenta|\/admin\/cuentas\//);
 }
 const data=await source('lib/moderation-inbox.ts');assert.match(data,/CASE WHEN \$\{canAccounts \? 1 : 0\}=1 THEN p.owner_id ELSE NULL END ownerId/);
 const account=await source('app/admin/cuentas/[userId]/page.tsx');assert.match(account,/id="anuncios"/);assert.match(account,/<MediaRecordLinks/);
 const editor=await source('app/admin/anuncios-publicaciones/[profileId]/editar/page.tsx');assert.match(editor,/safeAdminReturnTo\(query.return_to\)/);
});
