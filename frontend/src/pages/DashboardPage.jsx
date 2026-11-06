import React, { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleHelp, FileText, ListChecks, ShieldAlert } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { CATEGORIES, SEVERITY_COLORS } from "../utils/constants";
import { ErrorBanner, PageHeading, Spinner, Stat } from "../components/common";

export default function DashboardPage({ go }) {
  const { openPack } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.dashboard().then(setD).catch(e => setErr(errorMessage(e))); }, []);

  if (err) return <ErrorBanner message={err} />;
  if (!d) return <Spinner label="Loading dashboard..." />;

  const catData = CATEGORIES.map(c => ({ name: c.label, value: d.by_category[c.id] || 0 }));
  const riskData = Object.entries(d.risks_by_severity).map(([name, value]) => ({ name, value }));
  const exec = Object.entries(d.execution_status);

  return <>
    <PageHeading kicker="OVERVIEW" title="Quality" accent="dashboard" subtitle="Coverage, risk and execution across all analyzed requirements.">
      <button className="primary-button" onClick={() => go("analyzer")}>Analyze new requirement</button>
    </PageHeading>
    <section className="stats-grid">
      <Stat icon={FileText} label="Requirements analyzed" value={d.requirements_analyzed} note={`${d.approved_packs} approved`} />
      <Stat icon={ListChecks} label="Total test cases" value={d.total_test_cases} tone="green" />
      <Stat icon={ShieldAlert} label="Risks identified" value={d.total_risks} tone="red" />
      <Stat icon={CircleHelp} label="Open business questions" value={d.open_questions} tone="amber" />
    </section>
    <section className="stats-grid eight">
      {CATEGORIES.map(c => <Stat key={c.id} icon={c.icon} label={`${c.label} cases`} value={d.by_category[c.id] || 0} />)}
    </section>
    <section className="chart-grid">
      <div className="panel chart-card"><h3>Test coverage by category</h3>
        <ResponsiveContainer width="100%" height={240}><BarChart data={catData} margin={{ left: -20 }}><XAxis dataKey="name" tick={{ fill: "#8a9bb0", fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={55} /><YAxis allowDecimals={false} tick={{ fill: "#8a9bb0", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#111d2a", border: "1px solid #2a3b4d" }} /><Bar dataKey="value" fill="#e5a94e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div className="panel chart-card"><h3>Risk distribution</h3>
        {d.total_risks ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={riskData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label>{riskData.map(r => <Cell key={r.name} fill={SEVERITY_COLORS[r.name]} />)}</Pie><Tooltip contentStyle={{ background: "#111d2a", border: "1px solid #2a3b4d" }} /></PieChart></ResponsiveContainer> : <div className="empty-state">No risks yet</div>}
        <div className="legend">{riskData.map(r => <span key={r.name}><i style={{ background: SEVERITY_COLORS[r.name] }} />{r.name} {r.value}</span>)}</div></div>
    </section>
    <section className="panel pad">
      <h3>Execution status</h3><div className="exec-bar">{exec.map(([k, v]) => <span key={k} className={`status-tag s-${k.toLowerCase().replace(/\s/g, "")}`}>{k}: {v}</span>)}</div>
      <h3 style={{ marginTop: 22 }}>Recent test packs</h3>
      {d.recent.length === 0 ? <div className="empty-state">No test packs yet. Analyze a requirement to get started.</div> :
        <div className="table-wrap"><table><thead><tr><th>REQUIREMENT</th><th>TITLE</th><th>STATUS</th><th>CASES</th><th>RISKS</th><th /></tr></thead><tbody>
          {d.recent.map(p => <tr key={p.id}><td className="test-id">{p.requirement_id || "—"}</td><td className="scenario-name">{p.title}</td><td>{p.status} v{p.version}</td><td>{p.test_case_count}</td><td>{p.risk_count}</td><td><button className="text-button" onClick={async () => { await openPack(p.id); go("testpack"); }}>Open</button></td></tr>)}
        </tbody></table></div>}
    </section>
  </>;
}
