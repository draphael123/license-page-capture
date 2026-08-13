/* global chrome */
const setupView = document.getElementById("setupView");
const activeView = document.getElementById("activeView");
const sessionForm = document.getElementById("sessionForm");
const statusChip = document.getElementById("statusChip");
const feedback = document.getElementById("feedback");

async function message(payload) { return chrome.runtime.sendMessage(payload); }

function render(session) {
  const active = Boolean(session?.active);
  setupView.hidden = active; activeView.hidden = !active;
  statusChip.textContent = active ? "Recording" : "Off"; statusChip.classList.toggle("active", active);
  if (!active) return;
  document.getElementById("activeCase").textContent = session.caseLabel;
  document.getElementById("activeMeta").textContent = `${session.jurisdiction} · ${session.licenseType}`;
  document.getElementById("captureCount").textContent = session.captureCount || 0;
  const events = session.events || session.captures || [];
  document.getElementById("sequence").replaceChildren(...events.slice(-30).map((capture) => {
    const dot = document.createElement("span"); dot.className = `page-dot ${capture.status || "saved"}`;
    dot.textContent = capture.number ? String(capture.number).padStart(2, "0") : capture.status === "skipped" ? "S" : "!";
    dot.title = `${capture.pageLabel || "Page"}: ${capture.status || "saved"}${capture.reason ? ` — ${capture.reason}` : ""}`;
    return dot;
  }));
  document.getElementById("emptyState").hidden = events.length > 0;
}

function setFeedback(text, tone = "") { feedback.textContent = text; feedback.className = `feedback ${tone}`.trim(); }
async function activeTab() { return (await chrome.tabs.query({ active: true, currentWindow: true }))[0]; }

sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault(); const tab = await activeTab();
  if (!tab?.id || !tab.url?.startsWith("http")) { setFeedback("Open an application webpage first.", "error"); return; }
  const response = await message({ type: "START_SESSION", payload: {
    caseLabel: document.getElementById("caseLabel").value, jurisdiction: document.getElementById("jurisdiction").value,
    licenseType: document.getElementById("licenseType").value, skipSensitive: document.getElementById("skipSensitive").checked,
    safeMode: document.getElementById("safeMode").checked, customLabels: document.getElementById("customLabels").value,
    tabId: tab.id, allowedOrigin: new URL(tab.url).origin
  }});
  if (response?.ok) render(response.session); else setFeedback(response?.reason || "Session could not start.", "error");
});

document.getElementById("stopSession").addEventListener("click", async () => { const tab = await activeTab(); const response = await message({ type: "STOP_SESSION", tabId: tab?.id }); render(response?.session); });
document.getElementById("exportLedger").addEventListener("click", async () => { const tab = await activeTab(); const response = await message({ type: "EXPORT_LEDGER", tabId: tab?.id }); setFeedback(response?.ok ? "Capture ledger exported." : response?.reason || "Ledger export failed.", response?.ok ? "" : "error"); });
document.getElementById("captureNow").addEventListener("click", async () => {
  setFeedback("Saving this page…"); const tab = await activeTab();
  if (!tab?.id) { setFeedback("The active page is unavailable.", "error"); return; }
  try { const response = await chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_CURRENT", force: false });
    if (response?.ok) { render(response.session); setFeedback(`Page ${response.record.number} saved.`); }
    else if (response?.skipped) { render(response.session); setFeedback(`Paused: ${response.reason}.`, "warning"); }
    else { if (response?.session) render(response.session); setFeedback(response?.reason || "This page could not be saved.", "error"); }
  } catch { setFeedback("Reload this page, then try again.", "error"); }
});

activeTab().then((tab) => message({ type: "GET_SESSION", tabId: tab?.id })).then((response) => render(response?.session));
