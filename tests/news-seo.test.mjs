import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { newsCanonicalUrl, newsIsoDate, newsStructuredData } from "../lib/news-seo.ts";
import { cityDirectory } from "../app/locations.ts";

const source = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("news uses one safe canonical URL across metadata, article and breadcrumbs", () => {
  const post = { title: "Guía", slug: "guia", canonicalUrl: "https://chile3x.cl/noticias/guia-original", metaDescription: null, excerpt: "Resumen", publishedAt: "2026-08-08 16:00:00", createdAt: "2026-08-08 16:00:00", updatedAt: "2026-10-07T15:00:00Z" };
  const [article, breadcrumbs] = newsStructuredData(post, "cover_1");
  assert.equal(article.mainEntityOfPage, post.canonicalUrl);
  assert.equal(breadcrumbs.itemListElement[2].item, post.canonicalUrl);
  assert.deepEqual(article.author, { "@type": "Organization", name: "Chile3X", url: "https://chile3x.cl/quienes-somos" });
  assert.equal(article.datePublished, "2026-08-08T16:00:00.000Z");
  assert.equal(article.dateModified, "2026-10-07T15:00:00.000Z");
  assert.equal(article.image, "https://chile3x.cl/noticias/media/cover_1");
  for (const invalid of ["https://evil.test/noticias/guia", "javascript:alert(1)", "http://chile3x.cl/noticias/guia", "https://chile3x.cl/admin", "not-a-url"]) assert.equal(newsCanonicalUrl("guia", invalid), "https://chile3x.cl/noticias/guia");
});

test("news dates are timezone explicit and omit missing or invalid values", () => {
  assert.equal(newsIsoDate("2026-10-07 15:00:00"), "2026-10-07T15:00:00.000Z");
  assert.equal(newsIsoDate("2026-10-07T12:00:00-03:00"), "2026-10-07T15:00:00.000Z");
  assert.equal(newsIsoDate(null), null);
  assert.equal(newsIsoDate("invalid"), null);
});

test("article continuation uses its own layout, not the site's global footer grid", async () => {
  const [page, css] = await Promise.all([source("app/noticias/[slug]/page.tsx"), source("app/globals.css")]);
  assert.doesNotMatch(page, /<footer[\s>]/);
  assert.match(page, /<section className="news-article-next" aria-labelledby="news-article-next-title">/);
  assert.match(page, /<h2 id="news-article-next-title">Continúa en Chile3X<\/h2>/);
  assert.match(page, /<nav className="news-article-next-links" aria-label="Continúa en Chile3X">/);
  const links = page.slice(page.indexOf('<nav className="news-article-next-links"'), page.indexOf('</nav>', page.indexOf('<nav className="news-article-next-links"')));
  assert.equal((links.match(/<Link /g) ?? []).length, 5);
  assert.match(css, /\.news-article-next-links \{ display: flex; flex-wrap: wrap;/);
  assert.match(css, /\.news-article-next-links \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.news-article-next-links \.button-primary \{ grid-column: 1 \/ -1;/);
});

test("news sitemap omits drafts and noindex without retrieving HTML or cover joins", async () => {
  const news = await source("lib/news.ts");
  const query = news.slice(news.indexOf("export async function getPublicNewsSitemapRows"));
  assert.match(query, /eq\(newsPosts.status, "published"\)/);
  assert.match(query, /eq\(newsPosts.noindex, false\)/);
  assert.doesNotMatch(query, /contentHtml|leftJoin|newsMedia/);
  assert.match(news, /getNewsBySlug = cache\(async/);
});

test("mobile login appears only in the quick row, not duplicated in the hamburger", async () => {
  const [menu, header, css] = await Promise.all([source("app/directorio/PublicMobileMenu.tsx"), source("app/directorio/_components.tsx"), source("app/globals.css")]);
  assert.doesNotMatch(menu, /mobile-menu-account-entry|Iniciar sesión|href="\/ingresar"|public-login-link/);
  assert.match(menu, /href="\/agencias" onClick=\{closeMenu\}/);
  assert.match(menu, /href="\/arriendos" onClick=\{closeMenu\}/);
  assert.match(menu, /action="\/api\/auth\/session\/logout" method="post"/);
  assert.match(menu, /action="\/api\/auth\/logout" method="post"/);
  const start = header.indexOf('<nav className="mobile-public-quick-links"');
  const mobile = header.slice(start, header.indexOf('</nav>', start));
  assert.match(mobile, /<NavLink href=\{sessionAccountHref\}>\{sessionAccountLabel\}<\/NavLink>/);
  assert.doesNotMatch(mobile, /hasAnySession &&/);
  assert.doesNotMatch(mobile, /className=\{!hasAnySession \? "public-login-link"/);
  assert.doesNotMatch(css, /mobile-public-quick-links.is-signed-out|mobile-menu-account-entry \.public-login-link/);
  assert.match(css, /mobile-public-quick-links \{ grid-template-columns: 1.3fr .8fr 1fr/);
  assert.match(header, /className=\{!hasAnySession \? "public-login-link" : undefined\}/);
  assert.match(css, /\.public-navigation \.public-login-link \{ border: 1px solid #8d343b/);
});

test("coverage illustration is confined to the card with fixed dimensions and PNG fallback", async () => {
  const home = await source("app/page.tsx");
  assert.match(home, /<aside className="hero-card"[\s\S]*?<picture className="coverage-panorama">/);
  assert.match(home, /image\/webp/);
  assert.match(home, /chile-coverage-panorama-20261007.png" alt="" width=\{768\} height=\{256\}/);
  for (const extension of ["png", "webp"]) assert.ok((await readFile(new URL(`../public/assets/chile-coverage-panorama-20261007.${extension}`, import.meta.url))).length < 50_000);
});

test("home backdrop is decorative, lightweight and has a distinct mobile crop", async () => {
  const home = await source("app/page.tsx");
  assert.match(home, /<picture className="hero-backdrop">/);
  assert.match(home, /media="\(max-width: 620px\)" srcSet="\/assets\/hero-night-silhouette-mobile-20261007.webp" width=\{512\} height=\{768\}/);
  assert.match(home, /hero-night-silhouette-desktop-20261007.webp" alt="" aria-hidden="true" width=\{1600\} height=\{640\} fetchPriority="low" decoding="async"/);
  assert.equal((home.match(/<h1[\s>]/g) ?? []).length, 1);
  for (const variant of ["desktop", "mobile"]) assert.ok((await readFile(new URL(`../public/assets/hero-night-silhouette-${variant}-20261007.webp`, import.meta.url))).length < 50_000);
});

test("published guide contains both flows and honest restrictions, with crawlable internal links", async () => {
  const html = await source("docs/content/como-funciona-chile3x.html");
  assert.equal((html.match(/<blockquote><ol>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<h1|hiragasaito|usr_|prf_|<script/i);
  assert.match(html, /Si un administrador te ayuda/);
  assert.match(html, /Las excepciones requieren autorización/);
  assert.match(html, /durante la etapa actual de lanzamiento/);
  assert.match(html, /no necesitas activar GPS/i);
  assert.ok((html.match(/href="https:\/\/chile3x.cl\//g) ?? []).length >= 12);
  const configuredCities = new Set(cityDirectory.map(city => city.citySlug));
  for (const match of html.matchAll(/href="https:\/\/chile3x.cl\/escorts\/([^"]+)"/g)) assert.ok(configuredCities.has(match[1]), `City link must exist: ${match[1]}`);
});
