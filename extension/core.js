(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PageCaptureCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_LABELS = [
    "next", "continue", "proceed", "review", "review and continue",
    "save and next", "save & next", "save and continue", "save & continue",
    "save and proceed", "save & proceed", "continue application", "next step"
  ];

  const SENSITIVE_TERMS = [
    "password", "passcode", "one time code", "verification code", "security answer",
    "social security", "ssn", "credit card", "card number", "cvv", "cvc",
    "payment", "bank account", "routing number", "identity document"
  ];

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[→›»]/g, "").replace(/\s+/g, " ").trim();
  }

  function actionMatches(value, customLabels = []) {
    const text = normalize(value);
    if (!text) return false;
    const labels = [...DEFAULT_LABELS, ...customLabels.map(normalize)].filter(Boolean);
    return labels.some((label) => text === label || text.startsWith(`${label} `));
  }

  function containsSensitive(value) {
    const text = normalize(value).replace(/[-_]/g, " ");
    return SENSITIVE_TERMS.find((term) => text.includes(term)) || "";
  }

  function cleanSegment(value, fallback = "Untitled") {
    const cleaned = String(value || "").normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-")
      .replace(/^[-_.]+|[-_.]+$/g, "").slice(0, 70);
    return cleaned || fallback;
  }

  function navigationConfidence({ recognizedAction = false, knownPortal = false, formPresent = false, sensitive = false, inaccessibleFrames = 0 } = {}) {
    let score = 25;
    if (recognizedAction) score += 35;
    if (knownPortal) score += 15;
    if (formPresent) score += 15;
    if (sensitive) score -= 10;
    score -= Math.min(30, Number(inaccessibleFrames || 0) * 15);
    return Math.max(0, Math.min(100, score));
  }

  function pageFingerprint({ url = "", title = "", heading = "", formCount = 0, textLength = 0 } = {}) {
    const source = [url, title, heading, formCount, Math.round(Number(textLength || 0) / 100) * 100].join("|");
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16);
  }

  return { DEFAULT_LABELS, SENSITIVE_TERMS, normalize, actionMatches, containsSensitive, cleanSegment, navigationConfidence, pageFingerprint };
});
