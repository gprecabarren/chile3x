import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [component, css] = await Promise.all([
  readFile(new URL("../app/directorio/DirectoryFilters.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);

test("mobile directory search collapses its existing fields but retains nested advanced filters", () => {
  assert.match(component, /<h2>Encuentra con más precisión<\/h2>/);
  assert.match(component, /Elige una región o ciudad y afina características y servicios/);
  assert.match(component, /aria-expanded=\{showMobileFilters\} aria-controls="directory-filter-controls"/);
  assert.match(component, /<div id="directory-filter-controls" className=\{`filter-mobile-body/);
  assert.match(component, /<details className="filter-more-options" open=\{hasAdvancedFilters\}>/);
  assert.match(component, /placeholder="Ej\.: Valentina, Camila, Alejandra"/);
  assert.ok(component.indexOf("Encuentra con más precisión") < component.indexOf('className="filter-mobile-toggle"'));
  assert.ok(component.indexOf('className="filter-mobile-toggle"') < component.indexOf('className="directory-quick-filters"'));
  assert.ok(component.indexOf('className="directory-quick-filters"') < component.indexOf('name="nombre"'));
  assert.match(component, /!pinnedCity && \(filters\.region \|\| filters\.city\)/);
  assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*?\.filter-mobile-body:not\(\.is-open\) \{ display: none; \}/);
  assert.match(css, /\.filter-mobile-toggle \{ display: none; \}/);
});

test("manual city bar stays visible on mobile and the quick filters share one form", async () => {
  const cityBar = await readFile(new URL("../app/directorio/DirectoryCityBar.tsx", import.meta.url), "utf8");
  assert.match(cityBar, /cityDirectory/);
  assert.match(cityBar, /savePreferredCity\(city\.citySlug\)/);
  assert.match(css, /\.directory-city-bar \{[^}]*display: block/);
  assert.match(css, /\.directory-city-bar \{ position: sticky; top: 0; \}/);
  assert.equal((component.match(/<form\b/g) ?? []).length, 1);
  assert.equal((component.match(/name="nombre"/g) ?? []).length, 1);
  assert.match(component, /destination = action === "\/escorts" && value === "agency" \? "\/agencias"/);
  assert.match(component, /<option value="rental">▣ Arriendos<\/option>/);
});
