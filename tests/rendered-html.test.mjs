import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
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
  assert.match(html, /Download v0\.2/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships the extension package and social preview", async () => {
  await Promise.all([
    access(new URL("../public/license-page-capture-v0.2.0.zip", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../extension/manifest.json", import.meta.url)),
  ]);
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "License Page Capture");
  assert.equal(manifest.version, "0.2.0");
});
