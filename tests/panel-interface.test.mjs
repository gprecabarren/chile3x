import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layoutSource, dashboardSource, cssSource] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);

test("admin summary cards link to their existing filtered views", () => {
  assert.match(dashboardSource, /href: "\/admin\/perfiles"/);
  assert.match(dashboardSource, /href: "\/admin\/perfiles\?estado=pending"/);
  assert.match(dashboardSource, /href: "\/admin\/medios\?estado=pending"/);
  assert.match(dashboardSource, /href: "\/admin\/perfiles\?estado=paused"/);
  assert.match(dashboardSource, /className="admin-stat-link"/);
});

test("account and admin panels use Manrope with readable action text", () => {
  assert.match(layoutSource, /import \{ Manrope \} from "next\/font\/google"/);
  assert.match(layoutSource, /variable: "--font-panel"/);
  assert.match(cssSource, /\.admin-root,\s*\.account-root \{\s*font-family: var\(--font-panel\)/s);
  assert.match(cssSource, /\.admin-root \.button,[\s\S]*?font-size: 14px !important/);
  assert.match(cssSource, /\.admin-content > \.admin-stat-grid \+ \.admin-review-alert \{\s*margin-top: 24px/);
});
