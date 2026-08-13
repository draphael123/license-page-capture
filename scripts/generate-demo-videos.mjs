import { chromium } from "file:///C:/Users/danie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const out = path.resolve("public/demos");
await fs.mkdir(out, { recursive: true });

const scenes = {
  overview: { title: "A complete application record, built as you work", subtitle: "Start a case. Complete the page. Move forward.", duration: 10500 },
  capture: { title: "Capture before the portal advances", subtitle: "The current page is verified, numbered, and saved first.", duration: 6500 },
  sensitive: { title: "Sensitive pages pause automatically", subtitle: "Passwords, payment fields, and verification codes stop automatic capture.", duration: 6500 },
  record: { title: "Leave with a readable evidence folder", subtitle: "Screenshots and a session summary stay together on your computer.", duration: 6500 },
  fullpage: { title: "Capture a long page from top to bottom", subtitle: "Entire-page mode scrolls, stitches, and verifies one continuous record.", duration: 6500 },
  duplicate: { title: "One page, one verified screenshot", subtitle: "Rapid repeat clicks are ignored before they can create duplicate evidence.", duration: 6500 },
  newsession: { title: "Every new test gets a clean folder", subtitle: "Start again with the same case label without mixing separate test runs.", duration: 6500 },
};

function studio(scene, key) {
  const isSensitive = key === "sensitive";
  const isRecord = key === "record";
  const isFullPage = key === "fullpage";
  const isDuplicate = key === "duplicate";
  const isNewSession = key === "newsession";
  const pageTitle = isSensitive ? "Identity verification" : isFullPage ? "Professional history · 4 sections" : isNewSession ? "New application test" : "Education history";
  const toastTitle = isDuplicate ? "Duplicate click ignored" : isFullPage ? "Entire page saved" : isNewSession ? "New session folder created" : "Page 03 saved";
  const toastDetail = isDuplicate ? "Existing capture kept · no extra file" : isFullPage ? "4 sections stitched · verified" : isNewSession ? "DEMO-0813 / session-02" : "Capture verified · 10:42 AM";
  return `<!doctype html><html><style>
  *{box-sizing:border-box}body{margin:0;background:#071d3f;color:#071d3f;font-family:Arial,sans-serif;overflow:hidden}.stage{width:1280px;height:720px;padding:46px 54px;background:radial-gradient(circle at 85% 15%,#174a8a 0,#071d3f 42%);position:relative}.eyebrow{color:#82adff;font:700 13px/1.2 monospace;letter-spacing:2px;text-transform:uppercase}.headline{color:white;font:700 39px/1.05 Georgia,serif;margin:12px 0 8px;max-width:760px}.subtitle{color:#b8c9e7;font-size:17px}.workspace{position:absolute;left:54px;right:54px;top:180px;bottom:46px;display:grid;grid-template-columns:1.65fr .8fr;gap:20px}.browser,.ledger{background:#f7f9fc;border:1px solid #88a5cf;box-shadow:0 24px 70px #020b1c99}.browser{border-radius:13px;overflow:hidden}.bar{height:43px;background:#e7edf6;display:flex;align-items:center;gap:7px;padding:0 16px}.dot{width:9px;height:9px;border-radius:50%;background:#94a4bc}.url{margin-left:8px;background:white;border-radius:5px;padding:7px 16px;width:78%;font:12px monospace;color:#65728a}.portal{padding:27px 32px;position:relative;height:100%;background:white}.portal-head{display:flex;justify-content:space-between;color:#557099;font:700 11px monospace;letter-spacing:1px}.portal h2{font:700 25px Georgia;margin:25px 0 22px}.label{font-size:11px;font-weight:bold;margin:13px 0 7px}.field{height:41px;border:1px solid #b8c6d8;border-radius:5px;padding:12px;color:#4e5d70}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.actions{position:absolute;bottom:27px;left:32px;right:32px;display:flex;justify-content:flex-end;gap:20px;align-items:center}.next{background:#1764dc;color:white;border-radius:5px;padding:13px 25px;font-weight:bold;animation:press 6.5s infinite}.ledger{border-radius:13px;padding:25px 23px;position:relative}.ledger h3{font:700 20px Georgia;margin:5px 0 7px}.ledger p{color:#687992;font-size:13px;margin:0 0 18px}.item{display:grid;grid-template-columns:35px 1fr 20px;align-items:center;border-top:1px solid #d7e0eb;padding:15px 0;opacity:.32;animation:appear 6.5s infinite}.item:nth-of-type(2){animation-delay:1s}.item:nth-of-type(3){animation-delay:2.2s}.item:nth-of-type(4){animation-delay:3.4s}.num{font:700 12px monospace;color:#3869a8}.check{color:#168957;font-weight:bold}.toast{position:absolute;right:25px;bottom:25px;background:#082b5d;color:white;padding:15px 18px;border-left:4px solid #58d69a;box-shadow:0 12px 35px #04152e66;animation:toast 6.5s infinite}.toast b{display:block}.toast small{color:#b9c8df}.shield{position:absolute;inset:0;background:#061b3edb;color:white;display:${isSensitive ? "grid" : "none"};place-content:center;text-align:center;animation:shield 6.5s infinite}.shield strong{font:700 27px Georgia}.shield span{color:#b9c8df;margin-top:8px}.folder{position:absolute;inset:0;background:#edf3fa;display:${isRecord ? "block" : "none"};padding:28px}.file{background:white;border:1px solid #ccd9e9;margin:10px 0;padding:12px 15px;display:flex;justify-content:space-between;font:13px monospace}.file span{color:#168957}.ai-label{position:absolute;right:54px;top:54px;color:#9eb5d8;border:1px solid #4d6d9d;padding:8px 11px;font:11px monospace;letter-spacing:1px}.progress{position:absolute;left:0;bottom:0;height:4px;background:#4a8bff;animation:progress 6.5s linear infinite}
  @keyframes press{0%,40%,55%,100%{transform:none}46%{transform:scale(.95);background:#0c4eaf}}@keyframes appear{0%,25%{opacity:.32}38%,100%{opacity:1}}@keyframes toast{0%,42%,90%,100%{opacity:0;transform:translateY(15px)}50%,82%{opacity:1;transform:none}}@keyframes shield{0%,16%,82%,100%{opacity:0}25%,72%{opacity:1}}@keyframes progress{from{width:0}to{width:100%}}
  </style><body><main class="stage"><div class="eyebrow">Page Capture · guided demo</div><h1 class="headline">${scene.title}</h1><p class="subtitle">${scene.subtitle}</p><div class="ai-label">SIMULATED PRODUCT DEMO</div><div class="workspace"><section class="browser"><div class="bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i><div class="url">licensing.portal.gov/application/education</div></div><div class="portal"><div class="portal-head"><span>STATE LICENSING PORTAL</span><span>${isNewSession ? "NEW TEST" : "STEP 3 OF 6"}</span></div><h2>${pageTitle}</h2><div class="label">${isSensitive ? "Verification code" : isFullPage ? "Section 1 · Employment" : "Institution"}</div><div class="field">${isSensitive ? "••••••" : isFullPage ? "Current practice information" : "University of Example"}</div><div class="row"><div><div class="label">${isSensitive ? "Password" : isFullPage ? "Section 2 · Education" : "Degree"}</div><div class="field">${isSensitive ? "••••••••••" : isFullPage ? "Degree history" : "Bachelor of Science"}</div></div><div><div class="label">${isSensitive ? "Account" : isFullPage ? "Section 3 · Disclosure" : "Graduation year"}</div><div class="field">${isSensitive ? "•••• 4812" : isFullPage ? "Attestations" : "2020"}</div></div></div><div class="actions"><span>Back</span><div class="next">${isNewSession ? "Start test →" : "Next →"}</div></div><div class="shield"><strong>Capture paused</strong><span>Sensitive fields detected on this page</span></div></div></section><aside class="ledger"><h3>${isNewSession ? "Session 02 · ready" : "Application record"}</h3><p>UT · Nurse practitioner · DEMO-0813</p><div class="item"><span class="num">01</span><b>Profile</b><span class="check">✓</span></div><div class="item"><span class="num">02</span><b>Contact</b><span class="check">✓</span></div><div class="item"><span class="num">03</span><b>${isFullPage ? "Full history" : "Education"}</b><span class="check">✓</span></div><div class="item"><span class="num">04</span><b>Licenses</b><span class="check">✓</span></div><div class="toast"><b>${toastTitle}</b><small>${toastDetail}</small></div><div class="folder"><h3>License Page Captures</h3><p>DEMO-0813 / UT / NP</p>${["01-profile.png","02-contact.png","03-education.png","session-summary.html"].map(x=>`<div class="file">${x}<span>verified</span></div>`).join("")}</div></aside></div><div class="progress"></div></main></body></html>`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [key, scene] of Object.entries(scenes)) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  await page.setContent(studio(scene, key), { waitUntil: "load" });
  await page.screenshot({ path: path.join(out, `${key}-poster.png`) });
  await page.waitForTimeout(scene.duration);
  const video = page.video();
  await page.close();
  const source = await video.path();
  await context.close();
  await fs.rename(source, path.join(out, `${key}.webm`));
}
await browser.close();
