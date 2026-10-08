import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the age gate adds a subtle beta notice without replacing its age or legal information", async () => {
  const [gate, styles] = await Promise.all([
    source("app/AgeGate.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(gate, /Confirma tu edad/);
  assert.match(gate, /Este sitio contiene un directorio destinado exclusivamente a personas mayores de 18 años\. Al continuar declaras tener la edad legal para acceder a este contenido en Chile\./);
  assert.match(gate, /className="age-gate-beta-note">Sitio operativo en fase beta\. Seguimos construyendo y mejorando\.<\/small>[\s\S]*className="age-gate-actions"/);
  assert.match(gate, /Soy mayor de 18 años/);
  assert.match(gate, /Salir del sitio/);
  for (const link of ["/terminos", "/privacidad", "/reglas-de-publicacion"]) {
    assert.ok(gate.includes(`href="${link}"`));
  }
  assert.match(styles, /\.age-gate-card\s*\{\s*max-height: calc\(100dvh - 44px\);\s*overflow-y: auto;/);
});

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
