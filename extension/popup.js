const setupView = document.getElementById("setupView");
const activeView = document.getElementById("activeView");
const sessionForm = document.getElementById("sessionForm");
const statusChip = document.getElementById("statusChip");
const feedback = document.getElementById("feedback");

async function message(payload) {
  return chrome.runtime.sendMessage(payload);
}

function render(session) {
  const active = Boolean(session?.active);
  setupView.hidden = active;
  activeView.hidden = !active;
  statusChip.textContent = active ? "Recording" : "Off";
  statusChip.classList.toggle("active", active);
  if (!active) return;

  document.getElementById("activeCase").textContent = session.caseLabel;
  document.getElementById("activeMeta").textContent = `${session.jurisdiction} · ${session.licenseType}`;
  document.getElementById("captureCount").textContent = session.captureCount;
  const sequence = document.getElementById("sequence");
  sequence.replaceChildren(...session.captures.slice(-30).map((capture) => {
    const dot = document.createElement("span");
    dot.className = "page-dot";
    dot.textContent = String(capture.number).padStart(2, "0");
    dot.title = capture.pageLabel;
    return dot;
  }));
  document.getElementById("emptyState").hidden = session.captureCount > 0;
}

function setFeedback(text, tone = "") {
  feedback.textContent = text;
  feedback.className = `feedback ${tone}`.trim();
}

sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await message({
    type: "START_SESSION",
    payload: {
      caseLabel: document.getElementById("caseLabel").value,
      jurisdiction: document.getElementById("jurisdiction").value,
      licenseType: document.getElementById("licenseType").value,
      skipSensitive: document.getElementById("skipSensitive").checked
    }
  });
  if (response?.ok) render(response.session);
});

document.getElementById("stopSession").addEventListener("click", async () => {
  const response = await message({ type: "STOP_SESSION" });
  render(response?.session);
});

document.getElementById("captureNow").addEventListener("click", async () => {
  setFeedback("Saving this page…");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setFeedback("The active page is unavailable.", "error");
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_CURRENT", force: false });
    if (response?.ok) {
      render(response.session);
      setFeedback(`Page ${response.record.number} saved.`);
    } else if (response?.skipped) {
      setFeedback(`Paused: ${response.reason}.`, "warning");
    } else {
      setFeedback(response?.reason || "This page could not be saved.", "error");
    }
  } catch {
    setFeedback("Reload this page, then try again.", "error");
  }
});

message({ type: "GET_SESSION" }).then((response) => render(response?.session));
