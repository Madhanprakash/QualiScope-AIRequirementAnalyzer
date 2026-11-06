import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function Stat({ icon: Icon, label, value, note, tone = "blue" }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={17} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note && <div className="stat-note">{note}</div>}</div>;
}

export function Priority({ value }) {
  return <span className={`priority ${String(value).toLowerCase()}`}><i />{value}</span>;
}

export function StatusTag({ value }) {
  return <span className={`status-tag s-${String(value).toLowerCase().replace(/\s/g, "")}`}>{value}</span>;
}

export function Spinner({ label = "Working..." }) {
  return <span className="spinner" role="status"><Loader2 size={14} className="spin" /> {label}</span>;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="error-banner" role="alert"><AlertTriangle size={15} /> {message}</div>;
}

export function Empty({ children }) {
  return <div className="empty-state">{children}</div>;
}

export function NoPack({ go }) {
  return <div className="panel empty-panel"><h3>No test pack selected</h3><p>Analyze a requirement and generate a test pack, or open a saved pack from the Dashboard.</p><button className="primary-button" onClick={() => go("analyzer")}>Go to Requirement Analyzer</button></div>;
}

export function PageHeading({ kicker, title, accent, children, subtitle }) {
  return <section className="page-heading"><div><div className="eyebrow">{kicker}</div><h1>{title} <span>{accent}</span></h1><p>{subtitle}</p></div>{children}</section>;
}
