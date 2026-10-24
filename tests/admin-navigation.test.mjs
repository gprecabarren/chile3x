import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('admin navigation keeps permissions on the server and does not replace normal account menus',()=>{
 const shell=source('app/admin/_components.tsx');assert.match(shell,/AdminWorkspace/);assert.doesNotMatch(shell,/<header className="admin-header"/);
 for(const permission of ['profiles.moderate','media.moderate','reviews.moderate','reports.manage','bugs.manage','accounts.manage','news.manage','settings.manage','telegram.view','audit.view','forum.manage','admins.manage'])assert.ok(shell.includes(`adminHasCapability(user, "${permission}")`));
 assert.doesNotMatch(source('app/mi-cuenta/_components.tsx'),/AdminWorkspace/);
 assert.match(shell,/className="admin-home-link" href="\/admin"/);
 assert.match(shell,/href="\/admin\/correos">Historial correos<\/AdminSidebarLink>/);
 assert.match(shell,/aria-label="Ir al resumen de administración">ADMINISTRADOR<\/Link>/);
 assert.match(shell,/href="\/" className="sidebar-return-site"/);
 assert.match(shell,/<span aria-hidden="true">←<\/span><span>Volver al sitio web<\/span>/);
 assert.doesNotMatch(shell,/OfficialChile3xLogo/);
 for(const counter of ['pendingCount','pendingMedia','pendingReports','pendingBugs','pendingTelegram'])assert.ok(shell.includes(`initial={${counter}}`));
 assert.match(source('app/admin/AdminPendingCount.tsx'),/chile3x:moderation-counts/);
});
test('mobile drawer has keyboard focus containment, Escape/overlay closure and background isolation',()=>{
 const text=source('app/admin/AdminWorkspace.tsx');assert.match(text,/aria-modal/);assert.match(text,/inert=\{mobileOpen/);assert.match(text,/event.key==='Escape'/);assert.match(text,/event.key!=='Tab'/);assert.match(text,/previousOverflow/);assert.match(text,/returnFocusTarget\?\.focus/);assert.match(text,/closest\('a\[href\]'\)/);
 const css=source('app/admin/admin-workspace.css');assert.match(css,/min-height:44px/);assert.match(css,/height:100dvh/);assert.match(css,/overflow-y:auto/);assert.match(css,/max-width:1099px/);assert.match(css,/min\(300px,calc\(100vw - 40px\)\)/);
});
test('current navigation uses explicit clicks instead of speculative prefetch',()=>{
 const text=source('app/admin/AdminSidebarLink.tsx');assert.match(text,/prefetch=\{false\}/);assert.match(text,/aria-current=\{active\?'page'/);assert.match(text,/href==='\/admin'\?pathname===href/);assert.match(text,/aria-hidden="true"/);
});
