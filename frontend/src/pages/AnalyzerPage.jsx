import React, { useRef, useState } from "react";
import { ArrowRight, ClipboardPaste, Sparkles, Upload, X } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { EMPTY_REQ, SOURCE_TYPES } from "../utils/constants";
import { ErrorBanner, PageHeading, Spinner } from "../components/common";

export const SAMPLE = {
  source_type: "User Story", requirement_id: "US-101", title: "Admin modifies delivery completion date",
  description: "As an Admin, I want to modify the delivery completion date so that delivery records remain accurate when schedules change.",
  business_objective: "Keep delivery and billing records accurate when schedules change.",
  acceptance_criteria: "Admin can edit the completion date from the delivery record.\nThe updated date is saved and visible after refresh.",
  impacted_module: "Delivery Management", business_priority: "High", additional_context: ""
};

export function validateRequirement(r) {
  const body = [r.title, r.description, r.acceptance_criteria].join(" ").trim();
  return body.length < 10 ? "Provide a title, description or acceptance criteria (at least 10 characters)." : "";
}

export default function AnalyzerPage({ go }) {
  const { setPack, notify, refreshPacks } = useApp();
  const [req, setReq] = useState(EMPTY_REQ);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef();
  const set = (k, v) => { setReq(r => ({ ...r, [k]: v })); setAnalysis(null); };

  async function run(label, fn) {
    const v = validateRequirement(req);
    if (v) return setError(v);
    setError(""); setLoading(label);
    try { await fn(); } catch (e) { setError(errorMessage(e)); } finally { setLoading(""); }
  }

  const analyze = () => run("Analyzing requirement...", async () => { setAnalysis(await api.analyze(req)); });
  const generate = () => run("Generating AI Test Pack (this can take a minute)...", async () => {
    const pack = await api.generate(req, analysis || undefined);
    setPack(pack); refreshPacks(); notify(`Test pack generated: ${pack.test_case_count} test cases.`); go("testpack");
  });

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      const { text } = await api.extract(file);
      set("description", [req.description, text].filter(Boolean).join("\n\n"));
      notify(`Loaded ${file.name}`);
    } catch (err) { setError(errorMessage(err)); }
  }

  async function paste() {
    try { set("description", (req.description ? req.description + "\n" : "") + await navigator.clipboard.readText()); }
    catch { setError("Clipboard access was denied. Paste with Ctrl+V into the description box."); }
  }

  const field = ({ id, label, rows, ...p }) => <label key={id} className="fld" htmlFor={id}><span>{label}</span>{rows ? <textarea id={id} rows={rows} value={req[id]} onChange={e => set(id, e.target.value)} {...p} /> : <input id={id} value={req[id]} onChange={e => set(id, e.target.value)} {...p} />}</label>;

  return <>
    <PageHeading kicker={<><Sparkles size={14} /> AI-ASSISTED QUALITY ENGINEERING</>} title="From requirement to" accent="test coverage." subtitle="Submit a requirement, story or CR. Missing information is raised as open questions, never silently assumed.">
      <button className="secondary-button" onClick={() => { setReq(SAMPLE); setAnalysis(null); }}>Load sample</button>
    </PageHeading>
    <section className="panel requirement-panel">
      <div className="panel-title-row"><div><div className="section-kicker">01 / INPUT</div><h2>Provide the source requirement</h2><p>Partially completed requirements are accepted.</p></div></div>
      <div className="form-grid wide">
        <label className="fld" htmlFor="source_type"><span>REQUIREMENT SOURCE TYPE</span><select id="source_type" value={req.source_type} onChange={e => set("source_type", e.target.value)}>{SOURCE_TYPES.map(s => <option key={s}>{s}</option>)}</select></label>
        {field({ id: "requirement_id", label: "REQUIREMENT ID", placeholder: "e.g. US-101" })}
        {field({ id: "title", label: "REQUIREMENT TITLE" })}
        {field({ id: "impacted_module", label: "IMPACTED MODULE" })}
        <label className="fld" htmlFor="business_priority"><span>BUSINESS PRIORITY</span><select id="business_priority" value={req.business_priority} onChange={e => set("business_priority", e.target.value)}><option value="">Not specified</option>{["Critical", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}</select></label>
      </div>
      {field({ id: "description", label: "REQUIREMENT DESCRIPTION", rows: 5, placeholder: "Paste the full requirement, user story or CR details..." })}
      <div className="form-grid two">{field({ id: "business_objective", label: "BUSINESS OBJECTIVE", rows: 3 })}{field({ id: "acceptance_criteria", label: "ACCEPTANCE CRITERIA", rows: 3 })}</div>
      {field({ id: "additional_context", label: "ADDITIONAL CONTEXT", rows: 2 })}
      <ErrorBanner message={error} />
      <div className="input-footer">
        <span>{req.description.length} characters in description · PDF, DOCX, TXT up to 5 MB</span>
        <div className="input-actions">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={upload} data-testid="file-input" />
          <button className="text-button" onClick={paste}><ClipboardPaste size={14} /> Paste</button>
          <button className="text-button" onClick={() => fileRef.current.click()}><Upload size={14} /> Upload document</button>
          <button className="text-button" onClick={() => { setReq(EMPTY_REQ); setAnalysis(null); setError(""); }}><X size={14} /> Clear</button>
          <button className="secondary-button" disabled={!!loading} onClick={analyze}><Sparkles size={15} /> Analyze Requirement</button>
          <button className="primary-button" disabled={!!loading} onClick={generate}>Generate AI Test Pack <ArrowRight size={15} /></button>
        </div>
      </div>
      {loading && <Spinner label={loading} />}
    </section>
    {analysis && <AnalysisView a={analysis} />}
  </>;
}

const List = ({ title, items }) => items?.length ? <div className="an-block"><h4>{title}</h4><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;

export function AnalysisView({ a }) {
  return <section className="panel analysis-panel" aria-label="Requirement analysis">
    <div className="section-kicker">02 / AI REQUIREMENT ANALYSIS</div><h2>{a.summary}</h2>
    <p className="muted">{a.business_objective}</p>
    <div className="an-grid">
      <List title="Actors" items={a.actors} /><List title="Entities" items={a.entities} /><List title="Workflows" items={a.workflows} />
      <List title="Functional requirements" items={a.functional_requirements.map(i => `${i.id}: ${i.text}`)} />
      <List title="Acceptance criteria" items={a.acceptance_criteria.map(i => `${i.id}: ${i.text}`)} />
      <List title="Business rules" items={a.business_rules.map(b => `${b.id} [${b.basis}]: ${b.text}`)} />
      <List title="Mandatory validations" items={a.mandatory_validations} /><List title="Dependencies" items={a.dependencies} />
      <List title="Integration points" items={a.integration_points} />
      <List title="Regression impacts" items={a.regression_impacts.map(i => `${i.id}: ${i.text}`)} />
      <List title="Ambiguous statements" items={a.ambiguities.map(x => `"${x.statement}" — ${x.issue}`)} />
      <List title="Open questions" items={a.open_questions.map(q => `${q.question} (${q.why_needed})${q.provisional_assumption ? " Assumption: " + q.provisional_assumption : ""}`)} />
    </div>
  </section>;
}
