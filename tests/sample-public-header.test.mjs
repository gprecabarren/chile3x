import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as React from 'react';
import ts from 'typescript';

test('sample header renders the anonymous public structure without session reads, presence or tracked contacts', async () => {
  const source=await readFile(new URL('../app/directorio/_components.tsx',import.meta.url),'utf8');
  // Execute the actual server components with private dependencies that throw:
  // an accidental identity/counter read must fail, even if its UI is hidden.
  const header=source.slice(source.indexOf('type PublicHeaderProps'),source.indexOf('\nexport function DirectoryShell'));
  const contacts=source.slice(source.indexOf('export async function PortalContactLinks'),source.indexOf('\nexport { PortalContactIcon }'));
  const forbidden=()=>{throw new Error('Private session dependency was read by a sample header.');};
  globalThis.__sampleHeaderFixture={React,cookies:forbidden,getSiteSettings:async()=>({sponsors_enabled:'disabled'}),getUserSessionCookieName:forbidden,getSessionCookieName:forbidden,getCurrentUser:forbidden,getCurrentAdmin:forbidden,countUnreadMessages:forbidden,countPendingReceivedReviews:forbidden,ADMIN_ACCESS_LABELS:{},Link:'test-link',Image:'test-image',NavLink:'test-nav-link',ActionButton:'test-action-button',PublicMobileMenu:'test-mobile-menu',PresenceHeartbeat:'test-presence',MessageNotifications:'test-notifications',UnreadMessagesNotice:'test-unread',PendingReviewsNotice:'test-pending',getPortalContacts:()=>[{key:'whatsapp',href:'https://example.invalid/contact',label:'Contacto de prueba',external:true}],PortalWhatsappLink:'test-tracked-contact',PortalContactIcon:'test-contact-icon'};
  try {
    const keys=Object.keys(globalThis.__sampleHeaderFixture).join(',');
    const {outputText}=ts.transpileModule(`const {${keys}}=globalThis.__sampleHeaderFixture;\n${header}\n${contacts}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}});
    const component=await import('data:text/javascript,'+encodeURIComponent(outputText));
    const tree=await component.PublicHeader({preview:true});
    const elements=[];
    function walk(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(walk);return;}if(node.props){elements.push(node);walk(node.props.children);}}
    walk(tree);
    assert.equal(elements.filter(node=>node.props.className==='age-strip').length,1);
    assert.equal(elements.filter(node=>node.type==='header'&&node.props.className==='site-header public-header').length,1);
    assert.equal(elements.filter(node=>node.type==='nav'&&node.props['aria-label']==='Navegación principal').length,1);
    assert.equal(elements.some(node=>['test-presence','test-notifications','form'].includes(node.type)),false);
    const menu=elements.find(node=>node.type==='test-mobile-menu');
    assert.equal(menu.props.hasUserSession,false);assert.equal(menu.props.hasAdminSession,false);assert.equal(menu.props.session,null);
    const links=await component.PortalContactLinks({placement:'header',preview:true});
    const anchor=links.props.children[0];
    assert.equal(anchor.type,'a');assert.equal(anchor.props['aria-disabled'],'true');
    assert.equal(anchor.props.href,undefined);assert.equal(anchor.props.onClick,undefined);
  } finally {delete globalThis.__sampleHeaderFixture;}
});
