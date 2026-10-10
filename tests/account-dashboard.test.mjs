import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { profileStatisticsCutoff } from '../lib/profile-statistics-period.ts';
const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('account navigation groups private social pages and keeps creation in listings', async () => {
  const [shell, tabs, home, active] = await Promise.all(['app/mi-cuenta/_components.tsx', 'app/mi-cuenta/AccountSocialTabs.tsx', 'app/mi-cuenta/page.tsx', 'app/mi-cuenta/AccountNavigationLink.tsx'].map(source));
  assert.doesNotMatch(shell, /Crear anuncio|Telegram y Miembros/);
  assert.match(shell, /Favoritos y comentarios<UnreadMessagesBadge reviews/);
  assert.match(shell, /user.email/);
  for (const route of ['/mi-cuenta/favoritos', '/mi-cuenta/comentarios']) assert.ok(tabs.includes(route));
  assert.match(tabs, /aria-current/); assert.match(active, /grouped/);
  assert.match(home, /id="mis-anuncios"/); assert.match(home, /Crear anuncio/);
});

test('account creation is available in the heading and listings, with left-aligned social tabs', async () => {
  const [home, css] = await Promise.all(['app/mi-cuenta/page.tsx', 'public/assets/panels-20260923.css'].map(source));
  assert.match(home, /<AccountHeading[^>]*title="Mi cuenta"[^>]*>\s*<Link[^>]*href="\/mi-cuenta\/nuevo-perfil">Crear anuncio<\/Link>\s*<\/AccountHeading>/);
  assert.equal((home.match(/href="\/mi-cuenta\/nuevo-perfil">Crear anuncio/g) ?? []).length, 2);
  assert.match(css, /\.account-social-tabs \{[^}]*width: min\(100%, 540px\)[^}]*margin: 0 auto 27px 0;/);
});

test('email verification stays above every account page independently of activity notices', async () => {
  const [shell, home, notice] = await Promise.all(['app/mi-cuenta/_components.tsx', 'app/mi-cuenta/page.tsx', 'app/EmailVerificationNotice.tsx'].map(source));
  assert.match(shell, /emailVerificationState\(user\) === "grace" && <EmailVerificationNotice deadline=\{emailVerificationDeadline\(user\)\}/);
  assert.ok(shell.indexOf('<EmailVerificationNotice') < shell.indexOf('{children}'));
  assert.doesNotMatch(shell, /showActivityNotices && <EmailVerificationNotice/);
  assert.match(notice, /Tiempo restante:/); assert.match(notice, /href="\/verificar-correo"/);
  assert.match(home, /rows.length > 0 && <section[^>]*aria-labelledby="account-performance-title"/);
  assert.match(home, /<AccountNotificationCards/);
});

test('account identity links back to the dashboard and truncates long email addresses', async () => {
  const [shell, css] = await Promise.all(['app/mi-cuenta/_components.tsx', 'public/assets/panels-20260923.css'].map(source));
  assert.match(shell, /<Link className="account-home-link" href="\/mi-cuenta" title=\{user.email\} aria-label=/);
  assert.match(css, /\.account-header \.account-home-link \{[^}]*min-width: 0;[^}]*max-width: 290px;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
  assert.match(css, /\.account-home-link:focus-visible/);
});

test('dashboard data is owner-scoped, excludes trash and preserves daily rather than raw clicks', async () => {
  const summary = await source('lib/account-dashboard.ts');
  assert.match(summary, /getCurrentUser\(\)/); assert.match(summary, /Authentication required/);
  assert.match(summary, /eq\(profiles.ownerId, user.id\), isNull\(profiles.trashedAt\)/);
  assert.match(summary, /profileStatisticsCutoff\(29\)/);
  assert.doesNotMatch(summary, /\.clickCount|viewerKey|viewerUserId|select\(\)/);
  assert.match(summary, /eq\(profileMedia.visibility, "public"\)/);
  assert.match(summary, /Promise.all/);
  const provider = await source('app/MessageNotifications.tsx');
  assert.match(provider, /AccountNotificationCards/);
  assert.equal((provider.match(/setInterval\(/g) ?? []).length, 1);
});

test('dashboard and individual statistics use inclusive Chilean dates at midnight and year boundaries', () => {
  const nearMidnight = new Date('2026-10-10T01:00:00Z');
  assert.equal(profileStatisticsCutoff(0, nearMidnight), '2026-10-09');
  assert.equal(profileStatisticsCutoff(6, nearMidnight), '2026-10-03');
  assert.equal(profileStatisticsCutoff(29, nearMidnight), '2026-09-10');
  assert.equal(profileStatisticsCutoff(29, new Date('2026-01-01T01:00:00Z')), '2025-12-02');
});

test('inline username update cannot edit roles, emails or other accounts', async () => {
  const route = await source('app/api/mi-cuenta/datos/route.ts');
  const action = route.slice(route.indexOf('if (action === "change_username")'), route.indexOf('if (action === "change_password")'));
  assert.match(route, /assertSameOrigin/); assert.match(route, /getCurrentUser/);
  assert.match(action, /validateAccountUsername/); assert.match(action, /assertAccountUsernameAvailable\(username, user.id\)/);
  assert.match(action, /set\(\{ username \}\).where\(eq\(users.id, user.id\)\)/);
  assert.doesNotMatch(action, /role:|email:|passwordHash:|profiles/);
  assert.match(await source('lib/account-username.ts'), /username.length < 3/);
});

test('social lists stay private, paginated and hydrate only the selected favorites', async () => {
  const [favorites, comments, layout] = await Promise.all(['app/mi-cuenta/favoritos/page.tsx', 'app/mi-cuenta/comentarios/page.tsx', 'app/mi-cuenta/layout.tsx'].map(source));
  assert.match(favorites, /limit\(25\).offset/); assert.match(favorites, /getPublicProfiles\(\{ profileIds:/);
  assert.match(favorites, /viewerId: user.id/); assert.match(favorites, /notExists/);
  assert.match(comments, /limit\(51\).offset/);
  assert.match(favorites, /AccountSocialTabs active="favorites"/); assert.match(comments, /AccountSocialTabs active="comments"/);
  assert.match(layout, /privatePageMetadata/);
});
