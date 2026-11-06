import React, { useState } from "react";
import { Check } from "lucide-react";
import { PRIORITIES, STATUSES, CATEGORIES } from "../utils/constants";
import { Alert, Button, Field, Input, Modal, Select, Textarea, cx } from "./ui";

const blank = { scenario: "", category: "functional", test_type: "", priority: "Medium", module: "", preconditions: "", steps: [], test_data: "", expected_result: "", remarks: "", covers: [] };

/**
 * Add / edit dialog for one test case. `initial` is null for a new manual case.
 * `saving` shows progress on the submit button while the parent saves.
 */
export default function CaseEditor({ initial, isNew, onSave, onCancel, saving = false }) {
  const [f, setF] = useState(initial ? { ...initial } : blank);
  const [err, setErr] = useState("");
  // What the user typed in the two list fields, so Enter and "," are not swallowed;
  // f.steps and f.covers keep the parsed lists that are validated and saved.
  const [stepsText, setStepsText] = useState(() => f.steps.join("\n"));
  const [coversText, setCoversText] = useState(() => f.covers.join(", "));
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (f.scenario.trim().length < 3) return setErr("Scenario is required (min 3 characters).");
    if (!f.steps.length) return setErr("Add at least one test step.");
    if (!f.expected_result.trim()) return setErr("Expected result is required.");
    onSave(f);
  }

  return (
    <Modal
      as="form"
      onSubmit={submit}
      size="lg"
      title={isNew ? "Add manual test case" : `Edit ${f.id}`}
      description={`${isNew ? "Manual" : "Edited"} cases are kept when a category is regenerated. Scenario, test steps and expected result are required.`}
      onClose={onCancel}
      closeOnBackdrop={false}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" icon={Check} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="stack">
        {err && <Alert tone="danger" role="alert">{err}</Alert>}

        <div className={cx("form-grid", isNew ? "form-grid--2" : "form-grid--3")}>
          {isNew && (
            <Field label="Category">
              <Select value={f.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Priority">
            <Select value={f.priority} onChange={e => set("priority", e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Module">
            <Input value={f.module} onChange={e => set("module", e.target.value)} />
          </Field>
          <Field label="Test type">
            <Input value={f.test_type} onChange={e => set("test_type", e.target.value)} />
          </Field>
        </div>

        <Field label="Scenario">
          <Textarea rows={2} data-autofocus aria-required="true" value={f.scenario} onChange={e => set("scenario", e.target.value)} />
        </Field>
        <Field label="Preconditions">
          <Textarea rows={2} value={f.preconditions} onChange={e => set("preconditions", e.target.value)} />
        </Field>
        <Field label="Test steps" hint="One step per line">
          <Textarea
            rows={5}
            aria-required="true"
            value={stepsText}
            onChange={e => { setStepsText(e.target.value); set("steps", e.target.value.split("\n").filter(s => s.trim())); }}
          />
        </Field>

        <div className="form-grid form-grid--2">
          <Field label="Test data">
            <Textarea rows={3} value={f.test_data} onChange={e => set("test_data", e.target.value)} />
          </Field>
          <Field label="Expected result">
            <Textarea rows={3} aria-required="true" value={f.expected_result} onChange={e => set("expected_result", e.target.value)} />
          </Field>
        </div>

        <div className="form-grid form-grid--2">
          <Field label="Covers" hint="Requirement item IDs, comma separated">
            <Input
              value={coversText}
              placeholder="FR-001, AC-002"
              onChange={e => { setCoversText(e.target.value); set("covers", e.target.value.split(",").map(s => s.trim()).filter(Boolean)); }}
            />
          </Field>
          <Field label="Remarks">
            <Input value={f.remarks} onChange={e => set("remarks", e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export { STATUSES };
