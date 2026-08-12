const NEXT_PATTERN = /^(next|continue|save\s*(and|&)\s*(next|continue)|save\s*&?\s*proceed|proceed|review|review\s*(and|&)\s*continue)$/i;
const SENSITIVE_PATTERN = /\b(password|passcode|one[- ]?time code|verification code|security answer|social security|ssn|credit card|card number|cvv|cvc|payment|bank account|routing number)\b/i;

let session = null;
let capturing = false;
const replayClicks = new WeakSet();

function elementText(element) {
  return [
    element.innerText,
    element.value,
    element.getAttribute("aria-label"),
    element.getAttribute("title")
  ].filter(Boolean).join(" ").trim().replace(/\s+/g, " ");
}

function findActionElement(target) {
  const element = target instanceof Element
    ? target.closest("button, input[type='submit'], input[type='button'], a, [role='button']")
    : null;
  if (!element || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
    return null;
  }
  return NEXT_PATTERN.test(elementText(element)) ? element : null;
}

function sensitiveReason() {
  if (document.querySelector("input[type='password']")) return "Password field detected";
  if (document.querySelector("input[autocomplete^='cc-'], input[autocomplete='one-time-code']")) {
    return "Payment or verification field detected";
  }
  const inputs = [...document.querySelectorAll("input, select, textarea")];
  for (const input of inputs) {
    const id = input.id ? CSS.escape(input.id) : "";
    const label = id ? document.querySelector(`label[for='${id}']`)?.innerText : "";
    const context = [input.name, input.id, input.placeholder, input.getAttribute("aria-label"), label]
      .filter(Boolean).join(" ");
    if (SENSITIVE_PATTERN.test(context)) return "Sensitive field detected";
  }
  if (SENSITIVE_PATTERN.test(`${document.title} ${location.pathname}`)) return "Sensitive page detected";
  return "";
}

function pageLabel() {
  const heading = document.querySelector("main h1, main h2, form h1, form h2, h1, h2");
  return heading?.textContent?.trim() || document.title || "Application page";
}

function showIndicator(message, tone = "working") {
  let indicator = document.getElementById("license-capture-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "license-capture-indicator";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");
    document.documentElement.appendChild(indicator);
  }
  indicator.dataset.tone = tone;
  indicator.textContent = message;
  indicator.classList.add("is-visible");
  clearTimeout(showIndicator.timer);
  showIndicator.timer = setTimeout(() => indicator.classList.remove("is-visible"), 2600);
}

async function requestCapture(force = false) {
  const reason = sensitiveReason();
  return chrome.runtime.sendMessage({
    type: "CAPTURE_PAGE",
    payload: {
      title: document.title,
      pageLabel: pageLabel(),
      url: location.href,
      sensitive: Boolean(reason),
      sensitiveReason: reason,
      force
    }
  });
}

async function handleNavigationClick(event) {
  if (!session?.active || capturing) return;
  const action = findActionElement(event.target);
  if (!action) return;
  if (replayClicks.has(action)) {
    replayClicks.delete(action);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  capturing = true;
  showIndicator("Saving this page…");

  try {
    const result = await requestCapture(false);
    if (result?.ok) {
      session = result.session;
      showIndicator(`Page ${result.record.number} saved`, "success");
    } else if (result?.skipped) {
      showIndicator(`Capture paused: ${result.reason}`, "warning");
    } else {
      showIndicator(result?.reason || "Page was not saved", "error");
    }
  } catch {
    showIndicator("Page was not saved", "error");
  } finally {
    capturing = false;
    replayClicks.add(action);
    action.click();
  }
}

document.addEventListener("click", handleNavigationClick, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SESSION_STATE") {
    session = message.session;
    if (session?.active) showIndicator("Page capture is active", "success");
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === "CAPTURE_CURRENT") {
    requestCapture(Boolean(message.force)).then(sendResponse);
    return true;
  }
});

chrome.runtime.sendMessage({ type: "GET_SESSION" }).then((result) => {
  session = result?.session || null;
}).catch(() => {});
