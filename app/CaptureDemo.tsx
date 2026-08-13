"use client";
import { useState } from "react";
const pages = [
  { title: "Applicant profile", fields: ["Legal name", "Previous names"] },
  { title: "Education history", fields: ["Institution", "Graduation year"] },
  { title: "License history", fields: ["Issuing state", "License number"] },
  { title: "Identity verification", fields: ["Verification code"], sensitive: true },
  { title: "Application review", fields: ["Certification", "Submission fee"] },
];
export function CaptureDemo() {
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState<Array<{ label: string; status: "saved" | "skipped" }>>([]);
  const current = pages[page];
  function advance() { const status = current.sensitive ? "skipped" : "saved"; setEvents((items) => [...items, { label: current.title, status }]); setPage((value) => Math.min(value + 1, pages.length - 1)); }
  return <div className="live-demo" id="demo">
    <div className="demo-top"><span><i /> Interactive pilot</span><button onClick={() => { setPage(0); setEvents([]); }}>Reset</button></div>
    <div className="demo-grid"><div className="demo-portal">
      <div className="portal-header"><span>MOCK LICENSING PORTAL</span><b>Step {page + 1} of {pages.length}</b></div><h3>{current.title}</h3>
      {current.fields.map((field, index) => <label key={field}>{field}<input aria-label={field} type={current.sensitive ? "password" : "text"} defaultValue={current.sensitive ? "483921" : index ? "2020" : "Example response"} /></label>)}
      <div className="demo-action-row"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Back</button><button className="demo-next" onClick={advance} disabled={page === pages.length - 1}>Save &amp; continue →</button></div>
    </div><aside className="demo-ledger"><p>CAPTURE LEDGER</p>{events.length === 0 ? <div className="demo-empty">Advance through the mock application to see the ledger build itself.</div> : events.map((event, index) => <div className={`demo-event ${event.status}`} key={`${event.label}-${index}`}><span>{event.status === "saved" ? String(index + 1).padStart(2, "0") : "S"}</span><div><strong>{event.label}</strong><small>{event.status === "saved" ? "Screenshot saved" : "Sensitive screen skipped"}</small></div></div>)}</aside></div>
  </div>;
}
