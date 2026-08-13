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

  return { DEFAULT_LABELS, SENSITIVE_TERMS, normalize, actionMatches, containsSensitive, cleanSegment };
});
