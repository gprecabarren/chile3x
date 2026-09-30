import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [component, css] = await Promise.all([
  readFile(new URL("../app/directorio/DirectoryFilters.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);

test("mobile directory search collapses its existing fields but retains nested advanced filters", () => {
  assert.match(component, /<h2>Encuentra con más precisión<\/h2>/);
  assert.match(component, /Elige una ciudad, categoría o nombre/);
  assert.match(component, /aria-expanded=\{showMobileFilters\} aria-controls="directory-filter-controls"/);
  assert.match(component, /<div id="directory-filter-controls" className=\{`filter-mobile-body/);
  assert.match(component, /<details className="filter-more-options" open=\{hasAdvancedFilters\}>/);
  assert.match(component, /placeholder="Ej\.: Valentina, Camila, Alejandra"/);
  assert.ok(component.indexOf("Elige una ciudad, categoría o nombre") < component.indexOf('className="filter-mobile-toggle"'));
  assert.ok(component.indexOf('className="filter-mobile-toggle"') < component.indexOf('name="nombre"'));
  assert.match(component, /!pinnedCity && \(filters\.region \|\| filters\.city\)/);
  assert.match(css, /@media \(max-width: 620px\) \{[\s\S]*?\.filter-mobile-body:not\(\.is-open\) \{ display: none; \}/);
  assert.match(css, /\.filter-mobile-toggle \{ display: none; \}/);
});
