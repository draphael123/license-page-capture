/* global chrome */
const byId = (id) => document.getElementById(id);
const setupView = byId("setupView");
const activeView = byId("activeView");
const completeView = byId("completeView");
const sessionForm = byId("sessionForm");
const statusChip = byId("statusChip");
const RELEASE_URL = "https://license-page-capture-repo.vercel.app/latest.json";
let availableRelease = null;

async function message(payload) { return chrome.runtime.sendMessage(payload); }
async function activeTab() { return (await chrome.tabs.query({ active: true, currentWindow: true }))[0]; }
function clean(value, fallback) { return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-_.]+|[-_.]+$/g, "") || fallback; }

function setFeedback(view, text, tone = "") {
  const target = byId(view === "active" ? "activeFeedback" : view === "complete" ? "completeFeedback" : "feedback");
  target.textContent = text; target.className = `feedback ${tone}`.trim();
}

function eventItem(event, review = false) {
  const item = document.createElement("li");
  const status = event.status || "saved";
  item.className = `activity-item ${status}${event.preview ? " has-preview" : ""}`;
  if (event.preview) { const image = document.createElement("img"); image.src = event.preview; image.alt = ""; item.append(image); }
  const marker = document.createElement("span"); marker.className = "activity-marker"; marker.textContent = status === "saved" ? "✓" : status === "skipped" || status === "removed" ? "–" : "!";
  const copy = document.createElement("div");
  const name = document.createElement("strong"); name.textContent = event.pageLabel || "Application page";
  const detail = document.createElement("small"); detail.textContent = status === "saved" ? "Saved" : status === "removed" ? "Screenshot removed" : status === "skipped" ? `Skipped · ${event.reason || "sensitive screen"}` : `Needs review · ${event.reason || status}`;
  copy.append(name, detail); item.append(marker, copy);
  if (review && status === "saved") { const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-capture"; remove.textContent = "Remove"; remove.dataset.eventId = event.id; remove.setAttribute("aria-label", `Remove ${event.pageLabel || "application page"} screenshot`); item.append(remove); }
  return item;
}

function render(session) {
  const active = Boolean(session?.active); const complete = Boolean(session && !active && session.startedAt);
  setupView.hidden = active || complete; activeView.hidden = !active; completeView.hidden = !complete;
  statusChip.textContent = active ? "Capturing" : complete ? "Complete" : "Ready";
  statusChip.className = `status-chip ${active ? "active" : complete ? "complete" : ""}`;
  if (!session) { updateFolderPreview(); return; }
  const events = session.events || session.captures || [];
  if (active) {
    byId("activeCase").textContent = session.caseLabel;
    byId("activeMeta").textContent = [session.jurisdiction, session.licenseType].filter(Boolean).join(" · ") || "Application details not provided";
    byId("captureCount").textContent = session.captureCount || 0;
    const list = byId("activityList"); list.replaceChildren(...events.slice(-5).reverse().map(eventItem));
    byId("emptyState").hidden = events.length > 0;
  } else {
    byId("completeCase").textContent = session.caseLabel;
    byId("savedTotal").textContent = events.filter((event) => event.status === "saved").length;
    byId("skippedTotal").textContent = events.filter((event) => event.status === "skipped").length;
    byId("failedTotal").textContent = events.filter((event) => ["failed", "blocked"].includes(event.status)).length;
    byId("reviewList").replaceChildren(...events.slice().reverse().map((event) => eventItem(event, true)));
    if (session.reviewAfter) setFeedback("complete", `Review these local files by ${new Date(session.reviewAfter).toLocaleDateString()}.`, "warning");
  }
}

function updateFolderPreview() {
  const test = clean(byId("caseLabel").value, "Your-test");
  const state = clean(byId("jurisdiction").value, "General");
  const license = clean(byId("licenseType").value, "Application");
  byId("folderPreview").textContent = `Downloads/License Page Captures/${test}/${state}_${license}/new-session/`;
}

function newerVersion(latest, current) {
  const a = String(latest).split(".").map(Number); const b = String(current).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

async function checkForUpdates(showCurrent = false) {
  const button = byId("checkUpdates"); button.disabled = true; button.textContent = "Checking…";
  try {
    const response = await fetch(`${RELEASE_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Update check failed");
    const release = await response.json(); const current = chrome.runtime.getManifest().version;
    availableRelease = newerVersion(release.version, current) ? release : null;
    byId("updateNotice").hidden = !availableRelease;
    if (availableRelease) {
      byId("updateTitle").textContent = `Version ${release.version} is ready`;
      byId("updateCopy").textContent = "Download it, replace the unpacked folder, then select Reload on chrome://extensions.";
    } else if (showCurrent) setFeedback(setupView.hidden ? (completeView.hidden ? "active" : "complete") : "setup", `Version ${current} is current.`);
    await chrome.storage.local.set({ lastUpdateCheck: new Date().toISOString() });
  } catch {
    if (showCurrent) setFeedback(setupView.hidden ? (completeView.hidden ? "active" : "complete") : "setup", "Could not check for updates. Try again later.", "error");
  } finally { button.disabled = false; button.textContent = "Check for updates"; }
}

byId("checkUpdates").addEventListener("click", () => checkForUpdates(true));
byId("downloadUpdate").addEventListener("click", () => {
  if (availableRelease?.downloadUrl) chrome.downloads.download({ url: availableRelease.downloadUrl, saveAs: true });
});

async function loadPortalPreset(tab) {
  if (!tab?.url?.startsWith("http")) return;
  const { portalPresets = {} } = await chrome.storage.local.get("portalPresets");
  const preset = portalPresets[new URL(tab.url).origin];
  if (preset?.customLabels) byId("customLabels").value = preset.customLabels;
}
async function savePortalPreset(origin) {
  const { portalPresets = {} } = await chrome.storage.local.get("portalPresets");
  portalPresets[origin] = { customLabels: byId("customLabels").value.trim(), updatedAt: new Date().toISOString() };
  await chrome.storage.local.set({ portalPresets });
}

async function runPreflight(tab) {
  const box = byId("preflight");
  if (!tab?.id || !tab.url?.startsWith("http")) { box.className = "preflight failed"; box.innerHTML = "<span>!</span><div><strong>Open a normal webpage</strong><small>Browser settings and extension pages cannot be captured.</small></div>"; return; }
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "PREFLIGHT", customLabels: byId("customLabels").value.split(",").map((item) => item.trim()).filter(Boolean) });
    const found = result.navigationControls?.length || 0;
    box.className = `preflight ${found ? "passed" : "warning"}`;
    box.innerHTML = `<span>${found ? "✓" : "!"}</span><div><strong>${found ? "Ready to test" : "No Next control detected yet"}</strong><small>${result.sensitive ? "Sensitive fields are present and will be skipped." : found ? `${found} navigation control${found === 1 ? "" : "s"} detected.` : "You can add the button label below or start on the first form page."}</small></div>`;
  } catch { box.className = "preflight failed"; box.innerHTML = "<span>!</span><div><strong>Reload this webpage</strong><small>The extension needs to reconnect before the test starts.</small></div>"; }
}

sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault(); const tab = await activeTab();
  if (!tab?.id || !tab.url?.startsWith("http")) { setFeedback("setup", "Open an application webpage first.", "error"); return; }
  const response = await message({ type: "START_SESSION", payload: {
    caseLabel: byId("caseLabel").value, jurisdiction: byId("jurisdiction").value || "General",
    licenseType: byId("licenseType").value || "Application", skipSensitive: byId("skipSensitive").checked,
    safeMode: byId("safeMode").checked, fullPage: byId("fullPage").checked, customLabels: byId("customLabels").value,
    retentionDays: Number(byId("retentionDays").value),
    tabId: tab.id, allowedOrigin: new URL(tab.url).origin
  }});
  if (response?.ok) { await savePortalPreset(new URL(tab.url).origin); render(response.session); }
  else setFeedback("setup", response?.reason || "The test could not start.", "error");
});

byId("captureNow").addEventListener("click", async () => {
  setFeedback("active", "Saving the current page…"); const tab = await activeTab();
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_CURRENT", force: false });
    if (response?.ok) { render(response.session); setFeedback("active", response.duplicate ? "This page was already saved." : `${response.record.pageLabel} saved.`); }
    else if (response?.skipped) { render(response.session); setFeedback("active", `Skipped: ${response.reason}`, "warning"); }
    else { if (response?.session) render(response.session); setFeedback("active", response?.reason || "The page could not be saved.", "error"); }
  } catch { setFeedback("active", "Reload the application page, then try again.", "error"); }
});

byId("stopSession").addEventListener("click", async () => {
  const tab = await activeTab(); const response = await message({ type: "STOP_SESSION", tabId: tab?.id }); render(response?.session);
});

async function runSessionAction(type, view, success) {
  const tab = await activeTab(); const response = await message({ type, tabId: tab?.id });
  setFeedback(view, response?.ok ? success : response?.reason || "That action could not be completed.", response?.ok ? "" : "error");
}
byId("openFolder").addEventListener("click", () => runSessionAction("OPEN_SESSION_FOLDER", "complete", "Opening screenshots."));
byId("openFolderActive").addEventListener("click", () => runSessionAction("OPEN_SESSION_FOLDER", "active", "Opening screenshots."));
byId("exportSummary").addEventListener("click", () => runSessionAction("EXPORT_SUMMARY", "complete", "Session summary created."));
byId("exportSummaryActive").addEventListener("click", () => runSessionAction("EXPORT_SUMMARY", "active", "Session summary created."));
byId("exportLedger").addEventListener("click", () => runSessionAction("EXPORT_LEDGER", "complete", "Technical log downloaded."));
byId("exportLedgerActive").addEventListener("click", () => runSessionAction("EXPORT_LEDGER", "active", "Technical log downloaded."));
byId("exportSupport").addEventListener("click", () => runSessionAction("EXPORT_SUPPORT", "complete", "Privacy-safe support report downloaded."));
byId("exportSupportActive").addEventListener("click", () => runSessionAction("EXPORT_SUPPORT", "active", "Privacy-safe support report downloaded."));
byId("newSession").addEventListener("click", async () => { const tab = await activeTab(); await message({ type: "RESET_SESSION", tabId: tab?.id }); sessionForm.reset(); byId("skipSensitive").checked = true; byId("safeMode").checked = true; render(null); });
byId("reviewList").addEventListener("click", async (event) => {
  const button = event.target.closest(".remove-capture"); if (!button) return;
  const item = button.closest(".activity-item"); const name = item?.querySelector("strong")?.textContent || "this screenshot";
  if (!confirm(`Remove ${name} from your Downloads folder? This cannot be undone.`)) return;
  button.disabled = true; const tab = await activeTab(); const response = await message({ type: "REMOVE_CAPTURE", tabId: tab?.id, eventId: button.dataset.eventId });
  if (response?.ok) { render(response.session); setFeedback("complete", `${name} removed.`); }
  else { button.disabled = false; setFeedback("complete", response?.reason || "The screenshot could not be removed.", "error"); }
});
["caseLabel", "jurisdiction", "licenseType"].forEach((id) => byId(id).addEventListener("input", updateFolderPreview));

activeTab().then(async (tab) => { await loadPortalPreset(tab); await runPreflight(tab); return message({ type: "GET_SESSION", tabId: tab?.id }); }).then((response) => render(response?.session));
chrome.storage.local.get("lastUpdateCheck").then(({ lastUpdateCheck }) => {
  if (!lastUpdateCheck || Date.now() - new Date(lastUpdateCheck).getTime() > 24 * 60 * 60 * 1000) checkForUpdates(false);
});
