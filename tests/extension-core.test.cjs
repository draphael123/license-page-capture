/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const context = { globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../extension/core.js"), "utf8"), context);
const core = context.PageCaptureCore;

test("recognizes common and custom navigation labels", () => {
  for (const label of ["Next", "Continue →", "Save & continue", "Review and continue", "Continue application"]) assert.equal(core.actionMatches(label), true, label);
  assert.equal(core.actionMatches("Go forward", ["Go forward"]), true);
  assert.equal(core.actionMatches("Delete application"), false);
});
test("detects sensitive terminology", () => {
  for (const value of ["Social Security Number", "credit-card-number", "One-time code", "Bank account"]) assert.ok(core.containsSensitive(value), value);
  assert.equal(core.containsSensitive("License number"), "");
});
test("sanitizes download path segments", () => {
  assert.equal(core.cleanSegment("UT RN / Pilot #1"), "UT-RN-Pilot-1");
  assert.equal(core.cleanSegment(""), "Untitled");
});
