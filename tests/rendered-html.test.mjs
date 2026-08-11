import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
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
  assert.match(html, /<title>Escorts en Chile \| Chile3X<\/title>/i);
  assert.match(html, /DIRECTORIO DE ESCORTS/);
  assert.match(html, /Este sitio está destinado exclusivamente a personas mayores de edad/);
  assert.match(html, /Directorio de escorts, agencias y arriendos/);
  assert.match(html, /Escorts destacadas/i);
  assert.match(html, /Todas las regiones,/);
  assert.match(html, /numberOfItems":36/);
  assert.match(html, /ciudades y comunas iniciales/);
  assert.match(html, /Región de Arica y Parinacota/);
  assert.match(html, /Región de Magallanes y de la Antártica Chilena/);
  assert.match(html, /wa\.me\/56933365005\?text=/);
  assert.doesNotMatch(html, /GTM-NCJ3ZNH3/);
  assert.doesNotMatch(html, /www\.googletagmanager\.com\/ns\.html\?id=GTM-NCJ3ZNH3/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|codex-preview/i);
});
