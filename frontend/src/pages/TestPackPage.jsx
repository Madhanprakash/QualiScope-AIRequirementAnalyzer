import React, { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, GitCompare, Pencil, Plus, RefreshCw, Search, Trash2, Undo2 } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { CATEGORIES, PRIORITY_LEVELS } from "../utils/constants";
import { NoPack, PageHeading, Priority, StatusTag } from "../components/common";
import CaseEditor from "../components/CaseEditor";

export function filterCases(cases, { category, search, priority }) {
  const q = search.trim().toLowerCase();
  return cases.filter(t => (category === "all" || t.category === category) && (!priority || t.priority === priority) &&
    (!q || [t.id, t.scenario, t.expected_result, t.module, t.test_data, t.steps.join(" ")].join(" ").toLowerCase().includes(q)));
}

export default function TestPackPage({ go }) {
  const { pack, mutate, notify } = useApp();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [open, setOpen] = useState({});
  const [editing, setEditing] = useState(null);
  const [cmp, setCmp] = useState(null);

  const cases = pack?.data.test_cases || [];
  const shown = useMemo(() => filterCases(cases, { category, search, priority }), [cases, category, search, priority]);
  if (!pack) return <NoPack go={go} />;
  const approved = pack.status === "approved";
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, cases.filter(t => t.category === c.id).length]));

  async function save(f) {
    const body = { ...f };
    delete body.id; delete body.origin; delete body.edited; delete body.approved; delete body.actual_result; delete body.status;
    delete body.is_assumption; delete body.assumption_note; delete body.requirement_id;
    const res = await mutate(() => editing.isNew ? api.addCase(pack.id, body) : api.patchCase(pack.id, f.id, body), editing.isNew ? "Test case added" : "Test case updated");
    if (res) setEditing(null);
  }

  async function remove(t) {
    if (window.confirm(`Delete ${t.id}? This cannot be undone.`)) await mutate(() => api.deleteCase(pack.id, t.id), `${t.id} deleted`);
  }

  async function regenerate() {
    if (category === "all") return notify("Select a category tab to regenerate.", "error");
    if (!window.confirm(`Regenerate AI cases for "${category}"? Edited, manual and approved cases are kept.`)) return;
    const protectedN = cases.filter(t => t.category === category && (t.edited || t.origin === "manual" || t.approved)).length;
    const overwrite_edited = protectedN > 0 && window.confirm(`${protectedN} edited/manual case(s) exist. Overwrite them too? (Cancel keeps them)`);
    await mutate(() => api.regenerate(pack.id, { categories: [category], overwrite_edited, confirm_approved: approved }), "Category regenerated");
  }

  async function approve() {
    if (approved) return mutate(() => api.approve(pack.id, false), "Approval revoked");
    if (window.confirm("Approve this test pack? It will be locked against edits until approval is revoked.")) await mutate(() => api.approve(pack.id, true), "Test pack approved");
  }

  return <>
    <PageHeading kicker="02 / STANDARD OUTPUT" title="AI" accent="Test Pack" subtitle={`${pack.title || pack.requirement_id} · v${pack.version} · ${pack.status}`}>
      <div className="btn-row">
        <button className="secondary-button" onClick={async () => { try { const v = await api.versions(pack.id); setCmp({ v, a: Math.max(1, pack.version - 1), b: pack.version, result: null }); } catch (e) { notify(errorMessage(e), "error"); } }}><GitCompare size={14} /> Compare versions</button>
        <button className="secondary-button" disabled={approved} onClick={() => setEditing({ isNew: true })}><Plus size={14} /> Add test case</button>
        <button className="secondary-button" onClick={regenerate}><RefreshCw size={14} /> Regenerate category</button>
        <button className="primary-button" onClick={approve}>{approved ? <><Undo2 size={14} /> Revoke approval</> : <><CheckCircle2 size={14} /> Approve pack</>}</button>
      </div>
    </PageHeading>
    {pack.data.warnings.map((w, i) => <div key={i} className="error-banner">{w}</div>)}
    <section className="panel pack-panel">
      <div className="tabs scroll">
        <button className={`tab ${category === "all" ? "selected" : ""}`} onClick={() => setCategory("all")}>All<span>{cases.length}</span></button>
        {CATEGORIES.map(c => <button key={c.id} className={`tab ${category === c.id ? "selected" : ""}`} onClick={() => setCategory(c.id)}>{c.label}<span>{counts[c.id]}</span></button>)}
      </div>
      <div className="table-toolbar">
        <div className="search-field"><Search size={14} /><input aria-label="Search test cases" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search test cases..." /></div>
        <select aria-label="Filter by priority" className="sel" value={priority} onChange={e => setPriority(e.target.value)}>{PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p || "All priorities"}</option>)}</select>
      </div>
      <div className="table-wrap"><table><thead><tr><th /><th>ID</th><th>SCENARIO</th><th>TYPE</th><th>PRIORITY</th><th>STATUS</th><th>COVERS</th><th /></tr></thead><tbody>
        {shown.map(t => <React.Fragment key={t.id}>
          <tr data-testid={`row-${t.id}`}>
            <td><button className="icon-button" aria-label={`Toggle ${t.id}`} onClick={() => setOpen(o => ({ ...o, [t.id]: !o[t.id] }))}>{open[t.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td>
            <td className="test-id">{t.id}</td>
            <td className="scenario-name">{t.scenario}{t.is_assumption && <span className="assume" title={t.assumption_note}>ASSUMPTION</span>}{t.origin === "manual" && <span className="assume manual">MANUAL</span>}{t.edited && t.origin !== "manual" && <span className="assume manual">EDITED</span>}</td>
            <td><span className="type-tag">{t.test_type || t.category}</span></td><td><Priority value={t.priority} /></td><td><StatusTag value={t.status} /></td>
            <td className="expected">{t.covers.join(", ") || <em>unmapped</em>}</td>
            <td className="row-actions"><button className="icon-button" aria-label={`Edit ${t.id}`} disabled={approved} onClick={() => setEditing({ ...t })}><Pencil size={14} /></button><button className="icon-button" aria-label={`Delete ${t.id}`} disabled={approved} onClick={() => remove(t)}><Trash2 size={14} /></button></td>
          </tr>
          {open[t.id] && <tr className="detail"><td /><td colSpan={7}><div className="case-detail">
            <div><b>Module</b> {t.module || "—"}</div><div><b>Preconditions</b> {t.preconditions || "—"}</div>
            <div><b>Steps</b><ol>{t.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div><div><b>Test data</b> {t.test_data || "—"}</div>
            <div><b>Expected result</b> {t.expected_result}</div>
            {t.is_assumption && <div className="assume-note"><b>Unconfirmed behaviour</b> {t.assumption_note}</div>}
            {t.remarks && <div><b>Remarks</b> {t.remarks}</div>}
          </div></td></tr>}
        </React.Fragment>)}
      </tbody></table>{shown.length === 0 && <div className="empty-state">No test cases match your filters.</div>}</div>
      <div className="section-footer"><span>{shown.length} of {cases.length} test cases</span><span>AI-generated draft · Requires BA/PO and QA validation</span></div>
    </section>
    {editing && <CaseEditor initial={editing.isNew ? null : editing} isNew={!!editing.isNew} onSave={f => save({ ...f, isNew: undefined })} onCancel={() => setEditing(null)} />}
    {cmp && <div className="modal-backdrop" role="dialog" aria-label="Compare versions"><div className="modal">
      <h3>Compare versions</h3>
      <div className="form-grid"><label>From<select value={cmp.a} onChange={e => setCmp({ ...cmp, a: +e.target.value })}>{Array.from({ length: cmp.v.current }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}</select></label>
        <label>To<select value={cmp.b} onChange={e => setCmp({ ...cmp, b: +e.target.value })}>{Array.from({ length: cmp.v.current }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}</select></label></div>
      <button className="secondary-button" onClick={async () => { try { setCmp({ ...cmp, result: await api.compare(pack.id, cmp.a, cmp.b) }); } catch (e) { notify(errorMessage(e), "error"); } }}>Compare</button>
      {cmp.result && <div className="cmp"><p><b>Added:</b> {cmp.result.added.join(", ") || "none"}</p><p><b>Removed:</b> {cmp.result.removed.join(", ") || "none"}</p><p><b>Changed:</b> {cmp.result.changed.map(c => `${c.id} (${c.fields.join(", ")})`).join("; ") || "none"}</p></div>}
      <ul className="vlist">{cmp.v.versions.map(v => <li key={v.version}>v{v.version} — {v.note}</li>)}</ul>
      <div className="modal-actions"><button className="secondary-button" onClick={() => setCmp(null)}>Close</button></div>
    </div></div>}
  </>;
}
