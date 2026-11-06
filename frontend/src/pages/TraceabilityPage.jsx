import React, { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { ErrorBanner, NoPack, PageHeading, Spinner, Stat } from "../components/common";

export default function TraceabilityPage({ go }) {
  const { pack } = useApp();
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (pack) { setT(null); api.traceability(pack.id).then(setT).catch(e => setErr(errorMessage(e))); } }, [pack?.id, pack?.version]);
  if (!pack) return <NoPack go={go} />;
  if (err) return <ErrorBanner message={err} />;
  if (!t) return <Spinner label="Building matrix..." />;
  const g = t.gaps;
  return <>
    <PageHeading kicker="TRACEABILITY" title="Traceability" accent="matrix" subtitle="Coverage is calculated from mapped requirement items; 'validated' requires all mapped cases to pass." />
    <section className="stats-grid">
      <Stat icon={Target} label="Requirement items" value={t.summary.total_items} />
      <Stat icon={Target} label="Mapped coverage" value={`${t.summary.mapped_coverage_pct}%`} tone="amber" />
      <Stat icon={Target} label="Validated coverage" value={`${t.summary.validated_coverage_pct}%`} tone="green" />
      <Stat icon={Target} label="Unmapped test cases" value={t.unmapped_test_cases.length} tone="red" />
    </section>
    <section className="panel pad">
      <div className="table-wrap"><table><thead><tr><th>REQUIREMENT ID</th><th>TYPE</th><th>REQUIREMENT</th><th>TEST CASE IDS</th><th>COVERAGE</th><th>STATUS</th></tr></thead><tbody>
        {t.rows.map(r => <tr key={r.requirement_id}><td className="test-id">{r.requirement_id}</td><td>{r.type}</td><td className="scenario-name">{r.requirement}</td><td className="expected">{r.test_case_ids.join(", ") || "—"}</td><td>{r.coverage}</td><td><span className={`status-tag s-${r.status.toLowerCase().replace(/\s/g, "")}`}>{r.status}</span></td></tr>)}
      </tbody></table></div>
    </section>
    <section className="panel pad"><h3>Coverage gaps</h3><ul className="gaps">
      <li><b>Requirements without coverage:</b> {g.uncovered_requirements.join(", ") || "none"}</li>
      <li><b>Acceptance criteria without coverage:</b> {g.uncovered_acceptance_criteria.join(", ") || "none"}</li>
      <li><b>Uncovered business rules:</b> {g.uncovered_business_rules.join(", ") || "none"}</li>
      <li><b>Regression gaps:</b> {g.regression_gaps.join(", ") || "none"}</li>
      <li><b>Test cases without requirement mapping:</b> {t.unmapped_test_cases.join(", ") || "none"}</li>
    </ul></section>
  </>;
}
