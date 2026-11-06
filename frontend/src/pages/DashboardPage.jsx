import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight, ChartColumn, CircleHelp, CirclePlay, FileSearch, FileText, FolderKanban,
  LayoutDashboard, ListChecks, ShieldAlert, ShieldCheck, Sparkles
} from "lucide-react";
import { api, errorMessage } from "../services/api";
import { useApp } from "../hooks/useApp";
import { useThemeTokens } from "../hooks/useTheme";
import { CATEGORIES } from "../utils/constants";
import { PriorityBadge, StatusBadge } from "../components/common";
import { Alert, Button, Card, CardHeader, EmptyState, PageHeader, Skeleton, StatCard, Table } from "../components/ui";
import "./DashboardPage.css";

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
const STATUS_ORDER = ["Pass", "Fail", "Blocked", "Not Run"];
const SEVERITY_TOKEN = { Critical: "sev-critical", High: "sev-high", Medium: "sev-medium", Low: "sev-low" };
const COVERAGE_TOKENS = ["chart-1", "chart-grid", "chart-axis", "surface-3"];
const RISK_TOKENS = ["surface", "chart-8", "sev-critical", "sev-high", "sev-medium", "sev-low"];

// X-axis labels: a short name when each bar has room, otherwise the test case
// ID prefix (TC-FUN-001, TC-NEG-001…) that testers already know. The longest
// names ("Integration", "Regression") are about 56px wide at the 11px tick size.
const MIN_SLOT_FOR_NAMES = 64;
const AXIS_LABELS = {
  functional: ["Functional", "FUN"],
  positive: ["Positive", "POS"],
  negative: ["Negative", "NEG"],
  boundary: ["Boundary", "BND"],
  role: ["Role", "ROLE"],
  integration: ["Integration", "INT"],
  data: ["Data", "DATA"],
  regression: ["Regression", "REG"]
};

const NUMBER = new Intl.NumberFormat("en-US");
const fmt = n => NUMBER.format(n || 0);
const share = (n, total) => `${total ? Math.round((n / total) * 100) : 0}%`;
const plural = (n, word) => `${fmt(n)} ${word}${n === 1 ? "" : "s"}`;
const sentence = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const slug = s => String(s).toLowerCase().replace(/\s+/g, "");

/** Counts as [{ label, value }]: known keys in display order, then anything else the API returns. */
function byOrder(counts, order) {
  const keys = [...order.filter(k => k in counts), ...Object.keys(counts).filter(k => !order.includes(k))];
  return keys.map(label => ({ label, value: counts[label] || 0 }));
}

/** Y-axis ticks in clean whole steps (1, 2, 2.5 or 5 × 10ⁿ) from 0 to just above `max`. */
function niceTicks(max) {
  const rough = Math.max(max, 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= rough && Number.isInteger(s));
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

export default function DashboardPage({ go }) {
  const { openPack, projectId, project } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setD(null); setErr("");
    if (!projectId) return;
    api.dashboard(projectId).then(setD).catch(e => setErr(errorMessage(e)));
  }, [projectId]);

  const header = (
    <PageHeader
      eyebrow={<><LayoutDashboard size={14} aria-hidden="true" /> Overview</>}
      title="Quality dashboard"
      description={`Coverage, risk and execution across all analyzed requirements in ${project?.name || "this project"}.`}
      actions={projectId ? <Button variant="primary" icon={Sparkles} onClick={() => go("analyzer")}>Analyze new requirement</Button> : null}
    />
  );

  if (!projectId) {
    return (
      <div className="page">
        {header}
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="Create a project to get started"
            description="Open the project switcher in the sidebar and choose New project. Each project keeps its own requirements, test packs and reports."
          />
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page">
        {header}
        <Alert tone="danger" role="alert" title="Could not load the dashboard">{err}</Alert>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="page" aria-busy="true">
        {header}
        <span className="sr-only" role="status">Loading dashboard…</span>
        <DashboardSkeleton />
      </div>
    );
  }

  const categories = CATEGORIES.map(c => ({ ...c, value: d.by_category[c.id] || 0 }));
  const risks = byOrder(d.risks_by_severity || {}, SEVERITY_ORDER);
  const statuses = byOrder(d.execution_status || {}, STATUS_ORDER);
  const executionTotal = statuses.reduce((sum, s) => sum + s.value, 0);
  const executed = executionTotal - (d.execution_status?.["Not Run"] || 0);
  const severe = (d.risks_by_severity?.Critical || 0) + (d.risks_by_severity?.High || 0);

  return (
    <div className="page">
      {header}

      <div className="stat-grid animate-in">
        <StatCard icon={FileText} label="Requirements analyzed" value={fmt(d.requirements_analyzed)} hint={`${fmt(d.approved_packs)} approved`} />
        <StatCard icon={ListChecks} label="Total test cases" value={fmt(d.total_test_cases)} tone="success" hint={`${fmt(executed)} executed`} />
        <StatCard icon={ShieldAlert} label="Risks identified" value={fmt(d.total_risks)} tone="danger" hint={`${fmt(severe)} critical or high`} />
        <StatCard icon={CircleHelp} label="Open business questions" value={fmt(d.open_questions)} tone="warning" hint="Need BA/PO clarification" />
      </div>

      {d.recent.length === 0 ? (
        <Card className="animate-in">
          <EmptyState
            icon={FileSearch}
            title="No test packs yet"
            description="Analyze a requirement to get started. Coverage, risk and execution insights appear here once the project has test packs."
          />
        </Card>
      ) : (
        <>
          <div className="dashboard__grid animate-in">
            <CoverageCard categories={categories} />
            <RiskCard risks={risks} total={d.total_risks} />
          </div>

          <ExecutionCard statuses={statuses} total={executionTotal} executed={executed} />

          <Card flush className="animate-in">
            <CardHeader title="Recent test packs" description="Most recently updated packs in this project." />
            <Table label="Recent test packs" minWidth={720} className="dashboard__recent">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th className="cell-num">Cases</th>
                  <th className="cell-num">Risks</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map(p => (
                  <tr key={p.id}>
                    <td className="cell-id">{p.requirement_id || <span className="muted">—</span>}</td>
                    <td className="cell-primary">{p.title}</td>
                    <td className="cell-tight">
                      <span className="row">
                        <StatusBadge value={sentence(p.status)} />
                        <span className="muted text-xs tabular">v{p.version}</span>
                      </span>
                    </td>
                    <td className="cell-num">{fmt(p.test_case_count)}</td>
                    <td className="cell-num">{fmt(p.risk_count)}</td>
                    <td className="cell-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconRight={ArrowRight}
                        aria-label={`Open ${p.requirement_id || p.title}`}
                        onClick={async () => { await openPack(p.id); go("testpack"); }}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

/** Bar chart of generated cases per category, with the exact counts listed underneath. */
function CoverageCard({ categories }) {
  const t = useThemeTokens(COVERAGE_TOKENS);
  const total = categories.reduce((sum, c) => sum + c.value, 0);
  const chartData = categories.map(({ id, label, value }) => ({ id, label, value }));
  const yTicks = niceTicks(Math.max(...chartData.map(c => c.value)));

  return (
    <Card className="dashboard__panel">
      <CardHeader title="Test coverage by category" description="Generated test cases per category across all packs." />
      {total ? (
        <>
          <div className="dashboard__bars" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
                <CartesianGrid vertical={false} stroke={t["chart-grid"]} />
                <XAxis
                  dataKey="id"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  height={24}
                  tick={props => <CategoryTick {...props} fill={t["chart-axis"]} />}
                />
                <YAxis
                  ticks={yTicks}
                  domain={[0, yTicks[yTicks.length - 1]]}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={fmt}
                  tick={{ fill: t["chart-axis"] }}
                />
                <Tooltip cursor={{ fill: t["surface-3"], radius: 6 }} content={<ChartTooltip noun="test case" />} />
                <Bar dataKey="value" fill={t["chart-1"]} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="dashboard__list dashboard__categories" aria-label="Test cases by category">
            {categories.map(({ id, label, icon: Icon, value }) => (
              <li key={id} className="dashboard__row">
                <span className="dashboard__category-icon"><Icon size={14} aria-hidden="true" /></span>
                <span className="grow truncate text-secondary">{label}</span>
                <span className="dashboard__num">{fmt(value)}</span>
                <span className="dashboard__share">{share(value, total)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState compact icon={ChartColumn} title="No test cases yet" description="Coverage by category appears once the test packs contain test cases." />
      )}
    </Card>
  );
}

/** Donut of risks by severity with a legend that carries every count. */
function RiskCard({ risks, total }) {
  const t = useThemeTokens(RISK_TOKENS);
  // Zero-value slices are left out so they do not draw empty gaps in the ring.
  const slices = risks.filter(r => r.value > 0).map(r => ({ ...r, fill: t[SEVERITY_TOKEN[r.label]] || t["chart-8"] }));

  return (
    <Card className="dashboard__panel">
      <CardHeader title="Risk distribution" description="Identified risks by severity across all packs." />
      {total ? (
        <div className="dashboard__risk">
          <div className="dashboard__donut" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false}>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="78%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke={t.surface}
                  strokeWidth={2}
                  rootTabIndex={-1}
                  animationBegin={0}
                  animationDuration={800}
                />
                <Tooltip content={<ChartTooltip noun="risk" />} wrapperStyle={{ zIndex: 1 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard__donut-total">
              <span className="dashboard__donut-value">{fmt(total)}</span>
              <span className="dashboard__donut-label">{total === 1 ? "risk" : "risks"}</span>
            </div>
          </div>
          <ul className="dashboard__list dashboard__legend" aria-label="Risks by severity">
            {risks.map(r => (
              <li key={r.label} className="dashboard__row">
                <span className="grow"><PriorityBadge value={r.label} /></span>
                <span className="dashboard__num">{fmt(r.value)}</span>
                <span className="dashboard__share">{share(r.value, total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState compact icon={ShieldCheck} title="No risks identified" description="Risks found while analyzing requirements will appear here." />
      )}
    </Card>
  );
}

/** Segmented bar of the latest execution result per test case, plus a legend with counts. */
function ExecutionCard({ statuses, total, executed }) {
  return (
    <Card className="animate-in">
      <CardHeader
        title="Execution status"
        description="Latest recorded result for each test case."
        actions={total ? <p className="dashboard__summary"><span className="dashboard__num">{share(executed, total)}</span> executed</p> : null}
      />
      {total ? (
        <>
          <div className="progress progress--stacked" aria-hidden="true">
            {statuses.filter(s => s.value > 0).map(s => (
              <span
                key={s.label}
                className={`dashboard__segment dashboard__segment--${slug(s.label)}`}
                style={{ flexGrow: s.value }}
                title={`${s.label}: ${fmt(s.value)} (${share(s.value, total)})`}
              />
            ))}
          </div>
          <ul className="dashboard__list dashboard__statuses" aria-label="Test cases by execution status">
            {statuses.map(s => (
              <li key={s.label} className="dashboard__status">
                <StatusBadge value={s.label} />
                <span className="row">
                  <span className="dashboard__status-count">{fmt(s.value)}</span>
                  <span className="muted text-xs tabular">{share(s.value, total)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState compact icon={CirclePlay} title="No test cases to execute" description="Execution results appear here once the test packs contain test cases." />
      )}
    </Card>
  );
}

/** Category label for the bar chart's x-axis (rendered by Recharts for each tick). */
function CategoryTick({ x, y, payload, width, visibleTicksCount, fill }) {
  const [name, code] = AXIS_LABELS[payload.value] || [payload.value, payload.value];
  const roomy = width / visibleTicksCount >= MIN_SLOT_FOR_NAMES;
  return (
    <text x={x} y={y} dy="0.71em" textAnchor="middle" fill={fill}>
      {roomy ? name : code}
    </text>
  );
}

/** Tooltip body for both charts: the value leads, the category or severity follows. */
function ChartTooltip({ active, payload, noun }) {
  const item = active && payload?.[0];
  if (!item) return null;
  return (
    <div className="dashboard__tooltip">
      <span className="dashboard__tooltip-value">{plural(item.value, noun)}</span>
      <span className="dashboard__tooltip-label">{item.payload.label}</span>
    </div>
  );
}

/** Placeholder with the same shape as the loaded dashboard. */
function DashboardSkeleton() {
  return (
    <>
      <div className="stat-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="stat">
            <Skeleton width="55%" height={14} />
            <Skeleton width={72} height={30} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </div>
      <div className="dashboard__grid">
        <Card className="stack">
          <Skeleton width="45%" height={16} />
          <Skeleton height={240} />
          <Skeleton height={120} />
        </Card>
        <Card className="stack">
          <Skeleton width="40%" height={16} />
          <Skeleton width={188} height={188} radius="var(--radius-full)" className="dashboard__skeleton-donut" />
          <Skeleton height={120} />
        </Card>
      </div>
      <Card className="stack">
        <Skeleton width="30%" height={16} />
        <Skeleton height={8} radius="var(--radius-full)" />
        <Skeleton height={48} />
      </Card>
      <Card className="stack">
        <Skeleton width="25%" height={16} />
        {[0, 1, 2].map(i => <Skeleton key={i} height={36} />)}
      </Card>
    </>
  );
}
