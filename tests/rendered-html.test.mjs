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
  assert.match(html, /Automatic screenshots for multi-step applications/);
  assert.match(html, /Privacy by default/);
  assert.match(html, /Test Lab/);
  assert.match(html, /Watch a page become a record/);
  assert.match(html, /overview\.webm/);
  assert.match(html, /Download v1\.1/);
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
  assert.match(html, /Other uses/);
  assert.match(html, /Current release/);

  const demoSource = await readFile(new URL("../app/CaptureDemo.tsx", import.meta.url), "utf8");
  assert.match(demoSource, /TEST \{String\(index \+ 1\)\.padStart\(2, "0"\)\}/);
  assert.match(demoSource, /Nurse licensing/);
  assert.match(demoSource, /Provider credentialing/);
  assert.match(demoSource, /Insurance enrollment/);
});

test("ships the extension package and social preview", async () => {
  await Promise.all([
    access(new URL("../public/license-page-capture-v1.1.0.zip", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../extension/manifest.json", import.meta.url)),
  ]);
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "License Page Capture");
  assert.equal(manifest.version, "1.1.0");
});

test("ships accessible guided product videos", async () => {
  const product = await render("/product").then((response) => response.text());
  assert.match(product, /Capture, verify, continue/);
  assert.match(product, /Simulated product demo/);
  assert.match(product, /kind="captions"/);
  assert.match(product, /Feature demonstrations/);
  await Promise.all(["overview.webm","capture.webm","sensitive.webm","record.webm","fullpage.webm","duplicate.webm","newsession.webm","overview-poster.png","overview.vtt"].map((name) => access(new URL(`../public/demos/${name}`, import.meta.url))));
});

test("includes a Vercel server entry for application routes", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const entry = await readFile(new URL("../api/site.mjs", import.meta.url), "utf8");
  assert.equal(config.outputDirectory, "dist/client");
  assert.match(config.rewrites[0].destination, /api\/site/);
  assert.match(entry, /worker\.fetch/);
});

test("keeps core website and extension controls accessible", async () => {
  const [lab, popup, css] = await Promise.all([
    render("/test-lab").then((response) => response.text()),
    readFile(new URL("../extension/popup.html", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(lab, /aria-label="Test Lab sections"/);
  assert.match(lab, /aria-labelledby="output-title"/);
  assert.match(popup, /role="status"/);
  assert.match(popup, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("server-renders the product, compatibility, help, and download pathways", async () => {
  const pages = await Promise.all(["/product", "/compatibility", "/help", "/download"].map(async (path) => {
    const response = await render(path); assert.equal(response.status, 200); return response.text();
  }));
  assert.match(pages[0], /Five checks around every forward action/);
  assert.match(pages[1], /Cross-origin iframes/);
  assert.match(pages[2], /Choose the symptom/);
  assert.match(pages[3], /Installation summary/);
});

test("server-renders onboarding and pilot resources", async () => {
  const [onboarding, resources] = await Promise.all(["/onboarding", "/resources"].map((path) => render(path).then((response) => { assert.equal(response.status, 200); return response.text(); })));
  assert.match(onboarding, /From download to/);
  assert.match(onboarding, /Production gate/);
  assert.match(onboarding, /Where each tool fits/);
  assert.match(resources, /Manual screenshots versus Page Capture/);
  assert.match(resources, /Pilot checklist/);
  await access(new URL("../public/page-capture-pilot-checklist.txt", import.meta.url));
});

test("server-renders the searchable tutorial center", async () => {
  const html = await render("/tutorials").then((response) => { assert.equal(response.status, 200); return response.text(); });
  assert.match(html, /Page Capture manual/);
  assert.match(html, /Install in Chrome or Edge/);
  assert.match(html, /Choose a sensitive-page mode/);
  assert.match(html, /Recover an interrupted session/);
});
