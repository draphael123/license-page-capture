const steps = [
  {
    number: "01",
    title: "Start a case",
    text: "Add a non-sensitive case label, state, and license type. Recording begins only when you choose Start capturing.",
  },
  {
    number: "02",
    title: "Complete the page",
    text: "Work in the licensing portal normally. Page Capture watches for common Next, Continue, Proceed, Review, and Save controls.",
  },
  {
    number: "03",
    title: "Move forward",
    text: "Before the portal advances, the visible page is saved, numbered, and placed in the application’s local folder.",
  },
  {
    number: "04",
    title: "Review the record",
    text: "The capture ledger shows the sequence at a glance. Finish the session when the application is complete.",
  },
];

const safeguards = [
  "No cloud uploads",
  "No application submission",
  "No answers changed",
  "Sensitive-screen pause",
  "Explicit session start",
  "Case-based folders",
];

const faq = [
  {
    question: "Does it capture the whole scrolling page?",
    answer:
      "Visible-area capture is the fast default. Optional entire-page mode scrolls and stitches long pages without requesting Chrome debugger access.",
  },
  {
    question: "Where do screenshots go?",
    answer:
      "They stay on your computer under Downloads › License Page Captures › case › state and license. The extension does not transmit them anywhere.",
  },
  {
    question: "What happens on a sensitive screen?",
    answer:
      "With the default safeguard enabled, automatic capture pauses when recognizable password, SSN, payment, or verification-code fields are present.",
  },
  {
    question: "Will every licensing portal work immediately?",
    answer:
      "Common text-based navigation works out of the box. A portal with icon-only or heavily customized controls may need a small site-specific rule.",
  },
];

function CaptureStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`capture-strip ${compact ? "compact" : ""}`} aria-label="Example sequence of captured pages">
      {["Profile", "Education", "Licenses", "Review"].map((label, index) => (
        <div className="capture-page" key={label}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <i aria-hidden="true" />
          <strong>{label}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <nav className="nav-shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Page Capture home">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span><strong>Page Capture</strong><small>for licensing applications</small></span>
        </a>
        <div className="nav-links">
          <a href="/product">Product</a>
          <a href="/test-lab">Test Lab</a>
          <a href="/compatibility">Compatibility</a>
          <a href="/help">Help</a>
          <a className="nav-cta" href="/download">Download v0.9</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span>●</span> Developer preview · pilot before production use</p>
          <h1>Every page.<br /><em>Already captured.</em></h1>
          <p className="hero-text">
            Page Capture saves a screenshot just before you advance through a licensing application—so your audit trail builds itself while you work.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/download">Download v0.9 <span>↓</span></a>
            <a className="button text-button" href="#install">See installation <span>↘</span></a>
          </div>
          <p className="compatibility">Chrome and Microsoft Edge · Updated August 13, 2026</p>
        </div>

        <div className="hero-demo" aria-label="Illustration of Page Capture in use">
          <div className="browser-frame">
            <div className="browser-bar"><i /><i /><i /><span>licensing.portal.gov/application/education</span></div>
            <div className="portal-page">
              <div className="portal-header"><span>STATE LICENSING PORTAL</span><b>Application 3 of 6</b></div>
              <h2>Education history</h2>
              <div className="mock-label">Institution</div><div className="mock-field">University of Example</div>
              <div className="mock-row"><div><div className="mock-label">Degree</div><div className="mock-field">Bachelor of Science</div></div><div><div className="mock-label">Graduation year</div><div className="mock-field">2020</div></div></div>
              <div className="mock-actions"><span>Back</span><strong>Next →</strong></div>
              <div className="capture-toast"><span>✓</span><div><strong>Page 03 saved</strong><small>Education history</small></div></div>
            </div>
          </div>
          <CaptureStrip compact />
        </div>
      </section>

      <section className="test-lab-teaser">
        <div><p className="overline">Capture test lab</p><h2>Test it before<br />you trust it.</h2></div>
        <div><p>Open a dedicated workspace with licensing, credentialing, and insurance template forms. No login, submissions, or real personal information.</p><a className="button primary" href="/test-lab">Open the test lab <span>→</span></a></div>
      </section>

      <section className="proof-band" aria-label="Product highlights">
        <div><strong>01</strong><span>Works while<br />you work</span></div>
        <div><strong>02</strong><span>Numbered<br />automatically</span></div>
        <div><strong>03</strong><span>Stored only<br />on your device</span></div>
        <div><strong>04</strong><span>Built for<br />licensing teams</span></div>
      </section>

      <section className="section how" id="how-it-works">
        <div className="section-heading">
          <p className="overline">How it works</p>
          <h2>Four steps.<br />No extra work.</h2>
          <p>The extension sits quietly in the browser until a capture session begins.</p>
        </div>
        <div className="steps">
          {steps.map((step) => (
            <article className="step" key={step.number}>
              <span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="ledger-section">
        <div className="ledger-copy">
          <p className="overline">The capture ledger</p>
          <h2>Know what was saved before you leave the page.</h2>
          <p>Each successful capture appears in sequence. Duplicate clicks are ignored, portal controls are remembered, and a readable session summary is created beside the screenshots.</p>
        </div>
        <CaptureStrip />
      </section>

      <section className="section privacy" id="privacy">
        <div className="privacy-card">
          <div className="privacy-copy">
            <p className="overline light">Privacy by default</p>
            <h2>Screenshots stay<br />on this computer.</h2>
            <p>Page Capture performs no analytics or remote transmission. Files go to your browser’s Downloads location, which may itself be synchronized by OneDrive or another service.</p>
          </div>
          <div className="safeguards">
            {safeguards.map((item) => <div key={item}><span>✓</span>{item}</div>)}
          </div>
          <p className="privacy-note"><strong>Important:</strong> Sensitive-screen detection is a safeguard, not a guarantee. Review each portal’s data-handling requirements before use.</p>
        </div>
      </section>

      <section className="section install" id="install">
        <div className="section-heading">
          <p className="overline">Install the preview</p>
          <h2>Ready in about<br />two minutes.</h2>
          <p>This developer preview is installed directly in Chrome or Edge. Store distribution can follow after the pilot.</p>
        </div>
        <ol className="install-list">
          <li><span>1</span><div><strong>Download and unzip</strong><p>Download the extension package and extract the folder somewhere you can keep it.</p></div></li>
          <li><span>2</span><div><strong>Open extensions</strong><p>Visit <code>chrome://extensions</code> or <code>edge://extensions</code>, then enable Developer mode.</p></div></li>
          <li><span>3</span><div><strong>Load the folder</strong><p>Choose Load unpacked and select the extracted extension folder.</p></div></li>
          <li><span>4</span><div><strong>Start a pilot</strong><p>Reload the licensing portal, open Page Capture, create a case, and work normally.</p></div></li>
        </ol>
        <a className="button primary download-wide" href="/download">Download Page Capture v0.9 <span>↓</span></a>
      </section>

      <section className="section faq" id="faq">
        <div className="section-heading"><p className="overline">Good to know</p><h2>Before the first pilot.</h2></div>
        <div className="faq-list">
          {faq.map((item) => <details key={item.question}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}
        </div>
      </section>

      <section className="closing">
        <p className="overline light">A cleaner application record</p>
        <h2>Stop stopping<br />to take screenshots.</h2>
        <a className="button inverse" href="/download">Start with v0.9 <span>→</span></a>
      </section>

      <footer className="site-footer">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /></span><span><strong>Page Capture</strong><small>Developer preview · v0.9.0</small></span></div>
        <p>Local-first tooling for licensing operations.</p>
        <div><a href="/privacy">Privacy</a><a href="/security">Security</a><a href="/changelog">Changelog</a><a href="https://github.com/draphael123/license-page-capture/issues/new?template=portal.yml">Report issue</a><a href="https://github.com/draphael123/license-page-capture">Source</a></div>
      </footer>
    </main>
  );
}
