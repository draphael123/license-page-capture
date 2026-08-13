/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const { webcrypto } = require("node:crypto");

function createHarness() {
  const storage = {}; const downloads = []; const shown = []; let listener;
  const context = { console, TextEncoder, crypto: webcrypto, btoa: (v) => Buffer.from(v, "binary").toString("base64"), setTimeout, clearTimeout };
  context.globalThis = context;
  context.chrome = {
    storage: { local: { get: async (key) => ({ [key]: storage[key] }), set: async (value) => Object.assign(storage, value) } },
    tabs: { sendMessage: async () => ({}), captureVisibleTab: async () => "data:image/png;base64,dGVzdA==", onRemoved: { addListener() {} } },
    downloads: { download: async (options) => { downloads.push(options); return downloads.length; }, show: (id) => shown.push(id) },
    runtime: { onMessage: { addListener(fn) { listener = fn; } } }
  };
  context.importScripts = () => {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("../extension/core.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(require.resolve("../extension/background.js"), "utf8"), context);
  async function send(message, sender = {}) { return new Promise((resolve) => listener(message, sender, resolve)); }
  return { send, downloads, shown };
}

test("isolates a session, captures, skips sensitive pages, and blocks domain changes", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Test", url: "https://board.test/app" };
  let result = await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test", safeMode: true, skipSensitive: true } });
  assert.equal(result.session.tabId, 12);
  result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Profile", url: tab.url, origin: "https://board.test" } }, { tab });
  assert.equal(result.ok, true); assert.equal(result.session.captureCount, 1); assert.equal(h.downloads.length, 1);
  assert.match(h.downloads[0].filename, /^License Page Captures\/TEST-1\/UT_RN\/[^/]+_session\/001_Profile_/);
  result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Payment", url: tab.url, origin: "https://board.test", sensitive: true, sensitiveReason: "Payment field detected" } }, { tab });
  assert.equal(result.skipped, true); assert.equal(result.session.events.at(-1).status, "skipped");
  result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Other", url: "https://other.test", origin: "https://other.test" } }, { tab });
  assert.equal(result.blocked, true); assert.equal(result.session.events.at(-1).status, "blocked");
});

test("suppresses rapid duplicate captures and can reveal the saved file", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Test", url: "https://board.test/app" };
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  const request = { type: "CAPTURE_PAGE", payload: { pageLabel: "Profile", url: tab.url, origin: "https://board.test" } };
  await h.send(request, { tab });
  const duplicate = await h.send(request, { tab });
  assert.equal(duplicate.duplicate, true); assert.equal(h.downloads.length, 1);
  const opened = await h.send({ type: "OPEN_SESSION_FOLDER", tabId: 12 });
  assert.equal(opened.ok, true); assert.deepEqual(h.shown, [1]);
});

test("exports an HTML summary into the active session folder", async () => {
  const h = createHarness();
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  const result = await h.send({ type: "EXPORT_SUMMARY", tabId: 12 });
  assert.equal(result.ok, true);
  assert.match(result.filename, /^License Page Captures\/TEST-1\/UT_RN\/[^/]+_session\/session-summary\.html$/);
  assert.match(h.downloads[0].url, /^data:text\/html;base64,/);
});

test("resets a completed session before starting another test", async () => {
  const h = createHarness();
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  await h.send({ type: "STOP_SESSION", tabId: 12 });
  const reset = await h.send({ type: "RESET_SESSION", tabId: 12 });
  assert.equal(reset.ok, true); assert.equal(reset.session, null);
  const current = await h.send({ type: "GET_SESSION", tabId: 12 });
  assert.equal(current.session, null);
});

test("saves a supplied stitched full-page image without another viewport capture", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Long page", url: "https://board.test/app" };
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test", fullPage: true } });
  const dataUrl = "data:image/png;base64,ZnVsbC1wYWdl";
  const result = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "History", url: tab.url, origin: "https://board.test", dataUrl } }, { tab });
  assert.equal(result.ok, true); assert.equal(result.record.fullPage, true); assert.equal(h.downloads[0].url, dataUrl);
});

test("creates a new download folder for every session", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Test", url: "https://board.test/app" };
  const payload = { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" };
  await h.send({ type: "START_SESSION", payload });
  await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "One", url: tab.url, origin: "https://board.test" } }, { tab });
  await new Promise((resolve) => setTimeout(resolve, 2));
  await h.send({ type: "START_SESSION", payload });
  await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "One", url: tab.url, origin: "https://board.test" } }, { tab });
  const firstFolder = h.downloads[0].filename.split("/").slice(0, -1).join("/");
  const secondFolder = h.downloads[1].filename.split("/").slice(0, -1).join("/");
  assert.notEqual(firstFolder, secondFolder);
});
