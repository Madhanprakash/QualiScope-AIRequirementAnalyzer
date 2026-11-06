import React, { useState } from "react";
import { useApp } from "../hooks/useApp";
import { NoPack, PageHeading, Priority } from "../components/common";

const LEVELS = ["All", "Critical", "High", "Medium", "Low"];

export default function RisksPage({ go }) {
  const { pack } = useApp();
  const [sev, setSev] = useState("All");
  if (!pack) return <NoPack go={go} />;
  const { risks, questions } = pack.data;
  const shown = risks.filter(r => sev === "All" || r.severity === sev);
  return <>
    <PageHeading kicker="RISK" title="Risk" accent="analysis" subtitle="Identified risks with severity, likelihood, impact and mitigation." />
    <section className="panel pad">
      <div className="tabs">{LEVELS.map(l => <button key={l} className={`tab ${sev === l ? "selected" : ""}`} onClick={() => setSev(l)}>{l}<span>{l === "All" ? risks.length : risks.filter(r => r.severity === l).length}</span></button>)}</div>
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>CATEGORY</th><th>SEVERITY</th><th>LIKELIHOOD</th><th>DESCRIPTION</th><th>IMPACT</th><th>MITIGATION</th></tr></thead><tbody>
        {shown.map(r => <tr key={r.id}><td className="test-id">{r.id}</td><td>{r.category}</td><td><Priority value={r.severity} /></td><td>{r.likelihood}</td><td className="scenario-name">{r.description}</td><td>{r.impact}</td><td className="expected">{r.mitigation}</td></tr>)}
      </tbody></table>{shown.length === 0 && <div className="empty-state">No risks at this severity.</div>}</div>
    </section>
    <section className="panel pad"><div className="section-kicker">OPEN BUSINESS QUESTIONS</div><h2>Clarifications needed ({questions.length})</h2>
      <div className="detail-list">{questions.map(q => <div className="detail-row" key={q.id}><div className="detail-number">{q.id}</div><div className="detail-main"><div className="detail-title">{q.question}</div><p>Why: {q.why_needed}</p>{q.provisional_assumption && <p className="assume-note">Provisional assumption (unconfirmed): {q.provisional_assumption}</p>}</div><span className="type-tag">{q.category}</span></div>)}
        {questions.length === 0 && <div className="empty-state">No open questions.</div>}</div>
    </section>
  </>;
}
