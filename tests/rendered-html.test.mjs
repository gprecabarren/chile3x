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

  const html = await response.text();
  assert.match(html, /<title>Encuentra perfiles en todo Chile \| Chile3X<\/title>/i);
  assert.match(html, /DIRECTORIO PARA ADULTOS/);
  assert.match(html, /Este sitio está destinado exclusivamente a personas mayores de edad/);
  assert.match(html, /Perfiles, agencias y arriendos/);
  assert.match(html, /Publicaciones destacadas/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|codex-preview/i);
});
