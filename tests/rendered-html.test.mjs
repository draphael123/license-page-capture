import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Page Capture landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Page Capture/);
  assert.match(html, /Every page/);
  assert.match(html, /Already captured/);
  assert.match(html, /Privacy by default/);
  assert.match(html, /Test lab/);
  assert.match(html, /Download v0\.6/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders the dedicated no-login test lab", async () => {
  const response = await render("/test-lab");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Choose a complete test application/);
  assert.match(html, /fictional data only/i);
  assert.match(html, /Guided test checklist/);
  assert.match(html, /Sample output/);
  assert.match(html, /Behavior coverage/);
  assert.match(html, /Compatibility/);
  assert.match(html, /Privacy walkthrough/);
  assert.match(html, /Troubleshooting/);
  assert.match(html, /Report a test result/);
  assert.match(html, /More ways to use it/);
  assert.match(html, /Current release/);

  const demoSource = await readFile(new URL("../app/CaptureDemo.tsx", import.meta.url), "utf8");
  assert.match(demoSource, /TEST \{String\(index \+ 1\)\.padStart\(2, "0"\)\}/);
  assert.match(demoSource, /Nurse licensing/);
  assert.match(demoSource, /Provider credentialing/);
  assert.match(demoSource, /Insurance enrollment/);
});

test("ships the extension package and social preview", async () => {
  await Promise.all([
    access(new URL("../public/license-page-capture-v0.6.0.zip", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../extension/manifest.json", import.meta.url)),
  ]);
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "License Page Capture");
  assert.equal(manifest.version, "0.6.0");
});

test("includes a Vercel server entry for application routes", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const entry = await readFile(new URL("../api/site.mjs", import.meta.url), "utf8");
  assert.equal(config.outputDirectory, "dist/client");
  assert.match(config.rewrites[0].destination, /api\/site/);
  assert.match(entry, /worker\.fetch/);
});
