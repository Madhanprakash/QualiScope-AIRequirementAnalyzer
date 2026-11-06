import React, { useState } from "react";
import { PRIORITIES, STATUSES, CATEGORIES } from "../utils/constants";

const blank = { scenario: "", category: "functional", test_type: "", priority: "Medium", module: "", preconditions: "", steps: [], test_data: "", expected_result: "", remarks: "", covers: [] };

export default function CaseEditor({ initial, isNew, onSave, onCancel }) {
  const [f, setF] = useState(initial ? { ...initial } : blank);
  const [err, setErr] = useState("");
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (f.scenario.trim().length < 3) return setErr("Scenario is required (min 3 characters).");
    if (!f.steps.length) return setErr("Add at least one test step.");
    if (!f.expected_result.trim()) return setErr("Expected result is required.");
    onSave(f);
  }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={isNew ? "Add test case" : "Edit test case"}>
    <form className="modal" onSubmit={submit}>
      <h3>{isNew ? "Add manual test case" : `Edit ${f.id}`}</h3>
      {err && <div className="error-banner" role="alert">{err}</div>}
      <div className="form-grid">
        {isNew && <label>Category<select value={f.category} onChange={e => set("category", e.target.value)}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
        <label>Priority<select value={f.priority} onChange={e => set("priority", e.target.value)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Module<input value={f.module} onChange={e => set("module", e.target.value)} /></label>
        <label>Test type<input value={f.test_type} onChange={e => set("test_type", e.target.value)} /></label>
      </div>
      <label>Scenario<textarea aria-label="Scenario" rows={2} value={f.scenario} onChange={e => set("scenario", e.target.value)} /></label>
      <label>Preconditions<textarea rows={2} value={f.preconditions} onChange={e => set("preconditions", e.target.value)} /></label>
      <label>Test steps (one per line)<textarea aria-label="Test steps" rows={4} value={f.steps.join("\n")} onChange={e => set("steps", e.target.value.split("\n").filter(s => s.trim()))} /></label>
      <label>Test data<textarea rows={2} value={f.test_data} onChange={e => set("test_data", e.target.value)} /></label>
      <label>Expected result<textarea aria-label="Expected result" rows={2} value={f.expected_result} onChange={e => set("expected_result", e.target.value)} /></label>
      <label>Covers (requirement item IDs, comma separated)<input value={f.covers.join(", ")} onChange={e => set("covers", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></label>
      <label>Remarks<input value={f.remarks} onChange={e => set("remarks", e.target.value)} /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button">Save</button></div>
    </form>
  </div>;
}

export { STATUSES };
