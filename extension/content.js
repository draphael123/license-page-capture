/* global chrome, PageCaptureCore */
const { actionMatches, containsSensitive } = PageCaptureCore;
let session = null;
let capturing = false;
const replayClicks = new WeakSet();

function elementText(element) {
  return [element.innerText, element.value, element.getAttribute("aria-label"), element.getAttribute("title")]
    .filter(Boolean).join(" ").trim().replace(/\s+/g, " ");
}

function findActionElement(target) {
  const element = target instanceof Element ? target.closest("button, input[type='submit'], input[type='button'], a, [role='button']") : null;
  if (!element || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") return null;
  return actionMatches(elementText(element), session?.customLabels || []) ? element : null;
}

function sensitiveReason() {
  if (document.querySelector("input[type='password']")) return "Password field detected";
  if (document.querySelector("input[autocomplete^='cc-'], input[autocomplete='one-time-code']")) return "Payment or verification field detected";
  for (const input of document.querySelectorAll("input, select, textarea")) {
    const id = input.id ? CSS.escape(input.id) : "";
    const label = id ? document.querySelector(`label[for='${id}']`)?.innerText : "";
    const match = containsSensitive([input.name, input.id, input.placeholder, input.getAttribute("aria-label"), label].filter(Boolean).join(" "));
    if (match) return `Sensitive field detected: ${match}`;
  }
  const pageMatch = containsSensitive(`${document.title} ${location.pathname}`);
  return pageMatch ? `Sensitive page detected: ${pageMatch}` : "";
}

function pageLabel() { return document.querySelector("main h1, main h2, form h1, form h2, h1, h2")?.textContent?.trim() || document.title || "Application page"; }

function showIndicator(message, tone = "working", persistent = false) {
  let indicator = document.getElementById("license-capture-indicator");
  if (!indicator) { indicator = document.createElement("div"); indicator.id = "license-capture-indicator"; indicator.setAttribute("role", "status"); indicator.setAttribute("aria-live", "polite"); document.documentElement.appendChild(indicator); }
  indicator.dataset.tone = tone; indicator.textContent = message; indicator.classList.add("is-visible");
  clearTimeout(showIndicator.timer); if (!persistent) showIndicator.timer = setTimeout(() => indicator.classList.remove("is-visible"), 2800);
}

async function requestCapture(force = false) {
  const reason = sensitiveReason();
  return chrome.runtime.sendMessage({ type: "CAPTURE_PAGE", payload: { title: document.title, pageLabel: pageLabel(), url: location.href, origin: location.origin, sensitive: Boolean(reason), sensitiveReason: reason, force } });
}

function continueAction(action) { replayClicks.add(action); action.click(); }

async function handleNavigationClick(event) {
  if (!session?.active || capturing) return;
  const action = findActionElement(event.target); if (!action) return;
  if (replayClicks.has(action)) { replayClicks.delete(action); return; }
  event.preventDefault(); event.stopImmediatePropagation(); capturing = true; showIndicator("Saving this page…");
  try {
    const result = await requestCapture(false); session = result?.session || session;
    if (result?.ok) { showIndicator(`Page ${result.record.number} saved`, "success"); continueAction(action); }
    else if (result?.skipped) { showIndicator(`Capture paused: ${result.reason}`, "warning"); continueAction(action); }
    else if (session?.safeMode) { showIndicator(`Navigation stopped: ${result?.reason || "capture failed"}`, "error", true); }
    else { showIndicator(`Capture missed: ${result?.reason || "unknown error"}`, "error"); continueAction(action); }
  } catch { if (session?.safeMode) showIndicator("Navigation stopped: capture failed", "error", true); else continueAction(action); }
  finally { capturing = false; }
}

document.addEventListener("click", handleNavigationClick, true);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !session?.active || capturing) return;
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  const submitter = form?.querySelector("button[type='submit'], input[type='submit']");
  if (submitter && actionMatches(elementText(submitter), session.customLabels || [])) { event.preventDefault(); submitter.click(); }
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SESSION_STATE") { session = message.session; if (session?.active) showIndicator("Page Capture is active", "success"); sendResponse({ ok: true }); return; }
  if (message?.type === "CAPTURE_CURRENT") { requestCapture(Boolean(message.force)).then(sendResponse); return true; }
});

chrome.runtime.sendMessage({ type: "GET_SESSION" }).then((result) => { session = result?.session || null; }).catch(() => {});
