const SESSION_KEY = "captureSession";

function cleanSegment(value, fallback = "Untitled") {
  const cleaned = String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 70);
  return cleaned || fallback;
}

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function getSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return result[SESSION_KEY] || null;
}

async function saveSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

async function tellTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

async function broadcastState(session) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => tab.id ? tellTab(tab.id, {
    type: "SESSION_STATE",
    session
  }) : null));
}

async function startSession(payload) {
  const now = new Date().toISOString();
  const session = {
    active: true,
    caseLabel: payload.caseLabel.trim(),
    jurisdiction: payload.jurisdiction.trim(),
    licenseType: payload.licenseType.trim(),
    skipSensitive: payload.skipSensitive !== false,
    startedAt: now,
    captureCount: 0,
    captures: [],
    skipped: []
  };
  await saveSession(session);
  await broadcastState(session);
  return session;
}

async function stopSession() {
  const session = await getSession();
  if (!session) return null;
  session.active = false;
  session.stoppedAt = new Date().toISOString();
  await saveSession(session);
  await broadcastState(session);
  return session;
}

async function capturePage(sender, payload) {
  const session = await getSession();
  if (!session?.active) {
    return { ok: false, reason: "No capture session is active." };
  }

  const tab = sender.tab;
  if (!tab?.id || typeof tab.windowId !== "number") {
    return { ok: false, reason: "The current tab is unavailable." };
  }

  if (payload.sensitive && session.skipSensitive && !payload.force) {
    const skipped = {
      at: new Date().toISOString(),
      title: payload.title || tab.title || "Sensitive page",
      url: payload.url || tab.url || "",
      reason: payload.sensitiveReason || "Sensitive fields detected"
    };
    session.skipped.push(skipped);
    await saveSession(session);
    return { ok: false, skipped: true, reason: skipped.reason, session };
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const nextNumber = session.captureCount + 1;
    const pageNumber = String(nextNumber).padStart(3, "0");
    const pageLabel = cleanSegment(payload.pageLabel || payload.title || tab.title, "Page");
    const folder = [
      "License Page Captures",
      cleanSegment(session.caseLabel, "Case"),
      `${cleanSegment(session.jurisdiction, "Jurisdiction")}_${cleanSegment(session.licenseType, "License")}`
    ].join("/");
    const filename = `${folder}/${pageNumber}_${pageLabel}_${timestamp()}.png`;
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename,
      conflictAction: "uniquify",
      saveAs: false
    });

    const record = {
      number: nextNumber,
      at: new Date().toISOString(),
      title: payload.title || tab.title || pageLabel,
      pageLabel,
      url: payload.url || tab.url || "",
      filename,
      downloadId
    };
    session.captureCount = nextNumber;
    session.captures.push(record);
    await saveSession(session);
    return { ok: true, record, session };
  } catch (error) {
    return { ok: false, reason: error?.message || "Screenshot capture failed." };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const work = (async () => {
    switch (message?.type) {
      case "GET_SESSION":
        return { ok: true, session: await getSession() };
      case "START_SESSION":
        return { ok: true, session: await startSession(message.payload) };
      case "STOP_SESSION":
        return { ok: true, session: await stopSession() };
      case "CAPTURE_PAGE":
        return capturePage(sender, message.payload || {});
      default:
        return { ok: false, reason: "Unknown request." };
    }
  })();
  work.then(sendResponse).catch((error) => sendResponse({
    ok: false,
    reason: error?.message || "Unexpected extension error."
  }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(SESSION_KEY).then((result) => {
    if (!result[SESSION_KEY]) {
      chrome.storage.local.set({ [SESSION_KEY]: null });
    }
  });
});
