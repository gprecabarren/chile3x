import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const readPackage = path => JSON.parse(readFileSync(path, "utf8"));
const packagePath = name => require.resolve(`${name}/package.json`);
const flightRoot = dirname(packagePath("react-server-dom-webpack"));
// plugin-rsc ships a fallback decoder inside its own tarball. Updating only
// the direct dependency or the lockfile cannot replace that embedded copy.
const fallbackRoot = join(dirname(packagePath("@vitejs/plugin-rsc")), "dist/vendor/react-server-dom");

function atLeast(version, minimum) {
  assert.match(version, /^\d+\.\d+\.\d+$/, "use a patched stable release");
  const actual = version.split(".").map(Number);
  for (let index = 0; index < minimum.length; index++) {
    if (actual[index] !== minimum[index]) return actual[index] > minimum[index];
  }
  return true;
}

test("React and both Flight decoder copies are aligned and patched for GHSA-wx67-qw84-cm4g", () => {
  const react = readPackage(packagePath("react")).version;
  const dom = readPackage(packagePath("react-dom")).version;
  const flight = readPackage(join(flightRoot, "package.json")).version;
  const fallback = readPackage(join(fallbackRoot, "package.json")).version;
  assert.ok(atLeast(react, [19, 2, 8]), react);
  assert.equal(dom, react);
  assert.equal(flight, react);
  assert.equal(fallback, react);
});

test("Next and Vite no longer resolve the advisory-affected versions", () => {
  assert.ok(atLeast(readPackage(packagePath("next")).version, [16, 3, 8]));
  assert.ok(atLeast(readPackage(packagePath("vite")).version, [8, 0, 16]));
});

test("both production Flight decoders preserve normal values and reject malformed JSON", () => {
  // Isolate the codecs and bound execution; no HTTP requests or live data.
  const script = `
    import assert from 'node:assert/strict';
    for (const url of JSON.parse(process.argv[1])) {
      const { decodeReply } = await import(url);
      const form = new FormData();
      form.set('0', JSON.stringify({ title: 'Chile3X', map: '$Q1', set: '$W2' }));
      form.set('1', JSON.stringify([['ciudad', 'Concepción']]));
      form.set('2', JSON.stringify(['foto', 'video']));
      const value = await decodeReply(form, {});
      assert.equal(value.title, 'Chile3X');
      assert.deepEqual([...value.map], [['ciudad', 'Concepción']]);
      assert.deepEqual([...value.set], ['foto', 'video']);
      for (const body of ['{', '[invalid]']) {
        await assert.rejects(async () => await decodeReply(body, {}), SyntaxError);
      }
    }
  `;
  const decoderUrls = [flightRoot, fallbackRoot].map(root => pathToFileURL(join(root, "server.edge.js")).href);
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--input-type=module", "-e", script, JSON.stringify(decoderUrls)], {
    env: { ...process.env, NODE_ENV: "production" }, timeout: 10_000, encoding: "utf8", maxBuffer: 128_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});
