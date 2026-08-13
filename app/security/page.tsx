import Link from "next/link";

export default function Security() {
  return <main className="doc-page">
    <Link className="brand" href="/"><span className="brand-mark"><i /></span><span><strong>Page Capture</strong><small>Return home</small></span></Link>
    <p className="updated">Security model · v0.4</p><h1>Security</h1>
    <p>Page Capture is a developer preview for controlled pilots. It never enters answers, bypasses authentication, or submits applications.</p>
    <h2>Permissions explained</h2><ul><li><strong>activeTab and tabs:</strong> isolate each application session.</li><li><strong>downloads:</strong> save screenshots and session records.</li><li><strong>storage:</strong> recover interrupted sessions and remember portal controls.</li><li><strong>website access:</strong> detect navigation controls. Each session locks to its starting domain.</li></ul>
    <h2>Full-page capture</h2><p>Optional entire-page mode scrolls and stitches visible sections. It does not request Chrome debugger permission.</p>
    <h2>Safety controls</h2><p>Safe mode stops navigation if capture fails. Sensitive-screen pause omits recognizable protected screens. Domain locking blocks capture after an unexpected origin change.</p>
    <h2>Report a concern</h2><p>Use GitHub without including provider information, screenshots, credentials, or application data.</p>
  </main>;
}
