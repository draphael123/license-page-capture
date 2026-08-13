/* global chrome, PageCaptureCore */
importScripts("core.js");

const STORE_KEY = "captureSessionsV2";
const { cleanSegment } = PageCaptureCore;

function timestamp(date = new Date()) { return date.toISOString().replace(/[:.]/g, "-"); }

async function getSessions() {
  const result = await chrome.storage.local.get(STORE_KEY);
  return result[STORE_KEY] || {};
}

async function saveSessions(sessions) {
  await chrome.storage.local.set({ [STORE_KEY]: sessions });
  return sessions;
}

async function getSession(tabId) { return (await getSessions())[String(tabId)] || null; }

async function updateSession(tabId, updater) {
  const sessions = await getSessions();
  const key = String(tabId);
  sessions[key] = updater(sessions[key] || null);
  await saveSessions(sessions);
  return sessions[key];
}

async function notifyTab(tabId, session) {
  try { await chrome.tabs.sendMessage(tabId, { type: "SESSION_STATE", session }); } catch { /* tab may not have loaded the content script yet */ }
}

async function startSession(payload) {
  const tabId = Number(payload.tabId);
  if (!Number.isInteger(tabId)) throw new Error("An active application tab is required.");
  const session = {
    version: 2, tabId, active: true, caseLabel: payload.caseLabel.trim(),
    jurisdiction: payload.jurisdiction.trim(), licenseType: payload.licenseType.trim(),
    skipSensitive: payload.skipSensitive !== false, safeMode: payload.safeMode !== false,
    customLabels: String(payload.customLabels || "").split(",").map((x) => x.trim()).filter(Boolean),
    allowedOrigin: payload.allowedOrigin || "", startedAt: new Date().toISOString(),
    captureCount: 0, events: []
  };
  await updateSession(tabId, () => session);
  await notifyTab(tabId, session);
  return session;
}

async function stopSession(tabId) {
  const session = await updateSession(tabId, (current) => current ? ({ ...current, active: false, stoppedAt: new Date().toISOString() }) : null);
  if (session) await notifyTab(tabId, session);
  return session;
}

function addEvent(session, event) {
  return { ...session, events: [...(session.events || []), { id: crypto.randomUUID(), at: new Date().toISOString(), ...event }] };
}

async function capturePage(tab, payload) {
  const tabId = tab?.id;
  const session = await getSession(tabId);
  if (!session?.active) return { ok: false, reason: "No capture session is active for this tab." };

  if (session.allowedOrigin && payload.origin !== session.allowedOrigin) {
    const updated = await updateSession(tabId, (s) => addEvent(s, { status: "blocked", pageLabel: payload.pageLabel, url: payload.url, reason: "Application domain changed" }));
    return { ok: false, blocked: true, reason: "Application domain changed.", session: updated };
  }
  if (payload.sensitive && session.skipSensitive && !payload.force) {
    const updated = await updateSession(tabId, (s) => addEvent(s, { status: "skipped", pageLabel: payload.pageLabel, url: payload.url, reason: payload.sensitiveReason || "Sensitive fields detected" }));
    return { ok: false, skipped: true, reason: payload.sensitiveReason || "Sensitive fields detected", session: updated };
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const number = session.captureCount + 1;
    const pageLabel = cleanSegment(payload.pageLabel || payload.title || tab.title, "Page");
    const folder = ["License Page Captures", cleanSegment(session.caseLabel, "Case"), `${cleanSegment(session.jurisdiction, "Jurisdiction")}_${cleanSegment(session.licenseType, "License")}`].join("/");
    const filename = `${folder}/${String(number).padStart(3, "0")}_${pageLabel}_${timestamp()}.png`;
    const downloadId = await chrome.downloads.download({ url: dataUrl, filename, conflictAction: "uniquify", saveAs: false });
    const record = { status: "saved", number, pageLabel, title: payload.title || tab.title || pageLabel, url: payload.url || tab.url || "", filename, downloadId };
    const updated = await updateSession(tabId, (s) => ({ ...addEvent(s, record), captureCount: number }));
    return { ok: true, record, session: updated };
  } catch (error) {
    const reason = error?.message || "Screenshot capture failed.";
    const updated = await updateSession(tabId, (s) => addEvent(s, { status: "failed", pageLabel: payload.pageLabel, url: payload.url, reason }));
    return { ok: false, reason, session: updated };
  }
}

async function exportLedger(tabId) {
  const session = await getSession(tabId);
  if (!session) return { ok: false, reason: "No session was found." };
  const bytes = new TextEncoder().encode(JSON.stringify(session, null, 2));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const url = `data:application/json;base64,${btoa(binary)}`;
  const filename = `License Page Captures/${cleanSegment(session.caseLabel, "Case")}/capture-ledger-${timestamp()}.json`;
  const downloadId = await chrome.downloads.download({ url, filename, conflictAction: "uniquify", saveAs: false });
  return { ok: true, downloadId, filename };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const tabId = Number(message?.tabId ?? sender.tab?.id);
    switch (message?.type) {
      case "GET_SESSION": return { ok: true, session: await getSession(tabId) };
      case "START_SESSION": return { ok: true, session: await startSession(message.payload) };
      case "STOP_SESSION": return { ok: true, session: await stopSession(tabId) };
      case "CAPTURE_PAGE": return capturePage(sender.tab, message.payload || {});
      case "EXPORT_LEDGER": return exportLedger(tabId);
      default: return { ok: false, reason: "Unknown request." };
    }
  })().then(sendResponse).catch((error) => sendResponse({ ok: false, reason: error?.message || "Unexpected extension error." }));
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await getSession(tabId);
  if (session?.active) await updateSession(tabId, (s) => ({ ...s, active: false, stoppedAt: new Date().toISOString(), stopReason: "Tab closed" }));
});
