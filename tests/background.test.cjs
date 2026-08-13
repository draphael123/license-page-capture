/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const { webcrypto } = require("node:crypto");

function createHarness() {
  const storage = {}; const downloads = []; let listener;
  const context = { console, TextEncoder, crypto: webcrypto, btoa: (v) => Buffer.from(v, "binary").toString("base64"), setTimeout, clearTimeout };
  context.globalThis = context;
  context.chrome = {
    storage: { local: { get: async (key) => ({ [key]: storage[key] }), set: async (value) => Object.assign(storage, value) } },
    tabs: { sendMessage: async () => ({}), captureVisibleTab: async () => "data:image/png;base64,dGVzdA==", onRemoved: { addListener() {} } },
    downloads: { download: async (options) => { downloads.push(options); return downloads.length; } },
    runtime: { onMessage: { addListener(fn) { listener = fn; } } }
  };
  context.importScripts = () => {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("../extension/core.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(require.resolve("../extension/background.js"), "utf8"), context);
  async function send(message, sender = {}) { return new Promise((resolve) => listener(message, sender, resolve)); }
  return { send, downloads };
}

test("isolates a session, captures, skips sensitive pages, and blocks domain changes", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Test", url: "https://board.test/app" };
  let result = await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test", safeMode: true, skipSensitive: true } });
  assert.equal(result.session.tabId, 12);
  result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Profile", url: tab.url, origin: "https://board.test" } }, { tab });
  assert.equal(result.ok, true); assert.equal(result.session.captureCount, 1); assert.equal(h.downloads.length, 1);
  result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Payment", url: tab.url, origin: "https://board.test", sensitive: true, sensitiveReason: "Payment field detected" } }, { tab });
  assert.equal(result.skipped, true); assert.equal(result.session.events.at(-1).status, "skipped");
  result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Other", url: "https://other.test", origin: "https://other.test" } }, { tab });
  assert.equal(result.blocked, true); assert.equal(result.session.events.at(-1).status, "blocked");
});
