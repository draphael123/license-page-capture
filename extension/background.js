/* global chrome, PageCaptureCore */
importScripts("core.js");

const STORE_KEY = "captureSessionsV2";
const { cleanSegment } = PageCaptureCore;

function timestamp(date = new Date()) { return date.toISOString().replace(/[:.]/g, "-"); }

async function createThumbnail(dataUrl) {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") return "";
  try {
    const source = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const width = 180; const height = Math.max(70, Math.min(130, Math.round(source.height * (width / source.width))));
    const canvas = new OffscreenCanvas(width, height); const context = canvas.getContext("2d");
    context.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height); source.close();
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/jpeg", quality: 0.58 })).arrayBuffer());
    let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch { return ""; }
}

async function redactDetectedFields(dataUrl, rects = [], viewport = {}) {
  if (!rects.length || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") return dataUrl;
  try {
    const source = await createImageBitmap(await (await fetch(dataUrl)).blob()); const imageWidth = source.width, imageHeight = source.height; const canvas = new OffscreenCanvas(imageWidth, imageHeight); const context = canvas.getContext("2d"); context.drawImage(source, 0, 0); source.close();
    const scaleX = imageWidth / Math.max(1, Number(viewport.width || imageWidth)); const scaleY = imageHeight / Math.max(1, Number(viewport.height || imageHeight));
    context.fillStyle = "#18283d";
    for (const rect of rects) { const x = Math.floor(rect.x * scaleX), y = Math.floor(rect.y * scaleY), width = Math.ceil(rect.width * scaleX), height = Math.ceil(rect.height * scaleY); context.fillRect(x, y, width, height); context.fillStyle = "#ffffff"; context.font = `${Math.max(12, Math.round(11 * scaleY))}px sans-serif`; context.fillText("REDACTED", x + 8, y + Math.max(16, height / 2 + 4)); context.fillStyle = "#18283d"; }
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer()); let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return `data:image/png;base64,${btoa(binary)}`;
  } catch { return dataUrl; }
}

function sessionFolder(session) {
  const started = timestamp(new Date(session.startedAt));
  return [
    "License Page Captures",
    cleanSegment(session.caseLabel, "Case"),
    `${cleanSegment(session.jurisdiction, "Jurisdiction")}_${cleanSegment(session.licenseType, "License")}`,
    `${started}_session`
  ].join("/");
}

async function getSessions() {
  const result = await chrome.storage.local.get(STORE_KEY);
  return result[STORE_KEY] || {};
}

async function saveSessions(sessions) {
  await chrome.storage.local.set({ [STORE_KEY]: sessions });
  return sessions;
}

function reconcileSession(session) {
  if (!session?.active) return session;
  const stale = (session.transactions || []).find((item) => !["confirmed", "anomaly"].includes(item.state) && Date.now() - new Date(item.updatedAt || item.createdAt).getTime() > 15000);
  if (!stale) return session;
  return { ...session, blockedReason: "An interrupted page transition needs review.", transactions: (session.transactions || []).map((item) => item.id === stale.id ? { ...item, state: "anomaly", reason: "Extension or page interruption", updatedAt: new Date().toISOString() } : item) };
}

async function getSession(tabId) {
  const sessions = await getSessions(); const key = String(tabId); const current = sessions[key] || null; const reconciled = reconcileSession(current);
  if (reconciled !== current) { sessions[key] = reconciled; await saveSessions(sessions); }
  return reconciled;
}

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
    skipSensitive: payload.skipSensitive !== false, redactSensitive: payload.redactSensitive === true, safeMode: payload.safeMode !== false, fullPage: payload.fullPage === true,
    customLabels: String(payload.customLabels || "").split(",").map((x) => x.trim()).filter(Boolean), retentionDays: Number(payload.retentionDays || 0),
    allowedOrigin: payload.allowedOrigin || "", startedAt: new Date().toISOString(),
    reviewAfter: Number(payload.retentionDays || 0) ? new Date(Date.now() + Number(payload.retentionDays) * 86400000).toISOString() : "",
    captureCount: 0, events: [], transactions: [], blockedReason: ""
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

async function beginTransaction(tabId, payload) {
  const now = new Date().toISOString();
  const transaction = { id: payload.transactionId, state: "frozen", createdAt: now, updatedAt: now, beforeFingerprint: payload.beforeFingerprint || "", actionLabel: payload.actionLabel || "Next", confidence: payload.confidence || 0 };
  const session = await updateSession(tabId, (current) => current?.blockedReason ? current : ({ ...current, transactions: [...(current.transactions || []), transaction] }));
  return session?.blockedReason ? { ok: false, blocked: true, reason: session.blockedReason, session } : { ok: true, session };
}

async function setTransactionState(tabId, transactionId, state, extra = {}) {
  return updateSession(tabId, (session) => ({ ...session, transactions: (session.transactions || []).map((item) => item.id === transactionId ? { ...item, state, updatedAt: new Date().toISOString(), ...extra } : item) }));
}

async function validateScreenshot(dataUrl) {
  if (!String(dataUrl || "").startsWith("data:image/")) return { ok: false, reason: "The browser did not return an image." };
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") return { ok: true, mode: "download-confirmed" };
  try {
    const source = await createImageBitmap(await (await fetch(dataUrl)).blob()); const width = source.width; const height = source.height;
    if (width < 200 || height < 120) { source.close(); return { ok: false, reason: "The screenshot dimensions were unexpectedly small." }; }
    const canvas = new OffscreenCanvas(24, 16); const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(source, 0, 0, 24, 16); source.close();
    const pixels = context.getImageData(0, 0, 24, 16).data; let min = 255, max = 0;
    for (let i = 0; i < pixels.length; i += 4) { const light = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; min = Math.min(min, light); max = Math.max(max, light); }
    return max - min < 3 ? { ok: false, reason: "The screenshot appears blank." } : { ok: true, mode: "pixel-validated", width, height, luminanceRange: Math.round(max - min) };
  } catch { return { ok: false, reason: "The screenshot image could not be decoded." }; }
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

  const duplicateKey = `${payload.url || tab.url || ""}|${payload.pageLabel || payload.title || tab.title || ""}`;
  const lastSaved = [...(session.events || [])].reverse().find((event) => event.status === "saved");
  if (lastSaved?.duplicateKey === duplicateKey && Date.now() - new Date(lastSaved.at).getTime() < 5000) {
    return { ok: true, duplicate: true, record: lastSaved, session };
  }

  try {
    if (payload.transactionId) await setTransactionState(tabId, payload.transactionId, "capturing");
    let dataUrl = payload.dataUrl || await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const redacted = Boolean(payload.sensitive && session.redactSensitive && payload.sensitiveRects?.length);
    if (redacted) dataUrl = await redactDetectedFields(dataUrl, payload.sensitiveRects, payload.viewport);
    const validation = await validateScreenshot(dataUrl);
    if (!validation.ok) throw new Error(validation.reason);
    const number = session.captureCount + 1;
    const pageLabel = cleanSegment(payload.pageLabel || payload.title || tab.title, "Page");
    const folder = sessionFolder(session);
    const filename = `${folder}/${String(number).padStart(3, "0")}_${pageLabel}_${timestamp()}.png`;
    const downloadId = await chrome.downloads.download({ url: dataUrl, filename, conflictAction: "uniquify", saveAs: false });
    const verified = await verifyDownload(downloadId);
    if (!verified) throw new Error("Chrome did not confirm the screenshot download.");
    const preview = await createThumbnail(dataUrl);
    const record = { status: "saved", number, pageLabel, title: payload.title || tab.title || pageLabel, url: payload.url || tab.url || "", filename, downloadId, duplicateKey, fullPage: Boolean(payload.dataUrl), redacted, preview, transactionId: payload.transactionId || "", transition: "pending", confidence: payload.confidence || 0, fingerprint: payload.fingerprint || "", validation };
    const updated = await updateSession(tabId, (s) => ({ ...addEvent(s, record), captureCount: number }));
    if (payload.transactionId) await setTransactionState(tabId, payload.transactionId, "stored", { validation });
    return { ok: true, record, session: payload.transactionId ? await getSession(tabId) : updated };
  } catch (error) {
    const reason = error?.message || "Screenshot capture failed.";
    const updated = await updateSession(tabId, (s) => addEvent(s, { status: "failed", pageLabel: payload.pageLabel, url: payload.url, reason }));
    return { ok: false, reason, session: updated };
  }
}

async function verifyDownload(downloadId) {
  if (!chrome.downloads.search) return true;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [item] = await chrome.downloads.search({ id: downloadId });
    if (item?.state === "complete" && Number(item.fileSize || item.totalBytes || 0) > 0) return true;
    if (item?.state === "interrupted") return false;
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  const [item] = await chrome.downloads.search({ id: downloadId });
  return Boolean(item && item.state !== "interrupted");
}

async function confirmTransition(tabId, payload) {
  const confirmed = Boolean(payload.changed && Number(payload.signalCount || 0) >= 2);
  const updated = await updateSession(tabId, (session) => ({
    ...session,
    blockedReason: confirmed ? "" : "The page change could not be verified. Review the current page before resuming.",
    lastConfirmedFingerprint: payload.afterFingerprint || session.lastConfirmedFingerprint || "",
    transactions: (session.transactions || []).map((item) => item.id === payload.transactionId ? ({ ...item, state: confirmed ? "confirmed" : "anomaly", signals: payload.signals || {}, updatedAt: new Date().toISOString() }) : item),
    events: (session.events || []).map((event) => event.transactionId === payload.transactionId ? ({ ...event, transition: confirmed ? "confirmed" : "not-confirmed", transitionSignals: payload.signals || {}, transitionConfirmedAt: new Date().toISOString(), afterFingerprint: payload.afterFingerprint || "" }) : event)
  }));
  return { ok: confirmed, blocked: !confirmed, reason: updated.blockedReason, session: updated };
}

async function releaseTransaction(tabId, payload) { return { ok: true, session: await setTransactionState(tabId, payload.transactionId, "released") }; }
async function resolveAnomaly(tabId) { const session = await updateSession(tabId, (current) => ({ ...current, blockedReason: "" })); await notifyTab(tabId, session); return { ok: true, session }; }

async function resetSession(tabId) {
  const sessions = await getSessions();
  delete sessions[String(tabId)];
  await saveSessions(sessions);
  await notifyTab(tabId, null);
  return null;
}

async function openSessionFolder(tabId) {
  const session = await getSession(tabId);
  const lastSaved = [...(session?.events || [])].reverse().find((event) => event.status === "saved" && event.downloadId);
  if (!lastSaved) return { ok: false, reason: "Capture at least one page first." };
  chrome.downloads.show(lastSaved.downloadId);
  return { ok: true };
}

async function removeCapture(tabId, eventId) {
  const session = await getSession(tabId);
  const event = (session?.events || []).find((item) => item.id === eventId);
  if (!event || event.status !== "saved" || !event.downloadId) return { ok: false, reason: "That screenshot is no longer available." };
  try { await chrome.downloads.removeFile(event.downloadId); }
  catch (error) { return { ok: false, reason: error?.message || "The screenshot file could not be removed." }; }
  const updated = await updateSession(tabId, (current) => ({
    ...current,
    events: (current.events || []).map((item) => item.id === eventId ? ({ ...item, status: "removed", removedAt: new Date().toISOString(), preview: "" }) : item)
  }));
  return { ok: true, session: updated };
}

async function exportSummary(tabId) {
  const session = await getSession(tabId);
  if (!session) return { ok: false, reason: "No session was found." };
  const escape = (value) => String(value || "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character]));
  const rows = (session.events || []).map((event) => `<tr><td>${escape(event.number || "-")}</td><td>${escape(event.pageLabel || "Page")}</td><td>${escape(event.status)}</td><td>${escape(event.at)}</td><td>${escape(event.url)}</td></tr>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>${escape(session.caseLabel)} capture summary</title><style>body{font:14px Arial,sans-serif;margin:40px;color:#17243b}h1{margin-bottom:4px}p{color:#536174}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;border-bottom:1px solid #ccd5df;padding:10px;vertical-align:top}th{background:#eef3f8}</style><h1>${escape(session.caseLabel)}</h1><p>${escape(session.jurisdiction)} · ${escape(session.licenseType)} · Started ${escape(session.startedAt)}</p><table><thead><tr><th>#</th><th>Page</th><th>Status</th><th>Time</th><th>URL</th></tr></thead><tbody>${rows}</tbody></table>`;
  const url = `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`;
  const filename = `${sessionFolder(session)}/session-summary.html`;
  const downloadId = await chrome.downloads.download({ url, filename, conflictAction: "uniquify", saveAs: false });
  return { ok: true, downloadId, filename };
}

async function exportLedger(tabId) {
  const session = await getSession(tabId);
  if (!session) return { ok: false, reason: "No session was found." };
  const bytes = new TextEncoder().encode(JSON.stringify(session, null, 2));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const url = `data:application/json;base64,${btoa(binary)}`;
  const filename = `${sessionFolder(session)}/capture-ledger-${timestamp()}.json`;
  const downloadId = await chrome.downloads.download({ url, filename, conflictAction: "uniquify", saveAs: false });
  return { ok: true, downloadId, filename };
}

async function exportSupportReport(tabId) {
  const session = await getSession(tabId);
  if (!session) return { ok: false, reason: "No session was found." };
  const report = {
    reportVersion: 1,
    extensionVersion: chrome.runtime.getManifest().version,
    generatedAt: new Date().toISOString(),
    browser: navigator.userAgent,
    portalOrigin: session.allowedOrigin,
    captureMode: session.fullPage ? "full-page" : "visible-area",
    safeguards: { skipSensitive: session.skipSensitive, safeMode: session.safeMode },
    customLabels: session.customLabels,
    events: (session.events || []).map(({ status, pageLabel, reason, at, fullPage }) => ({ status, pageLabel, reason, at, fullPage: Boolean(fullPage) })),
    privacyNote: "Form values, screenshots, case labels, filenames, and full URLs are intentionally excluded."
  };
  const bytes = new TextEncoder().encode(JSON.stringify(report, null, 2)); let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const downloadId = await chrome.downloads.download({ url: `data:application/json;base64,${btoa(binary)}`, filename: `Page-Capture-support-${timestamp()}.json`, conflictAction: "uniquify", saveAs: true });
  return { ok: true, downloadId };
}

async function addNote(tabId, note) {
  const value = String(note || "").trim().slice(0, 160); if (!value) return { ok: false, reason: "Enter a note first." };
  const session = await updateSession(tabId, (current) => addEvent(current, { status: "note", pageLabel: "Session note", note: value }));
  return { ok: true, session };
}

async function exportReadinessReport(tabId) {
  const session = await getSession(tabId); if (!session) return { ok: false, reason: "No session was found." };
  const events = session.events || []; const saved = events.filter((event) => event.status === "saved"); const skipped = events.filter((event) => event.status === "skipped"); const issues = events.filter((event) => ["failed", "blocked"].includes(event.status)); const confirmed = saved.filter((event) => event.transition === "confirmed");
  const score = Math.max(0, Math.min(100, Math.round((saved.length ? confirmed.length / saved.length : 0) * 65 + (issues.length ? 0 : 25) + (saved.length ? 10 : 0)))); const level = score >= 85 ? "High" : score >= 60 ? "Medium" : "Needs review";
  const escape = (value) => String(value || "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character]));
  const rows = events.map((event) => `<tr><td>${escape(event.pageLabel || "Page")}</td><td>${escape(event.status)}</td><td>${escape(event.transition || "-")}</td><td>${escape(event.note || event.reason || (event.redacted ? "Detected fields redacted" : ""))}</td></tr>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>${escape(session.caseLabel)} pilot readiness</title><style>body{font:14px Arial;margin:40px;color:#10233d}header{border-bottom:4px solid #1768e5;padding-bottom:20px}.score{font-size:52px;color:#1768e5}section{margin:28px 0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metrics div{border:1px solid #ccd7e4;padding:14px}.metrics b{display:block;font-size:24px}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #d7e0ea;text-align:left}@media print{button{display:none}}</style><header><p>PAGE CAPTURE · PILOT READINESS</p><h1>${escape(session.caseLabel)}</h1><div class="score">${score}% · ${level}</div><p>${escape(session.jurisdiction)} · ${escape(session.licenseType)} · ${escape(session.allowedOrigin)}</p></header><section class="metrics"><div><b>${saved.length}</b>saved</div><div><b>${confirmed.length}</b>transitions confirmed</div><div><b>${skipped.length}</b>sensitive pages skipped</div><div><b>${issues.length}</b>issues</div></section><section><h2>How to use this report</h2><p>Review every issue and skipped page. Re-run the Test Lab or portal test after changing settings. Choose Print in your browser to save this report as a PDF.</p><button onclick="print()">Print or save PDF</button></section><table><thead><tr><th>Page or note</th><th>Status</th><th>Transition</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table>`;
  const url = `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`; const filename = `${sessionFolder(session)}/pilot-readiness-report.html`; const downloadId = await chrome.downloads.download({ url, filename, conflictAction: "uniquify", saveAs: false }); return { ok: true, downloadId, filename, score, level };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const tabId = Number(message?.tabId ?? sender.tab?.id);
    switch (message?.type) {
      case "GET_SESSION": return { ok: true, session: await getSession(tabId) };
      case "START_SESSION": return { ok: true, session: await startSession(message.payload) };
      case "STOP_SESSION": return { ok: true, session: await stopSession(tabId) };
      case "RESET_SESSION": return { ok: true, session: await resetSession(tabId) };
      case "CAPTURE_PAGE": return capturePage(sender.tab, message.payload || {});
      case "BEGIN_TRANSACTION": return beginTransaction(tabId, message.payload || {});
      case "RELEASE_TRANSACTION": return releaseTransaction(tabId, message.payload || {});
      case "CONFIRM_TRANSITION": return confirmTransition(tabId, message.payload || {});
      case "RESOLVE_ANOMALY": return resolveAnomaly(tabId);
      case "CAPTURE_VIEWPORT": return { ok: true, dataUrl: await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }) };
      case "EXPORT_LEDGER": return exportLedger(tabId);
      case "EXPORT_SUMMARY": return exportSummary(tabId);
      case "EXPORT_SUPPORT": return exportSupportReport(tabId);
      case "EXPORT_READINESS": return exportReadinessReport(tabId);
      case "ADD_NOTE": return addNote(tabId, message.note);
      case "OPEN_SESSION_FOLDER": return openSessionFolder(tabId);
      case "REMOVE_CAPTURE": return removeCapture(tabId, message.eventId);
      default: return { ok: false, reason: "Unknown request." };
    }
  })().then(sendResponse).catch((error) => sendResponse({ ok: false, reason: error?.message || "Unexpected extension error." }));
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await getSession(tabId);
  if (session?.active) await updateSession(tabId, (s) => ({ ...s, active: false, stoppedAt: new Date().toISOString(), stopReason: "Tab closed" }));
});
