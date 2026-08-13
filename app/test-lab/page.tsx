import Link from "next/link";
import { CaptureDemo } from "../CaptureDemo";

export const metadata = {
  title: "Page Capture Test Lab — No-login template forms",
  description: "Test Page Capture with fictional licensing, credentialing, and insurance template forms.",
};

export default function TestLab() {
  return <main className="test-lab-page">
    <nav className="nav-shell lab-nav" aria-label="Main navigation">
      <Link className="brand" href="/" aria-label="Page Capture home"><span className="brand-mark" aria-hidden="true"><i /></span><span><strong>Page Capture</strong><small>for licensing applications</small></span></Link>
      <div className="nav-links"><Link href="/">Home</Link><a className="active-tab" href="#forms">Test lab</a><a className="nav-cta" href="/license-page-capture-v0.5.0.zip" download>Download v0.5</a></div>
    </nav>

    <header className="lab-hero">
      <div><p className="kicker"><span>●</span> Safe testing workspace</p><h1>Put every capture mode<br /><em>through its paces.</em></h1><p>Use fictional, multi-page forms to verify automatic capture, full-page stitching, varied navigation labels, sensitive-screen skipping, and the completion review.</p></div>
      <ol className="lab-checklist"><li><span>1</span><div><strong>Start Page Capture</strong><small>Name the test and choose visible-area or full-page mode.</small></div></li><li><span>2</span><div><strong>Choose a template</strong><small>Licensing, credentialing, or insurance enrollment.</small></div></li><li><span>3</span><div><strong>Advance every page</strong><small>Compare the extension record with the expected record.</small></div></li></ol>
    </header>

    <section className="lab-workbench" id="forms">
      <div className="lab-heading"><p className="overline">Template forms</p><h2>Choose a workflow and start testing.</h2><p>Everything shown here is invented for testing. The forms do not send, save, or submit their contents.</p></div>
      <CaptureDemo />
    </section>

    <section className="lab-results"><div><p className="overline light">What success looks like</p><h2>A complete record without a missed page.</h2></div><ul><li>Each ordinary step creates one screenshot</li><li>Long pages produce a readable full-page image</li><li>The verification or payment step is skipped</li><li>Finishing the test shows thumbnails and totals</li><li>Removing a screenshot deletes its local file</li></ul></section>

    <footer className="site-footer"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /></span><span><strong>Page Capture</strong><small>Test lab · fictional data only</small></span></div><p>No information on this page is submitted.</p><div><Link href="/privacy">Privacy</Link><Link href="/security">Security</Link><Link href="/">Home</Link></div></footer>
  </main>;
}
