/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const { webcrypto } = require("node:crypto");

function createHarness() {
  const storage = {}; const downloads = []; const shown = []; const removed = []; let listener;
  const context = { console, TextEncoder, crypto: webcrypto, btoa: (v) => Buffer.from(v, "binary").toString("base64"), setTimeout, clearTimeout };
  context.globalThis = context;
  context.chrome = {
    storage: { local: { get: async (key) => ({ [key]: storage[key] }), set: async (value) => Object.assign(storage, value) } },
    tabs: { sendMessage: async () => ({}), captureVisibleTab: async () => "data:image/png;base64,dGVzdA==", onRemoved: { addListener() {} } },
    downloads: { download: async (options) => { downloads.push(options); return downloads.length; }, show: (id) => shown.push(id), removeFile: async (id) => removed.push(id) },
    runtime: { onMessage: { addListener(fn) { listener = fn; } } }
  };
  context.importScripts = () => {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("../extension/core.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(require.resolve("../extension/background.js"), "utf8"), context);
  async function send(message, sender = {}) { return new Promise((resolve) => listener(message, sender, resolve)); }
  return { send, downloads, shown, removed };
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

test("removes an individual screenshot while retaining an audit event", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Profile", url: "https://board.test/app" };
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  const capture = await h.send({ type: "CAPTURE_PAGE", payload: { pageLabel: "Profile", url: tab.url, origin: "https://board.test" } }, { tab });
  const removed = await h.send({ type: "REMOVE_CAPTURE", tabId: 12, eventId: capture.session.events[0].id });
  assert.equal(removed.ok, true); assert.deepEqual(h.removed, [1]);
  assert.equal(removed.session.events[0].status, "removed"); assert.ok(removed.session.events[0].removedAt);
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

test("adds notes and creates a pilot readiness report", async () => {
  const h = createHarness();
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  const note = await h.send({ type: "ADD_NOTE", tabId: 12, note: "Manual board verification required" });
  assert.equal(note.ok, true); assert.equal(note.session.events[0].status, "note");
  const report = await h.send({ type: "EXPORT_READINESS", tabId: 12 });
  assert.equal(report.ok, true); assert.match(report.filename, /pilot-readiness-report\.html$/);
});

test("journals a capture transaction and fails closed when transition proof is weak", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Profile", url: "https://board.test/app" };
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  let result = await h.send({ type: "BEGIN_TRANSACTION", payload: { transactionId: "tx-1", beforeFingerprint: "before", confidence: 80 } }, { tab });
  assert.equal(result.ok, true); assert.equal(result.session.transactions[0].state, "frozen");
  result = await h.send({ type: "CAPTURE_PAGE", payload: { transactionId: "tx-1", pageLabel: "Profile", url: tab.url, origin: "https://board.test" } }, { tab });
  assert.equal(result.record.validation.ok, true); assert.equal(result.session.transactions[0].state, "stored");
  await h.send({ type: "RELEASE_TRANSACTION", payload: { transactionId: "tx-1" } }, { tab });
  result = await h.send({ type: "CONFIRM_TRANSITION", payload: { transactionId: "tx-1", changed: false, signalCount: 1, signals: { headingChanged: true } } }, { tab });
  assert.equal(result.ok, false); assert.equal(result.session.transactions[0].state, "anomaly"); assert.ok(result.session.blockedReason);
  result = await h.send({ type: "RESOLVE_ANOMALY" }, { tab }); assert.equal(result.ok, true); assert.equal(result.session.blockedReason, "");
});

test("requires two independent signals to confirm a transition", async () => {
  const h = createHarness(); const tab = { id: 12, windowId: 2, title: "Profile", url: "https://board.test/app" };
  await h.send({ type: "START_SESSION", payload: { tabId: 12, caseLabel: "TEST-1", jurisdiction: "UT", licenseType: "RN", allowedOrigin: "https://board.test" } });
  await h.send({ type: "BEGIN_TRANSACTION", payload: { transactionId: "tx-2", confidence: 90 } }, { tab });
  await h.send({ type: "CAPTURE_PAGE", payload: { transactionId: "tx-2", pageLabel: "Profile", url: tab.url, origin: "https://board.test" } }, { tab });
  const result = await h.send({ type: "CONFIRM_TRANSITION", payload: { transactionId: "tx-2", changed: true, signalCount: 2, signals: { urlChanged: true, fingerprintChanged: true } } }, { tab });
  assert.equal(result.ok, true); assert.equal(result.session.transactions[0].state, "confirmed"); assert.equal(result.session.events[0].transition, "confirmed");
});
