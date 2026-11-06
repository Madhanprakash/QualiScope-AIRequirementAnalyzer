import React, { useEffect, useState } from "react";
import { CheckCircle2, Link2, ListChecks, Target, Unlink } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { NoPack, StatusBadge } from "../components/common";
import {
  Alert, Badge, Card, CardFooter, CardHeader, CardSection, EmptyState, PageHeader, ProgressBar, Skeleton, Spinner, StatCard, Table, cx
} from "../components/ui";
import "./TraceabilityPage.css";

const MATRIX_TITLE = "Requirement coverage";
const MATRIX_DESC = "Each requirement item with its mapped test cases and execution-based status.";

function TraceabilityHeader() {
  return (
    <PageHeader
      eyebrow={<><Target size={14} aria-hidden="true" /> Traceability</>}
      title="Traceability matrix"
      description="Coverage is calculated from mapped requirement items; validated requires every mapped case to pass."
    />
  );
}

/** Wrapping list of mono ID tags, or a muted placeholder when there are none. */
function IdList({ ids, empty }) {
  if (!ids.length) return <span className="muted">{empty}</span>;
  return (
    <ul className="traceability__ids">
      {ids.map((id, i) => <li key={`${i}-${id}`} className="traceability__id">{id}</li>)}
    </ul>
  );
}

/** Coverage label (None, Mapped, Full) next to a two-step meter. */
function Coverage({ value }) {
  const modifier = String(value || "").toLowerCase().replace(/\s+/g, "-");
  return (
    <span className={cx("traceability__coverage", `traceability__coverage--${modifier}`)}>
      <span className="traceability__meter" aria-hidden="true"><span /><span /></span>
      {value}
    </span>
  );
}

function TraceabilitySkeleton() {
  return (
    <div className="page" aria-busy="true">
      <TraceabilityHeader />
      <div className="stat-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="stat">
            <Skeleton width="55%" height={12} />
            <Skeleton width="40%" height={30} />
            <Skeleton width="70%" height={10} />
          </div>
        ))}
      </div>
      <Card flush>
        <CardHeader title={MATRIX_TITLE} description={MATRIX_DESC} actions={<Spinner label="Building matrix…" />} />
        <CardSection className="stack-sm">
          {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} height={40} />)}
        </CardSection>
      </Card>
    </div>
  );
}

export default function TraceabilityPage({ go }) {
  const { pack } = useApp();
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (pack) { setT(null); setErr(""); api.traceability(pack.id).then(setT).catch(e => setErr(errorMessage(e))); } }, [pack?.id, pack?.version]);
  if (!pack) return <NoPack go={go} />;
  if (err) {
    return (
      <div className="page">
        <TraceabilityHeader />
        <Alert tone="danger" role="alert" title="Could not build the traceability matrix">{err}</Alert>
      </div>
    );
  }
  if (!t) return <TraceabilitySkeleton />;

  const { rows, summary } = t;
  const g = t.gaps;
  const unmapped = t.unmapped_test_cases;
  const withStatus = s => rows.filter(r => r.status === s).length;
  const mapped = rows.filter(r => r.test_case_ids.length).length;
  const validated = withStatus("Validated");
  const gaps = [
    { label: "Requirements without coverage:", ids: g.uncovered_requirements },
    { label: "Acceptance criteria without coverage:", ids: g.uncovered_acceptance_criteria },
    { label: "Uncovered business rules:", ids: g.uncovered_business_rules },
    { label: "Regression gaps:", ids: g.regression_gaps },
    { label: "Test cases without requirement mapping:", ids: unmapped }
  ];
  const openGaps = gaps.reduce((n, gap) => n + gap.ids.length, 0);

  return (
    <div className="page">
      <TraceabilityHeader />

      <div className="stat-grid">
        <StatCard icon={ListChecks} label="Requirement items" value={summary.total_items} hint={`${pack.requirement_id || "Pack"} · v${pack.version}`} />
        <StatCard icon={Link2} label="Mapped coverage" value={`${summary.mapped_coverage_pct}%`} hint={`${mapped} of ${summary.total_items} items mapped`}>
          <ProgressBar value={summary.mapped_coverage_pct} label="Mapped coverage" />
        </StatCard>
        <StatCard icon={CheckCircle2} label="Validated coverage" value={`${summary.validated_coverage_pct}%`} tone="success" hint={`${validated} of ${summary.total_items} items validated`}>
          <ProgressBar value={summary.validated_coverage_pct} label="Validated coverage" tone="success" />
        </StatCard>
        <StatCard
          icon={Unlink}
          label="Unmapped test cases"
          value={unmapped.length}
          tone={unmapped.length ? "danger" : "success"}
          hint={unmapped.length ? "Missing a requirement mapping" : "Every case maps to an item"}
        />
      </div>

      <Card flush>
        <CardHeader title={MATRIX_TITLE} description={MATRIX_DESC} />
        {rows.length ? (
          <>
            <Table label="Traceability matrix" minWidth={920}>
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Requirement</th><th>Test case IDs</th><th>Coverage</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.requirement_id}>
                    <td className="cell-id">{r.requirement_id}</td>
                    <td>{r.type}</td>
                    <td className="cell-primary">{r.requirement}</td>
                    <td className="traceability__cases"><IdList ids={r.test_case_ids} empty="—" /></td>
                    <td><Coverage value={r.coverage} /></td>
                    <td><StatusBadge value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <CardFooter>
              <span className="tabular">
                {validated} validated · {withStatus("Mapped")} mapped · {withStatus("Failing")} failing · {withStatus("Not covered")} uncovered
              </span>
              <span>Statuses update as execution results are recorded.</span>
            </CardFooter>
          </>
        ) : (
          <EmptyState compact icon={Target} title="No requirement items to trace" description="The analysis for this pack did not extract any requirement items." />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Coverage gaps"
          description="Requirement items without a mapped test case, and test cases without a requirement item."
          actions={<Badge tone={openGaps ? "danger" : "success"} dot>{openGaps ? `${openGaps} ${openGaps === 1 ? "gap" : "gaps"}` : "No gaps"}</Badge>}
        />
        <dl>
          {gaps.map(gap => (
            <div key={gap.label} className="traceability__gap">
              <dt className="traceability__gap-label">{gap.label}</dt>
              <dd><Badge tone={gap.ids.length ? "danger" : "neutral"}>{gap.ids.length}</Badge></dd>
              <dd className="traceability__gap-ids"><IdList ids={gap.ids} empty="none" /></dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
