import Link from "next/link";

export default function Privacy() {
  return <main className="doc-page">
    <Link className="brand" href="/"><span className="brand-mark"><i /></span><span><strong>Page Capture</strong><small>Return home</small></span></Link>
    <p className="updated">Updated August 13, 2026</p><h1>Privacy</h1>
    <p>Page Capture works without accounts, analytics, advertising, or remote storage. It captures only after a user starts a session.</p>
    <h2>Where files go</h2><p>Images and session records go to the browser&apos;s configured Downloads location. The extension does not upload them. The browser, OneDrive, backup software, or an employer-managed device may independently synchronize that folder.</p>
    <h2>What is handled</h2><p>The extension handles website content in screenshots, portal origins and page URLs, test labels, jurisdiction, license type, timestamps, filenames, and capture outcomes. This information stays on the user&apos;s device in Downloads or Chrome local extension storage to provide capture, review, and session recovery.</p>
    <h2>Sharing and access</h2><p>No extension data is transmitted to the developer or shared with third parties. The developer cannot read captured pages or session records. Page Capture does not sell data or use it for advertising, credit decisions, or unrelated purposes.</p>
    <h2>Retention and deletion</h2><p>Chrome retains local session state until the user starts another test, removes the extension, or clears extension data. Downloaded files remain under the user&apos;s control. Individual screenshots can be removed from the completed-test review screen.</p>
    <h2>Sensitive screens</h2><p>Recognizable password, SSN, payment, verification-code, bank, and identity-document fields are skipped by default. Detection reduces risk but cannot guarantee that every sensitive field will be recognized.</p>
    <h2>Limited Use</h2><p>Page Capture&apos;s use of information is limited to its disclosed screenshot-recording purpose and complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.</p>
    <h2>Recommended use</h2><ul><li>Use case identifiers rather than provider names.</li><li>Keep Downloads in an approved protected location.</li><li>Test every new portal before production use.</li><li>Follow organizational retention and deletion requirements.</li></ul>
  </main>;
}
