import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { GLASS_STYLESHEET } from "../lib/site-theme-policy.ts";

const source = path => readFile(new URL("../" + path, import.meta.url), "utf8");
async function cssFiles(path) {
  const entries = await readdir(new URL("../" + path, import.meta.url), { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? cssFiles(path + "/" + entry.name) : entry.name.endsWith(".css") ? [path + "/" + entry.name] : []))).flat();
}

test("a shared 15% corner scale covers both themes without changing layout or circular shapes", async () => {
  const tokens = await source("app/corner-tokens.css");
  assert.match(tokens, /--corner-scale:\s*1\.15/);
  assert.match(await source("app/layout.tsx"), /import "\.\/corner-tokens\.css"/);
  assert.doesNotMatch(tokens, /(?:^|[;{])\s*(?:width|height|padding|margin|overflow|transform|filter|opacity)\s*:/);
  const definitions = new Set([...tokens.matchAll(/--corner-(\d+):/g)].map(match => match[1]));
  let references = 0;
  for (const path of [...await cssFiles("app"), ...await cssFiles("public/assets")]) {
    if (path.endsWith("corner-tokens.css")) continue;
    const css = await source(path);
    for (const match of css.matchAll(/(?:--radius-[\w-]+|border(?:-[a-z]+)*-radius)\s*:\s*([^;}]+)/g)) {
      for (const radius of match[1].matchAll(/\b(\d+(?:\.\d+)?)px\b/g)) assert.ok(Number(radius[1]) >= 99, path + ": unscaled radius " + radius[0]);
      for (const token of match[1].matchAll(/var\(--corner-(\d+)\)/g)) { assert.ok(definitions.has(token[1]), path + ": undefined token"); references++; }
    }
  }
  assert.ok(references > 250);
  assert.match(await source("app/action-controls.css"), /border-radius:50%/);
});

test("Liquid Glass rounds the actual logo and uses alpha colors, not costly filters or faded text", async () => {
  const css = await source("public" + GLASS_STYLESHEET);
  assert.match(GLASS_STYLESHEET, /20261023-v4\.css$/);
  assert.match(css, /\.brand img,\.public-footer-logo img,\.official-chile3x-logo\).*border-radius:var\(--corner-12\)/);
  assert.match(css, /--glass-surface:rgba\(20,27,41,\.82\)/);
  assert.match(css, /--glass-control:rgba/);
  assert.doesNotMatch(css, /blur\(|(?:backdrop-)?filter:\s*(?!none)[a-z]/);
  assert.doesNotMatch(css, /opacity:\s*0?\./);
  const reduced = css.slice(css.indexOf("@media(prefers-reduced-transparency:reduce)"));
  for (const name of ["surface", "control", "input", "select", "city", "chrome-start", "chrome-end"]) assert.match(reduced, new RegExp("--glass-" + name + ":#"));
  assert.match(css, /\.portal-whatsapp-panel/);
});

test("all panel consumers request the new immutable stylesheet version", async () => {
  for (const path of ["app/admin/layout.tsx", "app/mi-cuenta/layout.tsx", "app/foro/layout.tsx"]) assert.match(await source(path), /panels-20260923\.css\?v=20261021-rounded/);
});
