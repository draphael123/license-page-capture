import Link from "next/link";

export default function Changelog() {
  return <main className="doc-page">
    <Link className="brand" href="/"><span className="brand-mark"><i /></span><span><strong>Page Capture</strong><small>Return home</small></span></Link>
    <p className="updated">Release history</p><h1>Changelog</h1>
    <h2>v0.7.0 — August 13, 2026</h2>
    <ul><li>Preflight checks for page access, sensitive fields, and detectable navigation controls.</li><li>Privacy-safe diagnostic reports that omit form values, screenshots, case names, filenames, and full URLs.</li><li>Retention reminder preference and clearer session recovery.</li><li>Download checksum verification and expanded website reliability evidence.</li></ul>
    <h2>v0.6.0 — August 13, 2026</h2>
    <ul><li>Daily and on-demand update availability checks for unpacked installs.</li><li>Dedicated download and update guide.</li><li>Extension-state gallery, sticky Test Lab navigation, and public testing scorecard.</li></ul>
    <h2>v0.5.0 — August 13, 2026</h2>
    <ul><li>Individual screenshot removal with confirmation.</li><li>Chrome Web Store submission package and listing assets.</li><li>Expanded compatibility checks across public state licensing sites.</li></ul>
    <h2>v0.4.0 — August 13, 2026</h2>
    <ul><li>Clear setup, capturing, and completion stages.</li><li>Optional full-page scroll-and-stitch capture.</li><li>Thumbnail review with saved, skipped, and failed totals.</li><li>Simplified session actions and technical tools.</li></ul>
    <h2>v0.3.0 — August 13, 2026</h2>
    <ul><li>Duplicate prevention and better page naming.</li><li>Persistent capture status and portal-specific presets.</li><li>Session summaries and one-click access to saved screenshots.</li></ul>
    <h2>v0.2.0 — August 13, 2026</h2>
    <ul><li>Per-tab sessions and restart recovery.</li><li>Safe mode and application-domain locking.</li><li>Custom navigation labels and Enter-key support.</li><li>Saved, skipped, blocked, and failed ledger events.</li></ul>
    <h2>v0.1.0 — August 12, 2026</h2><p>Initial preview with visible-page capture, numbering, manual capture, and sensitive-field detection.</p>
  </main>;
}
