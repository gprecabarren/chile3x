import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adminHasCapability, ADMIN_ACCESS_LEVELS } from "../lib/admin-permissions.ts";
import { BUG_REPORT_STATES, HOME_TESTING_PATH, readTestingSection, settingsReturnPath, testingBugReportsPath } from "../lib/admin-testing-policy.ts";

const source = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("the Testers hub retains the existing capability boundaries for every administrator role", () => {
  for (const accessLevel of ADMIN_ACCESS_LEVELS) {
    const admin = { accessLevel };
    const permissions = { bugs: adminHasCapability(admin, "bugs.manage"), settings: adminHasCapability(admin, "settings.manage") };
    assert.equal(readTestingSection("bugs", permissions), permissions.bugs ? "bugs" : null);
    assert.equal(readTestingSection("inicio", permissions), permissions.settings ? "inicio" : null);
    assert.equal(readTestingSection("tema", permissions), permissions.settings ? "tema" : null);
    assert.equal(readTestingSection(undefined, permissions), permissions.bugs ? "bugs" : permissions.settings ? "inicio" : null);
    assert.equal(readTestingSection("unknown", permissions), readTestingSection(undefined, permissions));
  }
  assert.equal(readTestingSection("inicio", { bugs: true, settings: false }), null);
  assert.equal(readTestingSection(undefined, { bugs: false, settings: true }), "inicio");
  assert.equal(readTestingSection(undefined, { bugs: false, settings: false }), null);
});

test("old bug links preserve valid filters and success notices without carrying arbitrary query strings", () => {
  for (const state of BUG_REPORT_STATES) {
    const url = new URL(testingBugReportsPath(state, true), "https://example.test");
    assert.equal(url.pathname, "/admin/testing");
    assert.deepEqual([...url.searchParams], [["seccion", "bugs"], ["estado", state], ["notice", "updated"]]);
  }
  for (const state of [undefined, ["resolved"], "__proto__", "resolved&next=https://evil.invalid"]) {
    assert.equal(testingBugReportsPath(state), "/admin/testing?seccion=bugs");
  }
});

test("settings redirects allow the exact home tab and existing configuration pages, never arbitrary destinations", () => {
  assert.equal(settingsReturnPath(HOME_TESTING_PATH), HOME_TESTING_PATH);
  for (const value of ["/admin/configuracion", "/admin/configuracion/seo", "/admin/configuracion/inicio"]) assert.equal(settingsReturnPath(value), value);
  for (const value of [null, undefined, [], "https://evil.invalid/", "//evil.invalid/", "/admin/testing?seccion=inicio&next=//evil.invalid", "/admin/testing?seccion=bugs", "/admin/configuracion/../cuentas", "/admin/configuracion?next=//evil.invalid"]) assert.equal(settingsReturnPath(value), "/admin/configuracion");
});

test("the hub authorizes before data panels and only renders the selected tool", async () => {
  const page = await source("app/admin/testing/page.tsx");
  assert.ok(page.indexOf("if (!admin)") < page.indexOf("<BugReportsPanel"));
  assert.ok(page.indexOf("if (!section)") < page.indexOf("<HomeLayoutSettingsPanel"));
  assert.match(page, /privatePageMetadata/);
  assert.match(page, /section === "bugs" \? <BugReportsPanel/);
  assert.match(page, /permissions\.bugs &&/);
  assert.match(page, /permissions\.settings &&/);
  assert.doesNotMatch(page, /useEffect|fetch\(|getDb/);
});

test("old routes are lightweight redirects and the form and navigation use the new hub", async () => {
  const [bugs, home, api, shell, preview] = await Promise.all([
    source("app/admin/bugs/route.ts"), source("app/admin/configuracion/inicio/route.ts"),
    source("app/api/bugs/[bugId]/route.ts"), source("app/admin/_components.tsx"),
    source("app/admin/vista-previa-inicio/[layout]/page.tsx"),
  ]);
  assert.match(bugs, /testingBugReportsPath\(query.get\("estado"\), query.get\("notice"\) === "updated"\)/);
  assert.match(home, /NextResponse.redirect/);
  for (const old of [bugs, home]) assert.match(old, /, 307\)/);
  for (const old of [bugs, home]) assert.doesNotMatch(old, /getDb|<form|AdminShell/);
  assert.match(api, /testingBugReportsPath\(status, true\)/);
  assert.match(shell, /href="\/admin\/testing">Testing/);
  assert.match(preview, /href=\{HOME_TESTING_PATH\}/);
});
