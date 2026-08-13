"use client";
import { useState } from "react";

type Field = { label: string; value: string; kind?: "text" | "textarea" | "select" | "password" };
type DemoPage = { title: string; note: string; fields: Field[]; action?: string; sensitive?: boolean; long?: boolean };
type Workflow = { name: string; eyebrow: string; description: string; coverage: string[]; pages: DemoPage[] };

const workflows: Record<string, Workflow> = {
  licensing: {
    name: "Nurse licensing",
    eyebrow: "MOCK STATE LICENSING PORTAL",
    description: "A state-board style application covering education, licenses, employment, identity verification, and final review.",
    coverage: ["6 pages", "Long forms", "Sensitive skip"],
    pages: [
      { title: "Applicant profile", note: "Basic identity and contact information.", fields: [{ label: "Legal name", value: "Taylor Example" }, { label: "Preferred email", value: "taylor@example.invalid" }, { label: "Phone", value: "555-0100" }], action: "Save & continue" },
      { title: "Education history", note: "A realistic page with several record fields.", fields: [{ label: "Institution", value: "Example State University" }, { label: "Program", value: "Bachelor of Science in Nursing", kind: "select" }, { label: "Attendance dates", value: "August 2016 – May 2020" }, { label: "Clinical hours", value: "960" }], action: "Next step", long: true },
      { title: "License history", note: "Existing professional credentials.", fields: [{ label: "Issuing state", value: "Colorado", kind: "select" }, { label: "License type", value: "Registered Nurse" }, { label: "License number", value: "TEST-000123" }, { label: "Expiration date", value: "December 31, 2027" }], action: "Continue application" },
      { title: "Employment history", note: "Long-form information for full-page testing.", fields: [{ label: "Employer", value: "Example Community Clinic" }, { label: "Position", value: "Registered Nurse" }, { label: "Dates employed", value: "June 2020 – Present" }, { label: "Responsibilities", value: "Provided direct patient care, coordinated referrals, documented encounters, and participated in quality reviews.", kind: "textarea" }, { label: "Supervisor", value: "Morgan Example" }], action: "Save and proceed", long: true },
      { title: "Identity verification", note: "This page should be skipped when sensitive-screen protection is on.", fields: [{ label: "One-time verification code", value: "483921", kind: "password" }], action: "Proceed", sensitive: true },
      { title: "Application review", note: "Final fictional review page. Nothing is submitted.", fields: [{ label: "Application type", value: "RN endorsement" }, { label: "Jurisdiction", value: "Example State" }, { label: "Status", value: "Ready for internal review" }], action: "Review and continue" },
    ],
  },
  credentialing: {
    name: "Provider credentialing",
    eyebrow: "MOCK CREDENTIALING WORKSPACE",
    description: "A healthcare credentialing record with locations, professional history, documents, verification, and committee review.",
    coverage: ["6 pages", "Dropdowns", "Document checklist"],
    pages: [
      { title: "Provider record", note: "Fictional demographic information.", fields: [{ label: "Provider name", value: "Jordan Example, NP" }, { label: "Provider type", value: "Nurse Practitioner", kind: "select" }, { label: "Internal record ID", value: "PROV-TEST-104" }], action: "Continue" },
      { title: "Practice locations", note: "Multiple location details on one page.", fields: [{ label: "Primary practice", value: "100 Example Avenue" }, { label: "City and state", value: "Sample City, UT" }, { label: "Service type", value: "Telehealth and outpatient" }, { label: "Additional location", value: "200 Test Street" }], action: "Save and next", long: true },
      { title: "Professional history", note: "Training and experience records.", fields: [{ label: "Graduate program", value: "Example University" }, { label: "Board certification", value: "Family Nurse Practitioner" }, { label: "Years in practice", value: "5" }, { label: "Specialty summary", value: "Primary care, preventive health, and chronic condition management.", kind: "textarea" }], action: "Proceed" },
      { title: "Document checklist", note: "A mixed-control page for capture testing.", fields: [{ label: "Government ID", value: "Marked received", kind: "select" }, { label: "Professional license", value: "Marked received", kind: "select" }, { label: "Insurance certificate", value: "Pending", kind: "select" }, { label: "Training certificate", value: "Marked received", kind: "select" }], action: "Next" },
      { title: "Secure verification", note: "Sensitive authentication material should not be captured.", fields: [{ label: "Verification passcode", value: "927440", kind: "password" }], action: "Continue", sensitive: true },
      { title: "Credentialing review", note: "Completion summary with fictional status.", fields: [{ label: "Record status", value: "Ready for committee review" }, { label: "Outstanding items", value: "Insurance certificate" }], action: "Review" },
    ],
  },
  insurance: {
    name: "Insurance enrollment",
    eyebrow: "MOCK ENROLLMENT PORTAL",
    description: "An organizational enrollment workflow with ownership, service locations, attestations, and payment protection.",
    coverage: ["6 pages", "Full-page test", "Payment skip"],
    pages: [
      { title: "Organization profile", note: "Fictional business information.", fields: [{ label: "Organization", value: "Example Health Group" }, { label: "Entity type", value: "Professional practice", kind: "select" }, { label: "Reference number", value: "ENROLL-TEST-22" }], action: "Next" },
      { title: "Ownership details", note: "Structured organizational information.", fields: [{ label: "Owner name", value: "Casey Example" }, { label: "Ownership percentage", value: "100%" }, { label: "Effective date", value: "January 1, 2024" }, { label: "Disclosure notes", value: "Fictional record for extension testing only.", kind: "textarea" }], action: "Save & continue", long: true },
      { title: "Service locations", note: "Repeated address-style controls.", fields: [{ label: "Location name", value: "Example Main Office" }, { label: "Street", value: "300 Demonstration Road" }, { label: "City, state, ZIP", value: "Sample City, UT 84000" }, { label: "Hours", value: "Monday–Friday, 9:00–5:00" }], action: "Continue" },
      { title: "Attestations", note: "Long review text and confirmation fields.", fields: [{ label: "Accuracy statement", value: "I confirm this fictional test record is complete.", kind: "textarea" }, { label: "Authorized signer", value: "Riley Example" }, { label: "Signer title", value: "Testing Administrator" }, { label: "Recorded date", value: "August 13, 2026" }], action: "Review and continue", long: true },
      { title: "Payment verification", note: "Payment terminology should trigger sensitive-screen protection.", fields: [{ label: "Card verification code", value: "123", kind: "password" }], action: "Proceed", sensitive: true },
      { title: "Enrollment review", note: "No payment or enrollment is submitted.", fields: [{ label: "Enrollment", value: "Example commercial plan" }, { label: "Status", value: "Draft – test only" }], action: "Review" },
    ],
  },
};

function DemoField({ field }: { field: Field }) {
  if (field.kind === "textarea") return <label>{field.label}<textarea aria-label={field.label} defaultValue={field.value} /></label>;
  if (field.kind === "select") return <label>{field.label}<select aria-label={field.label} defaultValue={field.value}><option>{field.value}</option><option>Alternative test value</option></select></label>;
  return <label>{field.label}<input aria-label={field.label} type={field.kind === "password" ? "password" : "text"} defaultValue={field.value} /></label>;
}

export function CaptureDemo() {
  const [workflowKey, setWorkflowKey] = useState("licensing");
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState<Array<{ label: string; status: "saved" | "skipped" }>>([]);
  const workflow = workflows[workflowKey]; const current = workflow.pages[page];
  function reset(nextWorkflow = workflowKey) { setWorkflowKey(nextWorkflow); setPage(0); setEvents([]); }
  function advance() { const status = current.sensitive ? "skipped" : "saved"; setEvents((items) => [...items, { label: current.title, status }]); setPage((value) => Math.min(value + 1, workflow.pages.length - 1)); }

  return <div className="demo-lab" id="demo">
    <div className="scenario-catalog" aria-label="Available application tests">
      {Object.entries(workflows).map(([key, item], index) => <button className={`scenario-card ${key === workflowKey ? "selected" : ""}`} key={key} onClick={() => reset(key)} aria-pressed={key === workflowKey}>
        <span className="scenario-number">TEST {String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><p>{item.description}</p><span className="scenario-tags">{item.coverage.map((tag) => <i key={tag}>{tag}</i>)}</span><b>{key === workflowKey ? "Selected" : "Run this test →"}</b>
      </button>)}
    </div>
    <div className="live-demo">
      <div className="demo-top"><span><i /> Capture test lab · {workflow.name}</span><button onClick={() => reset()}>Reset workflow</button></div>
      <div className="demo-grid"><div className={`demo-portal ${current.long ? "long-form" : ""}`}>
        <div className="portal-header"><span>{workflow.eyebrow}</span><b>Step {page + 1} of {workflow.pages.length}</b></div>
        <h3>{current.title}</h3><p className="demo-note">{current.note}</p>
        {current.fields.map((field) => <DemoField field={field} key={field.label} />)}
        {current.long && <div className="test-document"><strong>Additional test material</strong><p>This fictional supporting section deliberately makes the page taller and tests scrolling, full-page stitching, fixed navigation, and field labeling. It contains no real applicant or provider information.</p><ul><li>Example record reviewed</li><li>Documentation marked for testing</li><li>No submission will occur</li></ul></div>}
        <div className="demo-action-row"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Back</button><button className="demo-next" onClick={advance} disabled={page === workflow.pages.length - 1}>{page === workflow.pages.length - 1 ? "End of test" : `${current.action} →`}</button></div>
      </div><aside className="demo-ledger"><p>EXPECTED CAPTURE RECORD</p>{events.length === 0 ? <div className="demo-empty">Start Page Capture, then advance this workflow. Saved and skipped pages will appear here.</div> : events.map((event, index) => <div className={`demo-event ${event.status}`} key={`${event.label}-${index}`}><span>{event.status === "saved" ? String(index + 1).padStart(2, "0") : "S"}</span><div><strong>{event.label}</strong><small>{event.status === "saved" ? "Screenshot expected" : "Sensitive skip expected"}</small></div></div>)}</aside></div>
    </div>
  </div>;
}
