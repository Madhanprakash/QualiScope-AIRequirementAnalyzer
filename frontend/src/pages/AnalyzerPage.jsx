import React, { useRef, useState } from "react";
import {
  ArrowRight, Boxes, Check, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, Download, FileText, Hash,
  Layers, ListChecks, Network, Plug, RefreshCw, Scale, ShieldCheck, Sparkles, TriangleAlert, Upload, Users, Workflow
} from "lucide-react";
import { api, errorMessage, saveBlob } from "../services/api";
import { useApp } from "../hooks/useApp";
import { EMPTY_REQ, SOURCE_TYPES } from "../utils/constants";
import {
  Alert, Badge, Button, Card, CardFooter, CardHeader, CardSection, Checkbox, Field, Input, Modal, PageHeader,
  Select, Skeleton, Spinner, Table, Textarea, cx
} from "../components/ui";
import "./AnalyzerPage.css";

export function validateRequirement(r) {
  const body = [r.title, r.description, r.acceptance_criteria].join(" ").trim();
  return body.length < 10 ? "Provide a title, description or acceptance criteria (at least 10 characters)." : "";
}

// Labels mirror the Excel template / iGreen backlog columns.
const COL_LABELS = {
  source_type: "Item Type", requirement_id: "Requirement ID", title: "Item Title",
  description: "Item Desc", parent: "Parent", data_flow_diagram: "Data Flow Diagram",
  acceptance_criteria: "Acceptance Criteria", business_validation: "Business Validation",
  boundary_validation: "Boundary Validation", integration_points: "Integration Points",
  api_spec: "API Spec"
};

const GRID_COLS = ["source_type", "requirement_id", "title", "description", "parent", "data_flow_diagram", "acceptance_criteria", "business_validation", "boundary_validation", "integration_points", "api_spec"];
const LONG_COLS = new Set(["description", "data_flow_diagram", "acceptance_criteria", "business_validation", "boundary_validation", "integration_points", "api_spec"]);
// Minimum column width in the review grid; long-text columns get the widest.
const COL_SIZE = { source_type: "sm", requirement_id: "sm", title: "md", parent: "md" };

const ANALYZING = "Analyzing requirement...";
const GENERATING = "Generating AI Test Pack (this can take a minute)...";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function TemplateGrid({ rows, onApprove, onClose }) {
  const [selected, setSelected] = useState(() => new Set());
  const [editRows, setEditRows] = useState(rows);
  const allSelected = editRows.length > 0 && selected.size === editRows.length;
  const toggle = ri => setSelected(s => { const n = new Set(s); n.has(ri) ? n.delete(ri) : n.add(ri); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(editRows.keys()));

  const setCell = (ri, col, val) =>
    setEditRows(r => r.map((row, i) => i === ri ? { ...row, [col]: val } : row));

  return (
    <Modal
      size="full"
      onClose={onClose}
      title={`${plural(editRows.length, "requirement")} ready for review`}
      description="Tick one or more rows, or select all, to load them into the analyzer. Several rows are stepped through one at a time."
      bodyClassName="analyzer__review-body"
      footerAlign="between"
      footer={
        <>
          <span className="text-sm text-secondary">
            {selected.size ? `${selected.size} of ${plural(editRows.length, "row")} selected` : "No row selected"}
          </span>
          <div className="btn-group analyzer__review-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={Check} disabled={!selected.size} onClick={() => onApprove(editRows.filter((_, i) => selected.has(i)))}>
              Approve &amp; Load{selected.size > 1 ? ` (${selected.size})` : ""}
            </Button>
          </div>
        </>
      }
    >
      <Table label="Uploaded requirements" compact wrapClassName="analyzer__review-table">
        <thead>
          <tr>
            <th className="cell-tight analyzer__pick">
              <Checkbox aria-label="Select all rows" checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onChange={toggleAll} />
            </th>
            {GRID_COLS.map(c => <th key={c} className={`analyzer__col--${COL_SIZE[c] || "lg"}`}>{COL_LABELS[c]}</th>)}
          </tr>
        </thead>
        <tbody>
          {editRows.map((row, ri) => {
            const cellLabel = c => `${COL_LABELS[c]} row ${ri + 1}`;
            return (
              <tr key={ri} className={selected.has(ri) ? "is-selected" : undefined} onClick={() => toggle(ri)}>
                <td className="cell-tight analyzer__pick" onClick={e => e.stopPropagation()}>
                  <Checkbox aria-label={`Select row ${ri + 1}`} checked={selected.has(ri)} onChange={() => toggle(ri)} />
                </td>
                {GRID_COLS.map(c => (
                  <td key={c} onClick={e => e.stopPropagation()}>
                    {c === "source_type"
                      ? <Select size="sm" aria-label={cellLabel(c)} value={row[c]} onChange={e => setCell(ri, c, e.target.value)}>{SOURCE_TYPES.map(s => <option key={s}>{s}</option>)}</Select>
                      : LONG_COLS.has(c)
                        ? <Textarea className="analyzer__cell-text" rows={3} aria-label={cellLabel(c)} value={row[c] || ""} onChange={e => setCell(ri, c, e.target.value)} />
                        : <Input size="sm" aria-label={cellLabel(c)} value={row[c] || ""} onChange={e => setCell(ri, c, e.target.value)} />}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Modal>
  );
}

/** Titled group of fields inside the requirement card (two columns on wide screens). */
function FormSection({ id, icon: Icon, title, description, children }) {
  return (
    <CardSection className="analyzer__section" role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}>
      <div className="analyzer__section-head">
        <span className="analyzer__section-icon" aria-hidden="true"><Icon size={16} /></span>
        <div className="stack-xs">
          <h3 id={`${id}-title`} className="analyzer__section-title">{title}</h3>
          <p id={`${id}-desc`} className="muted text-xs">{description}</p>
        </div>
      </div>
      <div className="analyzer__fields">{children}</div>
    </CardSection>
  );
}

export default function AnalyzerPage({ go }) {
  const { setPack, notify, refreshPacks, projectId } = useApp();
  const [req, setReq] = useState(EMPTY_REQ);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [templateRows, setTemplateRows] = useState([]);
  const [showGrid, setShowGrid] = useState(false);
  const [queue, setQueue] = useState({ rows: [], index: 0 });
  const tmplRef = useRef();
  const set = (k, v) => { setReq(r => ({ ...r, [k]: v })); setAnalysis(null); };

  async function run(label, fn) {
    if (!projectId) return setError("Create or select a project first (sidebar, Project).");
    const v = validateRequirement(req);
    if (v) return setError(v);
    setError(""); setLoading(label);
    try { await fn(); } catch (e) { setError(errorMessage(e)); } finally { setLoading(""); }
  }

  const analyze = () => run(ANALYZING, async () => { setAnalysis(await api.analyze(req)); });
  const generate = () => run(GENERATING, async () => {
    const pack = await api.generate(req, analysis || undefined, projectId);
    setPack(pack); refreshPacks(); notify(`Test pack generated: ${pack.test_case_count} test cases.`); go("testpack");
  });

  async function uploadTemplate(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      const { rows } = await api.parseTemplate(file);
      setTemplateRows(rows.map(r => ({ ...EMPTY_REQ, ...r })));
      setShowGrid(true);
    } catch (err) { setError(errorMessage(err)); }
  }

  function approveTemplate(rows) {
    setQueue({ rows, index: 0 });
    setReq(rows[0]);
    setAnalysis(null); setError("");
    setShowGrid(false);
    setTemplateRows([]);
    notify(rows.length > 1 ? `${rows.length} requirements loaded. Showing 1 of ${rows.length}.` : "Requirement loaded from template. Ready to analyze.");
  }

  function step(delta) {
    const index = queue.index + delta;
    if (index < 0 || index >= queue.rows.length) return;
    // keep edits made to the current item
    const rows = queue.rows.map((r, i) => i === queue.index ? req : r);
    setQueue({ rows, index });
    setReq(rows[index]);
    setAnalysis(null); setError("");
  }

  async function downloadTemplate() {
    try { const { blob, name } = await api.downloadTemplate(); saveBlob(blob, name); }
    catch (err) { setError(errorMessage(err)); }
  }

  const field = ({ id, rows, span, mono, ...p }) => (
    <Field label={COL_LABELS[id]} className={span ? "span-full" : undefined}>
      {rows
        ? <Textarea id={id} rows={rows} className={mono ? "analyzer__mono" : undefined} value={req[id]} onChange={e => set(id, e.target.value)} {...p} />
        : <Input id={id} value={req[id]} onChange={e => set(id, e.target.value)} {...p} />}
    </Field>
  );

  const queueMeta = [req.requirement_id, req.title].filter(Boolean).join(" · ");

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><Sparkles size={14} aria-hidden="true" /> AI-assisted quality engineering</>}
        title="From requirement to"
        accent="test coverage"
        description="Submit a requirement, story or CR. Missing information is raised as open questions, never silently assumed."
        actions={<Button icon={Download} onClick={downloadTemplate}>Download Excel Template</Button>}
      />

      {queue.rows.length > 1 && (
        <Card as="div" padded={false} className="analyzer__queue" role="group" aria-label="Loaded requirements">
          <span className="analyzer__queue-icon" aria-hidden="true"><Layers size={16} /></span>
          <div className="grow">
            <p className="analyzer__queue-title tabular">Requirement {queue.index + 1} of {queue.rows.length}</p>
            {queueMeta && <p className="muted text-xs truncate">{queueMeta}</p>}
          </div>
          <div className="btn-group">
            <Button size="sm" icon={ChevronLeft} disabled={queue.index === 0} onClick={() => step(-1)}>Previous</Button>
            <Button size="sm" iconRight={ChevronRight} disabled={queue.index === queue.rows.length - 1} onClick={() => step(1)}>Next</Button>
          </div>
          <span className="analyzer__queue-progress" style={{ width: `${((queue.index + 1) / queue.rows.length) * 100}%` }} aria-hidden="true" />
        </Card>
      )}

      <Card flush>
        <CardHeader
          title="Source requirement"
          description="Partially completed requirements are accepted. Provide at least a title, description or acceptance criteria."
        />

        <FormSection id="analyzer-identification" icon={Hash} title="Identification" description="Item type, reference ID, title and parent link.">
          <div className="form-grid analyzer__identity">
            <Field label={COL_LABELS.source_type}>
              <Select id="source_type" value={req.source_type} onChange={e => set("source_type", e.target.value)}>
                {SOURCE_TYPES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            {field({ id: "requirement_id", placeholder: "e.g. US-101" })}
            {field({ id: "title", placeholder: "e.g. Edit the delivery completion date" })}
            {field({ id: "parent", placeholder: "Parent epic, feature or story" })}
          </div>
        </FormSection>

        <FormSection id="analyzer-description" icon={FileText} title="Description" description="The story, requirement or change request as written.">
          {field({ id: "description", rows: 6, placeholder: "Paste the full item description, e.g. As a user, I want … so that …" })}
        </FormSection>

        <FormSection id="analyzer-specification" icon={ListChecks} title="Specification" description="Criteria, validations, integrations and API details. Optional, but each one improves coverage.">
          <div className="form-grid form-grid--2">
            {field({ id: "data_flow_diagram", rows: 3, span: true, mono: true, placeholder: "Data flow elements as JSON or text" })}
            {field({ id: "acceptance_criteria", rows: 4, placeholder: "One criterion per line, e.g. Given … when … then …" })}
            {field({ id: "business_validation", rows: 4, placeholder: "Rules and validations the system must enforce" })}
            {field({ id: "boundary_validation", rows: 4, placeholder: "Limits, ranges and edge values" })}
            {field({ id: "integration_points", rows: 4, placeholder: "Upstream and downstream systems, events or files" })}
            {field({ id: "api_spec", rows: 3, span: true, mono: true, placeholder: "Endpoints, payloads or an OpenAPI excerpt" })}
          </div>
        </FormSection>

        {error && <CardSection><Alert tone="danger" role="alert">{error}</Alert></CardSection>}

        <CardFooter className={cx("analyzer__footer", loading && "analyzer__footer--busy")}>
          <p>
            <span className="tabular">{plural(req.description.length, "character")}</span> in description ·{" "}
            <span id="analyzer-upload-hint">Excel (.xlsx) template up to 5 MB</span>
          </p>
          <div className="btn-group analyzer__actions">
            <input ref={tmplRef} type="file" accept=".xlsx" hidden onChange={uploadTemplate} data-testid="template-input" />
            <Button variant="ghost" icon={Upload} aria-describedby="analyzer-upload-hint" onClick={() => tmplRef.current.click()}>Upload Excel</Button>
            <Button icon={Sparkles} disabled={!!loading} onClick={analyze}>Analyze Requirement</Button>
            <Button variant="primary" iconRight={ArrowRight} disabled={!!loading} onClick={generate}>Generate AI Test Pack</Button>
          </div>
        </CardFooter>

        {loading && <div className="analyzer__status"><Spinner label={loading} /></div>}
      </Card>

      {loading === ANALYZING && !analysis && <AnalysisSkeleton />}
      {analysis && <AnalysisView a={analysis} />}
      {showGrid && <TemplateGrid rows={templateRows} onApprove={approveTemplate} onClose={() => setShowGrid(false)} />}
    </div>
  );
}

/** One titled list in the analysis grid; hidden when the list is empty. */
function Block({ icon: Icon, title, items, render = x => x, refs = false, attention = false }) {
  if (!items?.length) return null;
  return (
    <div className={cx("analyzer__block", attention && "analyzer__block--attention")}>
      <h3 className="analyzer__block-title">
        <Icon size={15} aria-hidden="true" />
        <span className="grow">{title}</span>
        <span className="chip__count" aria-hidden="true">{items.length}</span>
      </h3>
      <ul className="analyzer__list">
        {items.map((item, i) => <li key={i} className={cx("analyzer__item", !refs && "analyzer__item--dot")}>{render(item)}</li>)}
      </ul>
    </div>
  );
}

const refItem = item => <><span className="analyzer__ref">{item.id}</span><span>{item.text}</span></>;

const ruleItem = rule => (
  <>
    <span className="analyzer__ref">{rule.id}</span>
    <span>
      {rule.text}
      {rule.basis && <>{" "}<Badge tag tone={rule.basis === "inferred" ? "warning" : "neutral"}>{rule.basis}</Badge></>}
    </span>
  </>
);

const ambiguityItem = x => (
  <span className="stack-xs">
    <span className="analyzer__strong">“{x.statement}”</span>
    <span className="muted text-xs">{x.issue}</span>
  </span>
);

const questionItem = q => (
  <span className="stack-xs">
    <span className="analyzer__strong">{q.question}</span>
    <span className="muted text-xs">Why: {q.why_needed}</span>
    {q.provisional_assumption && <span className="analyzer__assumption">Provisional assumption: {q.provisional_assumption}</span>}
  </span>
);

const TRACEABLE = ["functional_requirements", "acceptance_criteria", "business_rules", "regression_impacts"];

export function AnalysisView({ a }) {
  const traceable = TRACEABLE.reduce((n, k) => n + (a[k]?.length || 0), 0);
  const questions = a.open_questions?.length || 0;
  return (
    <Card className="analyzer__analysis animate-in" aria-label="Requirement analysis">
      <CardHeader
        eyebrow={<><Sparkles size={13} aria-hidden="true" /> AI requirement analysis</>}
        title={a.summary}
        description={a.business_objective}
        actions={
          <>
            <Badge>{plural(traceable, "traceable item")}</Badge>
            <Badge tone={questions ? "warning" : "success"} dot>{plural(questions, "open question")}</Badge>
          </>
        }
      />
      <div className="analyzer__blocks">
        <Block icon={Users} title="Actors" items={a.actors} />
        <Block icon={Boxes} title="Entities" items={a.entities} />
        <Block icon={Workflow} title="Workflows" items={a.workflows} />
        <Block icon={ListChecks} title="Functional requirements" items={a.functional_requirements} render={refItem} refs />
        <Block icon={ClipboardCheck} title="Acceptance criteria" items={a.acceptance_criteria} render={refItem} refs />
        <Block icon={Scale} title="Business rules" items={a.business_rules} render={ruleItem} refs />
        <Block icon={ShieldCheck} title="Mandatory validations" items={a.mandatory_validations} />
        <Block icon={Network} title="Dependencies" items={a.dependencies} />
        <Block icon={Plug} title="Integration points" items={a.integration_points} />
        <Block icon={RefreshCw} title="Regression impacts" items={a.regression_impacts} render={refItem} refs />
        <Block icon={TriangleAlert} title="Ambiguous statements" items={a.ambiguities} render={ambiguityItem} attention />
        <Block icon={CircleHelp} title="Open questions" items={a.open_questions} render={questionItem} attention />
      </div>
    </Card>
  );
}

/** Placeholder shown where the analysis will appear while it is being produced. */
function AnalysisSkeleton() {
  return (
    <Card as="div" className="stack-lg" aria-hidden="true">
      <div className="stack-sm">
        <Skeleton width={160} height={11} />
        <Skeleton width="55%" height={20} />
        <Skeleton width="35%" height={14} />
      </div>
      <div className="analyzer__blocks">
        <Skeleton height={132} />
        <Skeleton height={132} />
        <Skeleton height={132} />
      </div>
    </Card>
  );
}
