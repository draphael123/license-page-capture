/* global chrome, PageCaptureCore */
const { actionMatches, containsSensitive, navigationConfidence, pageFingerprint } = PageCaptureCore;
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

function pageLabel() {
  const currentStep = document.querySelector("[aria-current='step'], .current-step, .active-step, [data-current-step]")?.textContent?.trim();
  const heading = document.querySelector("main h1, form h1, main h2, form h2, h1, h2")?.textContent?.trim();
  return currentStep || heading || document.title || "Application page";
}

function fingerprint() {
  return pageFingerprint({ url: location.href, title: document.title, heading: pageLabel(), formCount: document.forms.length, textLength: document.body?.innerText?.length || 0 });
}

function confidence(action) {
  const inaccessibleFrames = [...document.querySelectorAll("iframe")].filter((frame) => { try { return !frame.contentDocument; } catch { return true; } }).length;
  return navigationConfidence({ recognizedAction: Boolean(action), knownPortal: Boolean(session?.customLabels?.length), formPresent: document.forms.length > 0, sensitive: Boolean(sensitiveReason()), inaccessibleFrames });
}

function deepActionElements(root = document) {
  const found = [...root.querySelectorAll("button, input[type='submit'], input[type='button'], a, [role='button']")];
  for (const element of root.querySelectorAll("*")) if (element.shadowRoot) found.push(...deepActionElements(element.shadowRoot));
  return found;
}

function showIndicator(message, tone = "working", persistent = false) {
  let indicator = document.getElementById("license-capture-indicator");
  if (!indicator) { indicator = document.createElement("div"); indicator.id = "license-capture-indicator"; indicator.setAttribute("role", "status"); indicator.setAttribute("aria-live", "polite"); document.documentElement.appendChild(indicator); }
  indicator.dataset.tone = tone; indicator.textContent = message; indicator.classList.add("is-visible");
  clearTimeout(showIndicator.timer); if (!persistent) showIndicator.timer = setTimeout(() => indicator.classList.remove("is-visible"), 2800);
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }

async function captureFullPage() {
  const root = document.documentElement; const body = document.body;
  const height = Math.max(root.scrollHeight, body?.scrollHeight || 0);
  const viewport = window.innerHeight; const width = window.innerWidth;
  if (height <= viewport + 4) return null;
  if (height * width > 45000000) throw new Error("This page is too large for full-page capture. Turn off entire-page capture for this test.");
  const positions = []; for (let y = 0; y < height; y += viewport) positions.push(Math.min(y, height - viewport));
  const uniquePositions = [...new Set(positions)]; const originalY = window.scrollY;
  const indicator = document.getElementById("license-capture-indicator"); if (indicator) indicator.style.display = "none";
  let canvas; let context; let scale;
  try {
    for (let index = 0; index < uniquePositions.length; index += 1) {
      const y = uniquePositions[index]; window.scrollTo({ top: y, behavior: "instant" }); await wait(index ? 650 : 180);
      const shot = await chrome.runtime.sendMessage({ type: "CAPTURE_VIEWPORT" });
      if (!shot?.ok || !shot.dataUrl) throw new Error("A page section could not be captured.");
      const image = await loadImage(shot.dataUrl); scale ||= image.width / width;
      if (!canvas) { canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = Math.ceil(height * scale); context = canvas.getContext("2d"); }
      context.drawImage(image, 0, Math.round(y * scale));
    }
    return canvas.toDataURL("image/png");
  } finally { window.scrollTo({ top: originalY, behavior: "instant" }); if (indicator) indicator.style.display = ""; }
}

async function requestCapture(force = false, transaction = {}) {
  const reason = sensitiveReason(); let dataUrl = null; let fallback = false;
  if (session?.fullPage && (!reason || force || !session.skipSensitive)) {
    showIndicator("Capturing the entire page…", "working", true);
    try { dataUrl = await captureFullPage(); } catch { fallback = true; showIndicator("Full page unavailable · using visible area", "warning", true); }
  }
  let result = await chrome.runtime.sendMessage({ type: "CAPTURE_PAGE", payload: { title: document.title, pageLabel: pageLabel(), url: location.href, origin: location.origin, sensitive: Boolean(reason), sensitiveReason: reason, force, dataUrl, fallback, ...transaction } });
  if (!result?.ok && !result?.skipped && !force) {
    await wait(220);
    result = await chrome.runtime.sendMessage({ type: "CAPTURE_PAGE", payload: { title: document.title, pageLabel: pageLabel(), url: location.href, origin: location.origin, sensitive: Boolean(reason), sensitiveReason: reason, force, dataUrl: null, fallback: true, ...transaction } });
  }
  return result;
}

function continueAction(action) { replayClicks.add(action); action.click(); }

async function handleNavigationClick(event) {
  if (!session?.active || capturing) return;
  const action = findActionElement(event.target); if (!action) return;
  if (replayClicks.has(action)) { replayClicks.delete(action); return; }
  event.preventDefault(); event.stopImmediatePropagation(); capturing = true; showIndicator("Saving and verifying this page…");
  const transactionId = crypto.randomUUID(); const beforeFingerprint = fingerprint(); const score = confidence(action);
  if (score < 45) { showIndicator(`Low-confidence transition (${score}%) · review before continuing`, "warning", true); capturing = false; return; }
  try {
    const result = await requestCapture(false, { transactionId, fingerprint: beforeFingerprint, confidence: score }); session = result?.session || session;
    if (result?.ok) {
      showIndicator(result.duplicate ? `${session.captureCount} saved · duplicate ignored` : `Page verified · confidence ${score}%`, "success", true);
      continueAction(action);
      const changed = await waitForTransition(beforeFingerprint);
      const confirmation = await chrome.runtime.sendMessage({ type: "CONFIRM_TRANSITION", payload: { transactionId, changed, afterFingerprint: fingerprint() } });
      session = confirmation?.session || session;
      showIndicator(changed ? `${session.captureCount} pages saved · transition confirmed` : "Page saved · navigation was not confirmed", changed ? "success" : "warning", true);
    }
    else if (result?.skipped) { showIndicator(`Capture active · sensitive page skipped`, "warning", true); continueAction(action); }
    else if (session?.safeMode) { showIndicator(`Navigation stopped: ${result?.reason || "capture failed"}`, "error", true); }
    else { showIndicator(`Capture missed: ${result?.reason || "unknown error"}`, "error"); continueAction(action); }
  } catch { if (session?.safeMode) showIndicator("Navigation stopped: capture failed", "error", true); else continueAction(action); }
  finally { capturing = false; }
}

function waitForTransition(before, timeout = 6500) {
  return new Promise((resolve) => {
    if (fingerprint() !== before) { resolve(true); return; }
    const observer = new MutationObserver(() => { if (fingerprint() !== before) { observer.disconnect(); clearTimeout(timer); resolve(true); } });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    const timer = setTimeout(() => { observer.disconnect(); resolve(fingerprint() !== before); }, timeout);
  });
}

document.addEventListener("click", handleNavigationClick, true);
document.addEventListener("submit", (event) => {
  if (!session?.active || capturing) return;
  const submitter = event.submitter || event.target.querySelector("button[type='submit'], input[type='submit']");
  if (submitter && actionMatches(elementText(submitter), session.customLabels || [])) { event.preventDefault(); submitter.click(); }
}, true);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !session?.active || capturing) return;
  const form = event.target instanceof Element ? event.target.closest("form") : null;
  const submitter = form?.querySelector("button[type='submit'], input[type='submit']");
  if (submitter && actionMatches(elementText(submitter), session.customLabels || [])) { event.preventDefault(); submitter.click(); }
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PREFLIGHT") {
    const controls = deepActionElements().filter((element) => actionMatches(elementText(element), message.customLabels || []));
    const inaccessibleFrames = [...document.querySelectorAll("iframe")].filter((frame) => { try { return !frame.contentDocument; } catch { return true; } }).length;
    sendResponse({ ok: true, origin: location.origin, pageLabel: pageLabel(), sensitive: Boolean(sensitiveReason()), navigationControls: controls.slice(0, 8).map(elementText), confidence: navigationConfidence({ recognizedAction: controls.length > 0, knownPortal: Boolean(message.customLabels?.length), formPresent: document.forms.length > 0, sensitive: Boolean(sensitiveReason()), inaccessibleFrames }), inaccessibleFrames }); return;
  }
  if (message?.type === "SESSION_STATE") { session = message.session; if (session?.active) showIndicator(`${session.captureCount || 0} pages saved · capture active`, "success", true); else document.getElementById("license-capture-indicator")?.remove(); sendResponse({ ok: true }); return; }
  if (message?.type === "CAPTURE_CURRENT") { requestCapture(Boolean(message.force)).then(sendResponse); return true; }
});

chrome.runtime.sendMessage({ type: "GET_SESSION" }).then((result) => {
  session = result?.session || null;
  if (session?.active) {
    const reconciled = !session.lastConfirmedFingerprint || session.lastConfirmedFingerprint === fingerprint();
    showIndicator(reconciled ? `${session.captureCount || 0} pages saved · session resumed` : `${session.captureCount || 0} pages saved · verify the current step`, reconciled ? "success" : "warning", true);
  }
}).catch(() => {});

window.addEventListener("beforeunload", (event) => {
  if (!session?.active || capturing) return;
  event.preventDefault(); event.returnValue = "";
});
