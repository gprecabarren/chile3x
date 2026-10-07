import assert from "node:assert/strict";
import test from "node:test";

// The production Worker has Cloudflare's Cache API. Provide the small
// no-op equivalent needed by the rendered HTML test when it runs in Node.
if (!globalThis.caches) {
  globalThis.caches = {
    default: {
      match: async () => undefined,
      put: async () => undefined,
    },
  };
}

async function render(path = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("legacy network-derived city is ignored until a new trusted city is saved", async () => {
  const legacy = await render("/", { cookie: "chile3x_preferred_city=santiago-centro" });
  assert.equal(legacy.status, 200);
  assert.match(await legacy.text(), /COBERTURA NACIONAL/);
  const trusted = await render("/", { cookie: "chile3x_preferred_city_v2=linares" });
  assert.equal(trusted.status, 200);
  assert.match(await trusted.text(), /CIUDAD ELEGIDA/);
});

test("server-renders the Chile3X public home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=63072000; includeSubDomains; preload/);
  const contentSecurityPolicy = response.headers.get("content-security-policy") ?? "";
  assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
  assert.match(contentSecurityPolicy, /frame-src[^;]*www\.googletagmanager\.com/);
  assert.match(contentSecurityPolicy, /script-src[^;]*accounts\.google\.com/);
  assert.match(contentSecurityPolicy, /script-src-attr 'none'/);
  assert.match(contentSecurityPolicy, /frame-src[^;]*accounts\.google\.com/);

  const html = await response.text();
  assert.match(html, /<title>Chile3X: directorio adulto por ciudad en Chile \| Chile3X<\/title>/i);
  assert.match(html, /DIRECTORIO ADULTO/);
  assert.match(html, /Este sitio está destinado exclusivamente a personas mayores de edad/);
  assert.match(html, /damas de compañía/i);
  assert.match(html, /assets\/chile3x-logo-primary-320-20260923\.webp/);
  assert.match(html, /assets\/chile3x-hero-banner-20260923\.webp/);
  assert.match(html, /assets\/angelisnet-logo-vpd6ls\.webp/);
  assert.doesNotMatch(html, /static4\.dditscdn\.com/);
  assert.match(html, /ESCORTS Y DAMAS DE COMPAÑÍA DESTACADAS/i);
  assert.match(html, /Todas las regiones,/);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.ok(html.indexOf("DIRECTORIO ADULTO") < html.indexOf("ESCORTS Y DAMAS DE COMPAÑÍA DESTACADAS"));
  assert.ok(html.indexOf("ESCORTS Y DAMAS DE COMPAÑÍA DESTACADAS") < html.indexOf("Todas las regiones,"));
  assert.match(html, /Ir a una ciudad/);
  assert.match(html, /numberOfItems":36/);
  assert.match(html, /"url":"https:\/\/chile3x\.cl\/escorts\/concepcion"/);
  assert.match(html, /ciudades y comunas disponibles/);
  assert.match(html, /Región de Arica y Parinacota/);
  assert.match(html, /Región de Magallanes y de la Antártica Chilena/);
  assert.match(html, /wa\.me\/56933365005\?text=/);
  assert.match(html, /Registrarse/);
  assert.match(html, /Publicar anuncio/);
  assert.match(html, /href="\/registro"/);
  assert.match(html, /href="\/ingresar\?return_to=\/mi-cuenta\/nuevo-perfil"/);
  assert.doesNotMatch(html, /Se priorizan las escorts con más visualizaciones únicas recientes/);
  assert.doesNotMatch(html, /Los perfiles destacados aparecerán aquí/);
  assert.doesNotMatch(html, /Publicar perfil/);
  assert.doesNotMatch(html, /GTM-NCJ3ZNH3/);
  assert.doesNotMatch(html, /www\.googletagmanager\.com\/ns\.html\?id=GTM-NCJ3ZNH3/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|codex-preview/i);
});

test("the built Worker bypasses a shared cached document for user and admin cookies", async () => {
  const original = globalThis.caches;
  let reads = 0;
  globalThis.caches = { default: {
    match: async () => { reads++; return new Response("cached-anonymous-page", { headers: { "content-type": "text/html" } }); },
    put: async () => { throw new Error("unexpected authenticated cache write"); },
  } };
  try {
    for (const name of ["chile3x_user_session", "chile3x_admin_session"]) {
      // Malformed/expired cookies must also bypass shared HTML. This token
      // needs no database to reject, so it works in the Node render harness.
      const response = await render("/", { cookie: `${name}=expired` });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /private, no-store/);
      assert.doesNotMatch(await response.text(), /cached-anonymous-page/);
    }
    assert.equal(reads, 0);
    const anonymous = await render();
    assert.equal(await anonymous.text(), "cached-anonymous-page");
    assert.match(anonymous.headers.get("cache-control"), /private, no-store/);
    assert.equal(reads, 1);
  } finally { globalThis.caches = original; }
});

test("the built Worker isolates anonymous city HTML and never shares it with an authenticated session", async () => {
  const original = globalThis.caches;
  const reads = [];
  const writes = [];
  globalThis.caches = { default: {
    match: async key => {
      reads.push(key.url);
      const city = new URL(key.url).searchParams.get("__chile3x_city");
      return new Response(`anonymous-city:${city}`, { headers: { "content-type": "text/html" } });
    },
    put: async key => { writes.push(key.url); },
  } };
  try {
    for (const city of ["concepcion", "linares"]) {
      const response = await render("/", { cookie: `chile3x_preferred_city_v2=${city}` });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), `anonymous-city:${city}`);
      assert.match(response.headers.get("cache-control"), /private, no-store/);
    }
    assert.notEqual(reads[0], reads[1]);
    const authenticated = await render("/", { cookie: "chile3x_user_session=invalid; chile3x_preferred_city_v2=concepcion" });
    assert.doesNotMatch(await authenticated.text(), /anonymous-city:/);
    assert.equal(reads.length, 2);
    assert.equal(writes.length, 0);
  } finally { globalThis.caches = original; }
});

test("cache outages do not prevent the built Worker from rendering", async () => {
  const original = globalThis.caches;
  globalThis.caches = { default: { match: async () => { throw new Error("cache unavailable"); }, put: async () => undefined } };
  try {
    const response = await render();
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Directorio adulto por ciudad/);
  } finally { globalThis.caches = original; }
});
