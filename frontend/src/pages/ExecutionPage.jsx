import React, { useState } from "react";
import { api } from "../services/api";
import { useApp } from "../hooks/useApp";
import { STATUSES } from "../utils/constants";
import { NoPack, PageHeading, Priority } from "../components/common";

function Row({ t, onSave }) {
  const [actual, setActual] = useState(t.actual_result);
  const [remarks, setRemarks] = useState(t.remarks);
  const dirty = actual !== t.actual_result || remarks !== t.remarks;
  return <tr>
    <td className="test-id">{t.id}</td><td className="scenario-name">{t.scenario}</td><td><Priority value={t.priority} /></td>
    <td><select aria-label={`Status ${t.id}`} className="sel" value={t.status} onChange={e => onSave(t.id, { status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
    <td><input aria-label={`Actual result ${t.id}`} className="cell-input" value={actual} onChange={e => setActual(e.target.value)} onBlur={() => dirty && onSave(t.id, { actual_result: actual, remarks })} placeholder="Actual result" /></td>
    <td><input aria-label={`Remarks ${t.id}`} className="cell-input" value={remarks} onChange={e => setRemarks(e.target.value)} onBlur={() => dirty && onSave(t.id, { actual_result: actual, remarks })} placeholder="Remarks" /></td>
  </tr>;
}

export default function ExecutionPage({ go }) {
  const { pack, mutate } = useApp();
  const [filter, setFilter] = useState("All");
  if (!pack) return <NoPack go={go} />;
  const cases = pack.data.test_cases;
  const count = s => cases.filter(t => t.status === s).length;
  const done = cases.length - count("Not Run");
  const shown = cases.filter(t => filter === "All" || t.status === filter);
  const save = (id, body) => mutate(() => api.executeCase(pack.id, id, body));
  return <>
    <PageHeading kicker="EXECUTION" title="Test" accent="execution" subtitle="Record actual results and status. Results are allowed even after approval." />
    <section className="panel pad">
      <div className="progress" aria-label="Execution progress"><div style={{ width: `${cases.length ? (100 * done) / cases.length : 0}%` }} /></div>
      <div className="exec-bar">{["All", ...STATUSES].map(s => <button key={s} className={`tab-pill ${filter === s ? "selected" : ""}`} onClick={() => setFilter(s)}>{s}{s !== "All" && ` (${count(s)})`}</button>)}</div>
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>SCENARIO</th><th>PRIORITY</th><th>STATUS</th><th>ACTUAL RESULT</th><th>REMARKS</th></tr></thead><tbody>
        {shown.map(t => <Row key={`${t.id}-${t.actual_result}-${t.remarks}`} t={t} onSave={save} />)}
      </tbody></table>{shown.length === 0 && <div className="empty-state">No test cases in this state.</div>}</div>
    </section>
  </>;
}
