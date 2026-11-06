import React, { useMemo, useState } from "react";
import {
  CheckCircle2, ChevronRight, GitCompare, Layers, ListChecks, Lock, Minus, PenLine, Pencil, Plus,
  RefreshCw, SearchX, Sparkles, Trash2, Undo2
} from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { CATEGORIES, PRIORITY_LEVELS } from "../utils/constants";
import { NoPack, PriorityBadge, StatusBadge } from "../components/common";
import {
  Alert, Badge, Button, Card, CardFooter, CardHeader, CardSection, EmptyState, Field, FilterChips,
  IconButton, Modal, PageHeader, SearchInput, Select, Spinner, Table, cx
} from "../components/ui";
import CaseEditor from "../components/CaseEditor";
import "./TestPackPage.css";

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const DASH = <span className="muted">—</span>;
const NONE = <span className="muted">None</span>;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const capitalize = text => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const versionLabel = (n, current) => (n === current ? `v${n} (current)` : `v${n}`);

/** Local date and time for an API timestamp; timestamps without a zone are UTC. */
function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function filterCases(cases, { category, search, priority }) {
  const q = search.trim().toLowerCase();
  return cases.filter(t => (category === "all" || t.category === category) && (!priority || t.priority === priority) &&
    (!q || [t.id, t.scenario, t.expected_result, t.module, t.test_data, t.steps.join(" ")].join(" ").toLowerCase().includes(q)));
}

/** Steps, data and expected result for one case, plus any behaviour still to be confirmed. */
function CaseDetail({ id, testCase: t }) {
  return (
    <div id={id} className="testpack__detail">
      <dl className="dl">
        <dt>Module</dt>
        <dd>{t.module || DASH}</dd>
        <dt>Preconditions</dt>
        <dd>{t.preconditions || DASH}</dd>
        <dt>Steps</dt>
        <dd>
          {t.steps.length ? (
            <ol className="testpack__steps">{t.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          ) : DASH}
        </dd>
        <dt>Test data</dt>
        <dd>{t.test_data || DASH}</dd>
        <dt>Expected result</dt>
        <dd>{t.expected_result || DASH}</dd>
        {t.remarks && (
          <>
            <dt>Remarks</dt>
            <dd>{t.remarks}</dd>
          </>
        )}
      </dl>
      {t.is_assumption && <Alert tone="warning" title="Unconfirmed behaviour">{t.assumption_note}</Alert>}
    </div>
  );
}

/** A test case row and, when expanded, its full-width detail row. */
function CaseRow({ testCase: t, expanded, locked, onToggle, onEdit, onDelete }) {
  const detailId = `testpack-detail-${t.id}`;
  const edited = Boolean(t.edited) && t.origin !== "manual";
  return (
    <>
      <tr data-testid={`row-${t.id}`} className={cx("testpack__row", expanded && "is-expanded")}>
        <td className="cell-tight">
          <IconButton
            className="testpack__toggle"
            icon={ChevronRight}
            size="sm"
            label={`Toggle ${t.id}`}
            title={expanded ? "Hide details" : "Show details"}
            aria-expanded={expanded}
            aria-controls={expanded ? detailId : undefined}
            onClick={onToggle}
          />
        </td>
        <td className="cell-id">{t.id}</td>
        <td className="cell-primary">
          {t.scenario}
          {(t.is_assumption || t.origin === "manual" || edited) && (
            <span className="testpack__tags">
              {t.is_assumption && <Badge tag tone="warning" title={t.assumption_note || undefined}>ASSUMPTION</Badge>}
              {t.origin === "manual" && <Badge tag tone="info">MANUAL</Badge>}
              {edited && <Badge tag>EDITED</Badge>}
            </span>
          )}
        </td>
        <td className="cell-muted">{t.test_type || CATEGORY_LABELS[t.category] || t.category}</td>
        <td><PriorityBadge value={t.priority} /></td>
        <td><StatusBadge value={t.status} /></td>
        <td>{t.covers.length ? <span className="mono text-xs">{t.covers.join(", ")}</span> : <Badge tone="warning" dot>Unmapped</Badge>}</td>
        <td className="cell-actions">
          <div className="testpack__actions">
            <IconButton icon={Pencil} size="sm" label={`Edit ${t.id}`} disabled={locked} onClick={onEdit} />
            <IconButton icon={Trash2} size="sm" className="testpack__delete" label={`Delete ${t.id}`} disabled={locked} onClick={onDelete} />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="testpack__detail-row is-expanded">
          <td colSpan={8}><CaseDetail id={detailId} testCase={t} /></td>
        </tr>
      )}
    </>
  );
}

function DiffRow({ icon: Icon, label, children }) {
  return (
    <div className="testpack__diff-row">
      <dt><Icon size={14} aria-hidden="true" />{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const idBadges = (ids, tone) => (ids.length ? ids.map(id => <Badge key={id} tone={tone} className="mono">{id}</Badge>) : NONE);

/** Version picker, diff of test case IDs between two versions, and the snapshot history. */
function CompareDialog({ cmp, setCmp, onCompare, onClose }) {
  const numbers = Array.from({ length: cmp.v.current }, (_, i) => i + 1);
  const history = [...cmp.v.versions].reverse();
  const { result } = cmp;

  return (
    <Modal
      title="Compare versions"
      description="Pick two versions to see which test cases were added, removed or changed."
      size="md"
      onClose={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="stack-lg">
        <div className="testpack__compare">
          <div className="form-grid form-grid--2">
            <Field label="From">
              <Select value={cmp.a} onChange={e => setCmp({ ...cmp, a: +e.target.value })}>
                {numbers.map(n => <option key={n} value={n}>{versionLabel(n, cmp.v.current)}</option>)}
              </Select>
            </Field>
            <Field label="To">
              <Select value={cmp.b} onChange={e => setCmp({ ...cmp, b: +e.target.value })}>
                {numbers.map(n => <option key={n} value={n}>{versionLabel(n, cmp.v.current)}</option>)}
              </Select>
            </Field>
          </div>
          <Button variant="primary" icon={GitCompare} data-autofocus onClick={onCompare}>Compare</Button>
        </div>

        {result && (
          <section className="stack-sm">
            <div className="row-between">
              <h3 className="section-title">Changes</h3>
              {result.from != null && <span className="text-xs muted tabular">v{result.from} to v{result.to}</span>}
            </div>
            <dl className="testpack__diff">
              <DiffRow icon={Plus} label="Added">{idBadges(result.added, "success")}</DiffRow>
              <DiffRow icon={Minus} label="Removed">{idBadges(result.removed, "danger")}</DiffRow>
              <DiffRow icon={PenLine} label="Changed">
                {result.changed.length ? (
                  <ul className="testpack__changes">
                    {result.changed.map(c => (
                      <li key={c.id}>
                        <Badge tone="warning" className="mono">{c.id}</Badge>
                        <span className="text-sm text-secondary">{c.fields.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : NONE}
              </DiffRow>
            </dl>
          </section>
        )}

        <section className="stack-sm">
          <h3 className="section-title">Version history</h3>
          {history.length ? (
            <ol className="testpack__versions">
              {history.map(v => {
                const current = v.version === cmp.v.current;
                const when = formatDate(v.created_at);
                return (
                  <li key={v.version} className={cx("testpack__version", current && "testpack__version--current")}>
                    <Badge className="mono">v{v.version}</Badge>
                    <span className="testpack__version-note">{v.note || "No note"}</span>
                    {current && <Badge tone="accent">Current</Badge>}
                    {when && <time className="testpack__version-time" dateTime={v.created_at}>{when}</time>}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm muted">No earlier versions recorded yet.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}

export default function TestPackPage({ go }) {
  const { pack, mutate, notify, busy } = useApp();
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
  const warnings = pack.data.warnings || [];

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
    if (category === "all") return notify("Select a category to regenerate.", "error");
    if (!window.confirm(`Regenerate AI cases for "${category}"? Edited, manual and approved cases are kept.`)) return;
    const protectedN = cases.filter(t => t.category === category && (t.edited || t.origin === "manual" || t.approved)).length;
    const overwrite_edited = protectedN > 0 && window.confirm(`${protectedN} edited/manual case(s) exist. Overwrite them too? (Cancel keeps them)`);
    await mutate(() => api.regenerate(pack.id, { categories: [category], overwrite_edited, confirm_approved: approved }), "Category regenerated");
  }

  async function approve() {
    if (approved) return mutate(() => api.approve(pack.id, false), "Approval revoked");
    if (window.confirm("Approve this test pack? It will be locked against edits until approval is revoked.")) await mutate(() => api.approve(pack.id, true), "Test pack approved");
  }

  async function openCompare() {
    try { const v = await api.versions(pack.id); setCmp({ v, a: Math.max(1, pack.version - 1), b: pack.version, result: null }); } catch (e) { notify(errorMessage(e), "error"); }
  }

  async function runCompare() {
    try { setCmp({ ...cmp, result: await api.compare(pack.id, cmp.a, cmp.b) }); } catch (e) { notify(errorMessage(e), "error"); }
  }

  function clearFilters() {
    setCategory("all");
    setSearch("");
    setPriority("");
  }

  const categoryChips = [
    { id: "all", label: "All", icon: Layers, count: cases.length },
    ...CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon, count: counts[c.id] }))
  ];

  return (
    <div className="page testpack">
      <PageHeader
        eyebrow={<><ListChecks size={14} aria-hidden="true" /> Standard output</>}
        title={pack.title || pack.requirement_id || "AI test pack"}
        description="Review, refine and approve the AI-generated SIT/UAT test cases before execution."
        meta={
          <>
            {pack.requirement_id && <Badge className="mono">{pack.requirement_id}</Badge>}
            <Badge className="tabular">v{pack.version}</Badge>
            <StatusBadge value={capitalize(pack.status)} />
            <span className="text-sm muted">{plural(cases.length, "test case")}</span>
          </>
        }
        actions={
          <>
            <Button icon={GitCompare} onClick={openCompare}>Compare versions</Button>
            <Button icon={Plus} disabled={approved} onClick={() => setEditing({ isNew: true })}>Add test case</Button>
            <Button
              icon={RefreshCw}
              title={category === "all" ? "Choose a category to regenerate" : `Regenerate AI cases for ${CATEGORY_LABELS[category]}`}
              onClick={regenerate}
            >
              Regenerate category
            </Button>
            <Button variant="primary" icon={approved ? Undo2 : CheckCircle2} onClick={approve}>
              {approved ? "Revoke approval" : "Approve pack"}
            </Button>
          </>
        }
      />

      {(approved || warnings.length > 0) && (
        <div className="stack-sm">
          {approved && (
            <Alert tone="info" icon={Lock} title="Approved and locked">
              Test cases cannot be added, edited or deleted until approval is revoked.
            </Alert>
          )}
          {warnings.map((w, i) => <Alert key={i} tone="warning">{w}</Alert>)}
        </div>
      )}

      <Card flush>
        <CardHeader
          title="Test cases"
          description="Filter by category, priority or keyword. Expand a row for steps, test data and the expected result."
          actions={busy ? <Spinner size={14} label="Updating test pack…" /> : null}
        />
        <CardSection className="testpack__filters">
          <FilterChips label="Filter by category" items={categoryChips} value={category} onChange={setCategory} />
          <div className="testpack__toolbar">
            <SearchInput
              wrapperClassName="testpack__search"
              aria-label="Search test cases"
              placeholder="Search by ID, scenario, module…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select wrapperClassName="testpack__priority" aria-label="Filter by priority" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p || "All priorities"}</option>)}
            </Select>
            <span className="testpack__count text-sm muted tabular">{shown.length} of {cases.length}</span>
          </div>
        </CardSection>

        {shown.length ? (
          <Table label="Test cases" compact minWidth={920} wrapClassName="testpack__table">
            <thead>
              <tr>
                <th className="cell-tight"><span className="sr-only">Details</span></th>
                <th>ID</th>
                <th>Scenario</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Covers</th>
                <th className="cell-actions"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(t => (
                <CaseRow
                  key={t.id}
                  testCase={t}
                  expanded={Boolean(open[t.id])}
                  locked={approved}
                  onToggle={() => setOpen(o => ({ ...o, [t.id]: !o[t.id] }))}
                  onEdit={() => setEditing({ ...t })}
                  onDelete={() => remove(t)}
                />
              ))}
            </tbody>
          </Table>
        ) : cases.length ? (
          <EmptyState
            compact
            icon={SearchX}
            title="No test cases match your filters"
            description="Try another category, priority or search term."
            action={<Button size="sm" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState
            compact
            icon={ListChecks}
            title="No test cases in this pack"
            description={approved ? "Revoke approval to add test cases." : "Add a manual test case to get started."}
          />
        )}

        <CardFooter>
          <span className="tabular">{shown.length} of {plural(cases.length, "test case")}</span>
          <span className="row"><Sparkles size={13} aria-hidden="true" />AI-generated draft · requires BA/PO and QA validation</span>
        </CardFooter>
      </Card>

      {editing && (
        <CaseEditor
          initial={editing.isNew ? null : editing}
          isNew={!!editing.isNew}
          saving={busy}
          onSave={f => save({ ...f, isNew: undefined })}
          onCancel={() => setEditing(null)}
        />
      )}
      {cmp && <CompareDialog cmp={cmp} setCmp={setCmp} onCompare={runCompare} onClose={() => setCmp(null)} />}
    </div>
  );
}
