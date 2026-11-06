import React, { useState } from "react";
import { ListFilter, PlayCircle } from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../hooks/useApp";
import { STATUSES } from "../utils/constants";
import { NoPack, PriorityBadge, StatusBadge } from "../components/common";
import { Card, CardFooter, CardHeader, CardSection, EmptyState, FilterChips, Input, PageHeader, Select, Table, cx } from "../components/ui";
import "./ExecutionPage.css";

/** Executed results fill the progress bar from the left; Not Run is the remainder. */
const BAR_ORDER = ["Pass", "Fail", "Blocked", "Not Run"];
const slug = s => String(s).toLowerCase().replace(/\s+/g, "-");

function Row({ t, onSave }) {
  const [actual, setActual] = useState(t.actual_result);
  const [remarks, setRemarks] = useState(t.remarks);
  const dirty = actual !== t.actual_result || remarks !== t.remarks;
  return (
    <tr>
      <td className="cell-id">{t.id}</td>
      <td className="cell-primary">{t.scenario}</td>
      <td className="cell-tight"><PriorityBadge value={t.priority} /></td>
      <td className="execution__status-cell">
        <Select
          size="sm"
          aria-label={`Status ${t.id}`}
          wrapperClassName={cx("execution__status", `execution__status--${slug(t.status)}`)}
          value={t.status}
          onChange={e => onSave(t.id, { status: e.target.value })}
        >
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </Select>
      </td>
      <td className="execution__field">
        <Input
          size="sm"
          aria-label={`Actual result ${t.id}`}
          value={actual}
          onChange={e => setActual(e.target.value)}
          onBlur={() => dirty && onSave(t.id, { actual_result: actual, remarks })}
          placeholder="Actual result"
        />
      </td>
      <td className="execution__field execution__field--remarks">
        <Input
          size="sm"
          aria-label={`Remarks ${t.id}`}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          onBlur={() => dirty && onSave(t.id, { actual_result: actual, remarks })}
          placeholder="Remarks"
        />
      </td>
    </tr>
  );
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
  const pct = cases.length ? (100 * done) / cases.length : 0;
  const segments = BAR_ORDER.filter(s => count(s) > 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><PlayCircle size={14} aria-hidden="true" /> Execution</>}
        title="Test execution"
        description="Record actual results and status. Results can be recorded even after approval."
      />

      <Card className="execution__summary">
        <div className="execution__headline">
          <div className="stack-sm">
            <h2 className="section-title">Execution progress</h2>
            <p className="execution__count"><strong>{done}</strong> of {cases.length} executed</p>
          </div>
          <p className="execution__pct"><strong>{Math.round(pct)}%</strong> complete</p>
        </div>
        <div
          className="progress progress--stacked execution__bar"
          role="progressbar"
          aria-label="Execution progress"
          aria-valuemin={0}
          aria-valuemax={cases.length}
          aria-valuenow={done}
          aria-valuetext={`${done} of ${cases.length} executed`}
        >
          {segments.length
            ? segments.map(s => <span key={s} className={`execution__seg--${slug(s)}`} style={{ flexGrow: count(s) }} />)
            : <span className="execution__seg--not-run" style={{ flexGrow: 1 }} />}
        </div>
        <dl className="execution__breakdown">
          {BAR_ORDER.map(s => (
            <div key={s}>
              <dt><StatusBadge value={s} /></dt>
              <dd className="execution__breakdown-count">{count(s)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card flush>
        <CardHeader title="Test cases" description="Status saves when changed; actual results and remarks save when you leave the field." />
        <CardSection className="execution__toolbar">
          <FilterChips
            label="Filter by status"
            items={["All", ...STATUSES].map(s => ({ id: s, label: s, count: s === "All" ? cases.length : count(s) }))}
            value={filter}
            onChange={setFilter}
          />
        </CardSection>
        {shown.length ? (
          <Table label="Execution results" minWidth={920}>
            <thead>
              <tr>
                <th>ID</th><th>Scenario</th><th>Priority</th><th>Status</th><th>Actual result</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(t => <Row key={`${t.id}-${t.actual_result}-${t.remarks}`} t={t} onSave={save} />)}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            compact
            icon={ListFilter}
            title="No test cases in this state."
            description={cases.length ? "Choose another status to see the rest of the pack." : "This pack has no test cases yet."}
          />
        )}
        <CardFooter>
          <span className="tabular">Showing {shown.length} of {cases.length} test cases</span>
        </CardFooter>
      </Card>
    </div>
  );
}
