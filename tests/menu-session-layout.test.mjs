import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('text buttons space both custom brand SVGs and shared action icons without shrinking them', async () => {
  const css = await source('app/action-controls.css');
  assert.match(css, /\.button\s*\{\s*gap:8px;/);
  assert.match(css, /\.button > svg\s*\{\s*flex-shrink:0;/);
  assert.match(css, /\.button > \.action-icon\s*\{\s*margin-inline-end:0;/);
  const stories = await source('app/mi-cuenta/AccountStories.tsx');
  assert.match(stories, /<PortalContactIcon kind="whatsapp" \/><span>Contactar a soporte<\/span>/);
});

test('the current-session badge centers its checkmark and keeps its label on one line', async () => {
  const [component, css] = await Promise.all(['app/SessionManager.tsx', 'app/action-controls.css'].map(source));
  assert.match(component, /session\.isCurrent && <strong className="session-current-badge"><ActionIcon name="check" \/>Esta sesión<\/strong>/);
  assert.match(css, /\.session-card header > \.session-current-badge\s*\{[^}]*align-items:center;[^}]*justify-content:center;[^}]*white-space:nowrap;/);
  assert.match(css, /\.session-current-badge > \.action-icon\s*\{[^}]*margin:0;/);
  assert.match(css, /\.session-manager \.session-card > header\s*\{[^}]*flex-wrap:wrap;/);
});

test('public dropdown has a labeled native close button, Escape and outside-click dismissal', async () => {
  const menu = await source('app/directorio/PublicMobileMenu.tsx');
  assert.match(menu, /className="mobile-menu-close"[^>]*aria-label="Cerrar menú principal"[^>]*onClick=\{dismissMenu\}><ActionIcon name="close" \/>/);
  assert.match(menu, /closeRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(menu, /toggleRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(menu, /event\.key === "Escape"/);
  assert.match(menu, /!panelRef\.current\?\.contains\(event\.target\) && !toggleRef\.current\?\.contains\(event\.target\)/);
  assert.match(menu, /removeEventListener\("pointerdown", onPointerDown\)/);
  assert.match(menu, /role="navigation" aria-label="Navegación principal"/);
  assert.match(menu, /aria-expanded=\{open\}/);
});

test('dropdown close control has a 44px touch target, visible focus and a sticky heading', async () => {
  const css = await source('app/action-controls.css');
  assert.match(css, /@media\(max-width:860px\)/);
  assert.match(css, /\.mobile-menu-panel > \.mobile-menu-heading\s*\{[^}]*position:sticky;/);
  assert.match(css, /\.mobile-menu-close\s*\{[^}]*width:44px; height:44px;/);
  assert.match(css, /\.mobile-menu-close:focus-visible\s*\{[^}]*outline:2px/);
});
