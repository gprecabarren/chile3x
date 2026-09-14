import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("anonymous visitors do not receive the editorial-news note in Novedades", async () => {
  const page = await source("app/novedades/page.tsx");
  assert.match(page, /const hasSession = Boolean\(currentUser \|\| currentAdmin\)/);
  assert.match(page, /\{hasSession && <> Las noticias editoriales siguen disponibles/);
});

test("Quiénes somos presents the emerging launch with useful SEO and honest roadmap", async () => {
  const [page, styles, sitemap] = await Promise.all([
    source("app/quienes-somos/page.tsx"),
    source("app/globals.css"),
    source("app/sitemap.ts"),
  ]);
  assert.match(page, /title: "Chile3X: nuevo directorio para adultos en Chile"/);
  assert.match(page, /publicaciones gratis durante el lanzamiento/);
  assert.match(page, /"@type": "AboutPage"/);
  assert.match(page, /"@type": "Organization"/);
  assert.match(page, /"@type": "BreadcrumbList"/);
  assert.match(page, /Qué distingue a Chile3X de otros directorios para adultos/);
  assert.match(page, /Publicar en Chile3X es gratis durante esta etapa/);
  assert.match(page, /PRÓXIMOS PASOS/);
  assert.match(page, /no representan una fecha de lanzamiento garantizada/);
  assert.match(styles, /\.about-differences-grid/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*?\.about-free/);
  assert.match(sitemap, /quienes-somos.*priority: 0\.8/);
});
