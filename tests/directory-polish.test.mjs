import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [directory, cityPage, profile, registration, googleButton, css] = await Promise.all([
  "../app/directorio/_components.tsx",
  "../app/escorts/[citySlug]/page.tsx",
  "../app/perfil/[slug]/page.tsx",
  "../app/registro/page.tsx",
  "../app/GoogleSignInButton.tsx",
  "../app/globals.css",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

test("city tiers and other listing types have a concise semantic divider", () => {
  assert.match(directory, /selectedCategory \? sections\.filter\(\(section\) => section\.id === selectedCategory\) : sections\.slice\(0, 3\)/);
  assert.match(directory, /!selectedCategory && <><div className="city-section-divider"><h3>También en \{city\}<\/h3>/);
  assert.match(directory, /city-section-divider[\s\S]*?sections\.slice\(3\)\.filter[\s\S]*?\.map/);
  assert.match(css, /\.city-section-divider span \{[^}]*height: 1px/);
  assert.match(cityPage, /profiles\.length === 1 \? "publicación" : "publicaciones"/);
  assert.match(directory, /count === 1 \? "publicación visible" : "publicaciones visibles"/);
});

test("listing hover is desktop-only, lightweight and respects reduced motion", () => {
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.public-profile-card:hover[^}]*transform: translateY\(-3px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.public-profile-card:hover[^}]*transform: none/);
});

test("local guide counts the current visible results and omits its count at zero", () => {
  assert.match(cityPage, /<SeoContent city=\{city\.city\} region=\{city\.region\} count=\{profiles\.length\} \/>/);
  assert.match(directory, /count > 0 \? `Esta página muestra \$\{count\} \$\{count === 1 \? "publicación visible" : "publicaciones visibles"\}\. ` : null/);
  assert.doesNotMatch(directory, /Esta página muestra 12|Todavía no hay publicaciones visibles para esta búsqueda/);
});

test("coverage card stays compact and the previously rejected hero asset stays removed", () => {
  assert.match(css, /\.hero-card \{[^}]*max-width: 380px;[^}]*padding: 24px/);
  assert.match(css, /\.coverage-stats \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 860px\) \{[\s\S]*?\.hero-card \{[^}]*padding: 20px/);
  assert.doesNotMatch(css, /home-hero-background/);
  assert.match(css, /\.hero::before \{[^}]*pointer-events: none;/);
});

test("profile-side reads run concurrently after loading the listing", () => {
  assert.match(profile, /const \[relatedProfiles, stories, approvedReviewsPage,[\s\S]*?engagement\] = await Promise\.all\(\[/);
  assert.match(profile, /relatedProfileIds\.length \? getPublicProfiles/);
  assert.match(profile, /getProfileEngagement\(profile\.id, viewer\?\.id\) : Promise\.resolve\(null\)/);
});

test("moderation layout and registration layout keep mobile fallbacks", () => {
  assert.match(css, /\.admin-profile-review-form \{ grid-column: 2; grid-row: 2;/);
  assert.match(css, /@media \(max-width: 980px\) \{[\s\S]*?\.admin-profile-review-form \{ grid-column: 1; grid-row: auto;/);
  assert.match(registration, /className="auth-card auth-register-card"/);
  assert.match(css, /@media \(min-width: 900px\) \{[\s\S]*?\.auth-register-card \{ width: min\(100%, 720px\);/);
  assert.match(css, /\.auth-register-card \.auth-provider-list \{ max-width: 400px;/);
  assert.match(css, /\.auth-register-card \.account-location-grid,[\s\S]*?display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("Google button redraws only when width changes and uses a detached host", () => {
  assert.match(googleButton, /if \(width === renderedWidth\) return;/);
  assert.match(googleButton, /const host = document\.createElement\("div"\);[\s\S]*?containerRef\.current\.replaceChildren\(host\);[\s\S]*?renderButton\(host,/);
});
