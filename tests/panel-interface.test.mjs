import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layoutSource, dashboardSource, cssSource, panelCssSource, adminLayoutSource, accountLayoutSource, adminShellSource, mobileNavigationSource, accountShellSource, accountMobileNavigationSource, publicHeaderSource] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../public/assets/panels-20260923.css", import.meta.url), "utf8"),
  readFile(new URL("../app/admin/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/mi-cuenta/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/admin/_components.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/admin/AdminMobileNavigation.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/mi-cuenta/_components.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/mi-cuenta/AccountMobileNavigation.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/directorio/_components.tsx", import.meta.url), "utf8"),
]);

test("admin summary cards link to their existing filtered views", () => {
  assert.match(dashboardSource, /href: "\/admin\/perfiles"/);
  assert.match(dashboardSource, /href: "\/admin\/perfiles\?estado=pending"/);
  assert.match(dashboardSource, /href: "\/admin\/medios\?estado=pending"/);
  assert.match(dashboardSource, /href: "\/admin\/perfiles\?estado=paused"/);
  assert.match(dashboardSource, /className="admin-stat-link"/);
});

test("account and admin panels use Manrope with readable action text", () => {
  assert.doesNotMatch(layoutSource, /next\/font\/google/);
  assert.match(cssSource, /src: url\("\/fonts\/manrope-latin-variable\.woff2"\)/);
  assert.match(cssSource, /--font-panel: var\(--font-site\)/);
  assert.match(panelCssSource, /\.admin-root,\s*\.account-root \{\s*font-family: var\(--font-panel\)/s);
  assert.match(panelCssSource, /\.admin-root \.button,[\s\S]*?font-size: 14px !important/);
  assert.match(panelCssSource, /\.admin-content > \.admin-stat-grid \+ \.admin-review-alert \{\s*margin-top: 24px/);
  assert.match(adminLayoutSource, /PANEL_STYLESHEET = "\/assets\/panels-20260923\.css\?v=20260929"/);
  assert.match(accountLayoutSource, /PANEL_STYLESHEET = "\/assets\/panels-20260923\.css\?v=20260929"/);
  assert.doesNotMatch(cssSource, /\.admin-root,\s*\.account-root \{\s*font-family: var\(--font-panel\)/s);
});

test("private panel stylesheet closes with mobile cascade guards", () => {
  assert.match(panelCssSource, /@media \(max-width: 720px\) \{[\s\S]*?\.admin-content \{[\s\S]*?width: min\(100% - 40px, 1128px\);[\s\S]*?\.admin-heading \{ display: block; \}/);
  assert.match(panelCssSource, /@media \(max-width: 480px\) \{[\s\S]*?\.account-content \{ width: min\(100% - 40px, 1128px\); \}[\s\S]*?\.owner-profile-card \{ display: block; \}/);
  assert.match(panelCssSource, /\.telegram-case-filters \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("the mobile administration menu closes after selecting a section", () => {
  assert.match(adminShellSource, /<AdminMobileNavigation>/);
  assert.match(mobileNavigationSource, /target\.closest\("a\[href\]"\)/);
  assert.match(mobileNavigationSource, /removeAttribute\("open"\)/);
});

test("the mobile account menu closes after selecting a section", () => {
  assert.match(accountShellSource, /<AccountMobileNavigation>/);
  assert.match(accountMobileNavigationSource, /target\.closest\("a\[href\]"\)/);
  assert.match(accountMobileNavigationSource, /removeAttribute\("open"\)/);
  assert.match(panelCssSource, /\.account-header > \.account-desktop-navigation \{ display: none; \}/);
});

test("profile navigation cannot be interrupted halfway through a smooth return to the top", () => {
  assert.match(cssSource, /html \{ scroll-behavior: auto; background: var\(--ink\); \}/);
  assert.doesNotMatch(cssSource, /html \{ scroll-behavior: smooth;/);
});

test("desktop contact icons sit below sign-in without enlarging the full header", () => {
  assert.match(publicHeaderSource, /<div className="public-navigation-stack">[\s\S]*?<nav className="public-navigation"[\s\S]*?<PortalContactLinks placement="header" \/>[\s\S]*?<\/div>/);
  assert.match(cssSource, /@media \(min-width: 861px\) \{[\s\S]*?\.public-navigation-stack \{[\s\S]*?display: grid;[\s\S]*?justify-items: end;[\s\S]*?\.public-navigation-stack \.portal-contact-links-header \{[\s\S]*?width: auto;[\s\S]*?flex: 0 0 auto;/);
  assert.match(cssSource, /\.public-header \.public-navigation-stack \.public-navigation \{[\s\S]*?justify-content: flex-start;/);
  assert.doesNotMatch(cssSource, /\.site-header\.public-header \.portal-contact-links-header \{[\s\S]*?flex: 0 0 100%;/);
  assert.match(cssSource, /@media \(max-width: 860px\) \{[\s\S]*?\.public-header \.public-navigation-stack \{ display: contents; \}/);
  assert.match(cssSource, /@media \(max-width: 860px\) \{[\s\S]*?\.public-header \.portal-contact-links-header \{ order: 2;/);
});
