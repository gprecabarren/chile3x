import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('videocall uses an accessible icon-only contact button without pill layout overrides', async () => {
  const [page, css, tracking] = await Promise.all([
    readFile(new URL('../app/perfil/[slug]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../app/perfil/TrackedContactLink.tsx', import.meta.url), 'utf8'),
  ]);
  const button = page.match(/<TrackedContactLink[^>]*kind="videocall"[^>]*>[\s\S]*?<\/TrackedContactLink>/)?.[0];
  assert.ok(button);
  assert.match(button, /aria-label="Consultar por videollamada"/);
  assert.match(button, /title="Videollamada"/);
  assert.match(button, /<PortalContactIcon kind="videocall" \/>/);
  assert.match(button, /<span className="sr-only">Videollamada<\/span>/);
  assert.match(button, /href=\{videoCallHref\}/);
  const rules = [...css.matchAll(/\.contact-videocall(?:\s+span)?\s*\{([^}]+)\}/g)].map(match => match[1]).join('\n');
  assert.doesNotMatch(rules, /width:\s*auto|padding-inline|text-transform/);
  assert.match(css, /\.profile-contact-actions \.button \{[^}]*width: 43px;[^}]*padding: 0;[^}]*place-items: center;[^}]*border-radius: 50%/);
  assert.match(tracking, /contact_method: kind/);
});
