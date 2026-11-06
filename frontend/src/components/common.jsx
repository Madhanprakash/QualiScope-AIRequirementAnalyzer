/*
 * QA-domain components built on the UI kit (src/components/ui).
 */
import React from "react";
import { FileSearch, Sparkles } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton, Spinner, StatCard, cx } from "./ui";

const PRIORITY_CLASS = { critical: "priority--critical", high: "priority--high", medium: "priority--medium", low: "priority--low" };

/** Priority / severity label with a coloured dot (Critical, High, Medium, Low). */
export function PriorityBadge({ value }) {
  return (
    <span className={cx("priority", PRIORITY_CLASS[String(value || "").toLowerCase()])}>
      <span className="priority__dot" aria-hidden="true" />
      {value}
    </span>
  );
}

const STATUS_TONE = {
  pass: "success", validated: "success", approved: "success",
  fail: "danger", failing: "danger", "not covered": "danger",
  blocked: "warning", "partially covered": "warning",
  mapped: "info",
  draft: "neutral", "not run": "neutral"
};

/** Execution / coverage / approval status as a toned badge. */
export function StatusBadge({ value, dot = true }) {
  const text = String(value ?? "");
  const tone = STATUS_TONE[text.toLowerCase()] || "neutral";
  return <Badge tone={tone} dot={dot}>{text.charAt(0).toUpperCase() + text.slice(1)}</Badge>;
}

/** Shown by pack-dependent pages when no test pack is open (or a placeholder while one is restoring). */
export function NoPack({ go }) {
  const { packLoading } = useApp() || {};
  if (packLoading) {
    return (
      <div className="page" aria-busy="true">
        <span className="sr-only" role="status">Loading test pack…</span>
        <div className="stack-sm">
          <Skeleton width={120} height={12} />
          <Skeleton width="38%" height={30} />
          <Skeleton width="62%" height={14} />
        </div>
        <Card><div className="stack"><Skeleton height={18} width="30%" /><Skeleton height={44} /><Skeleton height={44} /><Skeleton height={44} /></div></Card>
      </div>
    );
  }
  return (
    <div className="page">
      <Card>
        <EmptyState
          icon={FileSearch}
          titleAs="h1"
          title="No test pack selected"
          description="Analyze a requirement and generate a test pack, or open a saved pack from the Dashboard."
          action={<Button variant="primary" icon={Sparkles} onClick={() => go("analyzer")}>Go to Requirement Analyzer</Button>}
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Compatibility aliases for the pre-redesign API. Prefer the components
 * above and the UI kit in new code.
 * ------------------------------------------------------------------ */
const STAT_TONE = { blue: "accent", green: "success", red: "danger", amber: "warning" };

export const Priority = PriorityBadge;
export const StatusTag = StatusBadge;
export { Spinner };

export function Stat({ icon, label, value, note, tone = "blue" }) {
  return <StatCard icon={icon} label={label} value={value} hint={note} tone={STAT_TONE[tone] || tone} />;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <Alert tone="danger" role="alert">{message}</Alert>;
}

export function Empty({ children }) {
  return <EmptyState compact description={children} />;
}

export function PageHeading({ kicker, title, accent, subtitle, children }) {
  return <PageHeader eyebrow={kicker} title={title} accent={accent} description={subtitle} actions={children} />;
}
