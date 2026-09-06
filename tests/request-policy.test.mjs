import assert from "node:assert/strict";
import test from "node:test";
import { publicCacheKey, isCacheableDocument, preventPrivateCaching } from "../worker/public-cache.ts";
import { safeAdminReturnTo, safeAccountReturnTo } from "../lib/safe-return-to.ts";
import { registrationStateFromForm, encodeRegistrationState, decodeRegistrationState } from "../lib/registration-state.ts";

const request = (path = "/", headers = {}, method = "GET") => new Request(`https://chile3x.cl${path}`, { headers, method });

test("authenticated visitors never read or populate shared page caches, including home", () => {
  for (const path of ["/", "/escorts", "/escorts/valdivia", "/perfil/demo", "/noticias/ejemplo", "/.rsc"]) {
    for (const headers of [{ cookie: "chile3x_user_session=valid" }, { cookie: "consent=1; chile3x_admin_session=expired" }, { cookie: "chile3x_user_session=" }, { authorization: "Bearer example" }]) {
      assert.equal(publicCacheKey(request(path, headers)), null, path);
    }
  }
});

test("HTML cache preserves queries and cannot collide with router payloads or legacy entries", () => {
  const html = publicCacheKey(request("/escorts?city=Valdivia"));
  assert.ok(html);
  assert.equal(new URL(html.url).searchParams.get("city"), "Valdivia");
  assert.equal(new URL(html.url).searchParams.get("__chile3x_cache"), "anonymous-documents-v2");
  assert.notEqual(html.url, request("/escorts?city=Valdivia").url);
  for (const headers of [{ rsc: "1" }, { accept: "text/x-component" }, { "next-router-state-tree": "[]" }, { "x-vinext-mounted-slots": "x" }]) {
    assert.equal(publicCacheKey(request("/escorts", headers)), null);
  }
  assert.equal(publicCacheKey(request("/escorts.rsc")), null);
  assert.equal(publicCacheKey(request("/", {}, "POST")), null);
  for (const path of ["/admin", "/mi-cuenta", "/registro", "/api/auth/login", "/restablecer-clave"]) assert.equal(publicCacheKey(request(path)), null);
});

test("cookies, errors and non-document bodies never become shared cache entries", () => {
  assert.ok(isCacheableDocument(new Response("ok", { headers: { "content-type": "text/html" } })));
  for (const headers of [{ "set-cookie": "session=x" }, { vary: "*" }, { "content-type": "text/x-component" }, { "content-type": "application/json" }]) {
    assert.equal(isCacheableDocument(new Response("ok", { headers: { "content-type": "text/html", ...headers } })), false);
  }
  assert.equal(isCacheableDocument(new Response("error", { status: 500, headers: { "content-type": "text/html" } })), false);
  const privateResponse = preventPrivateCaching(new Response("private", { status: 303, headers: { location: "/mi-cuenta", "set-cookie": "session=new" } }));
  assert.equal(privateResponse.status, 303);
  assert.equal(privateResponse.headers.get("location"), "/mi-cuenta");
  assert.equal(privateResponse.headers.get("set-cookie"), "session=new");
  assert.match(privateResponse.headers.get("cache-control"), /private, no-store/);
});

test("return links reject external or malformed destinations and preserve filters and anchors", () => {
  for (const value of [null, "", "https://[", "https://evil.test/admin", "//evil.test/admin", "/\\evil.test/admin", "/\t/evil.test/admin", "/admin/../../outside", "/administrador"]) {
    assert.equal(safeAdminReturnTo(value), "/admin", String(value));
  }
  assert.equal(safeAdminReturnTo("/admin/perfiles?page=2#anuncio"), "/admin/perfiles?page=2#anuncio");
  assert.equal(safeAccountReturnTo("/perfil/demo?return_to=x#resenas"), "/perfil/demo?return_to=x#resenas");
  assert.equal(safeAccountReturnTo("/mi-cuenta/nuevo-perfil"), "/mi-cuenta/nuevo-perfil");
  assert.equal(safeAccountReturnTo("/admin"), "/mi-cuenta");
  assert.equal(safeAccountReturnTo("//evil.test/mi-cuenta"), "/mi-cuenta");
});

test("registration retry state preserves non-password fields only and tolerates damaged cookies", () => {
  const form = new FormData();
  form.set("display_name", "Prueba");
  form.set("email", "prueba@example.invalid");
  form.set("account_city", "Valdivia");
  form.set("adult_confirmed", "yes");
  form.set("password", "never-store-this");
  form.set("password_confirmation", "never-store-this");
  form.set("cf-turnstile-response", "token-not-to-store");
  const encoded = encodeRegistrationState(registrationStateFromForm(form));
  assert.doesNotMatch(encoded, /never-store|token-not-to-store|password/);
  const decoded = decodeRegistrationState(encoded);
  assert.equal(decoded.email, "prueba@example.invalid");
  assert.equal(decoded.city, "Valdivia");
  assert.equal(decoded.adultConfirmed, true);
  assert.equal(decodeRegistrationState("%bad-json"), null);
});
