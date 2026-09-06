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

test("server-renders the Chile3X public home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  const contentSecurityPolicy = response.headers.get("content-security-policy") ?? "";
  assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
  assert.match(contentSecurityPolicy, /frame-src[^;]*www\.googletagmanager\.com/);

  const html = await response.text();
  assert.match(html, /<title>Directorio nacional de escorts \| Chile3X<\/title>/i);
  assert.match(html, /DIRECTORIO DE ESCORTS/);
  assert.match(html, /Este sitio está destinado exclusivamente a personas mayores de edad/);
  assert.match(html, /Directorio de escorts, agencias y arriendos/);
  assert.match(html, /Escorts destacadas/i);
  assert.match(html, /Todas las regiones,/);
  assert.match(html, /numberOfItems":36/);
  assert.match(html, /ciudades y comunas disponibles/);
  assert.match(html, /Región de Arica y Parinacota/);
  assert.match(html, /Región de Magallanes y de la Antártica Chilena/);
  assert.match(html, /wa\.me\/56933365005\?text=/);
  assert.match(html, /Registrarse/);
  assert.match(html, /Publicar anuncio/);
  assert.match(html, /href="\/registro"/);
  assert.match(html, /href="\/mi-cuenta\/nuevo-perfil"/);
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

test("cache outages do not prevent the built Worker from rendering", async () => {
  const original = globalThis.caches;
  globalThis.caches = { default: { match: async () => { throw new Error("cache unavailable"); }, put: async () => undefined } };
  try {
    const response = await render();
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Directorio nacional de escorts/);
  } finally { globalThis.caches = original; }
});
