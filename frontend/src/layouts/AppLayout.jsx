import React from "react";
import { Activity, BarChart3, BookOpenCheck, Bell, Check, FileDown, LayoutDashboard, ListChecks, PlayCircle, Settings, ShieldAlert, Sparkles, Target, AlertTriangle } from "lucide-react";
import { useApp } from "../hooks/useApp";

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analyzer", label: "Requirement Analyzer", icon: Sparkles },
  { id: "testpack", label: "AI Test Pack", icon: ListChecks },
  { id: "risks", label: "Risk Analysis", icon: ShieldAlert },
  { id: "traceability", label: "Traceability Matrix", icon: Target },
  { id: "execution", label: "Test Execution", icon: PlayCircle },
  { id: "reports", label: "Reports & Export", icon: FileDown },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function AppLayout({ route, go, children }) {
  const { toast, pack } = useApp();
  const current = NAV.find(n => n.id === route);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={19} /></div><div><strong>Quali<span>Scope</span></strong><small>QUALITY INTELLIGENCE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main">
        {NAV.filter(n => n.id !== "settings").map(n => { const Icon = n.icon; return <button key={n.id} className={`nav-item ${route === n.id ? "active" : ""}`} onClick={() => go(n.id)} aria-current={route === n.id ? "page" : undefined}><Icon size={17} /><span>{n.label}</span></button>; })}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><BookOpenCheck size={17} /><strong>Quality starts with clarity</strong><p>Review open questions before accepting generated test coverage.</p></div>
        <button className={`nav-item ${route === "settings" ? "active" : ""}`} onClick={() => go("settings")}><Settings size={17} /><span>Settings</span></button>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{current?.label}</strong></div>
        <div className="top-actions">{pack && <div className="status-pill"><i /> {pack.requirement_id || "Pack"} · v{pack.version} · {pack.status}</div>}<button className="icon-button" aria-label="Notifications"><Bell size={17} /></button><div className="avatar small">QA</div></div>
      </header>
      <div className="page-wrap">{children}
        <footer><span>QualiScope · AI Requirement Analyzer</span><span>AI-generated drafts require BA/PO and QA validation</span></footer>
      </div>
    </main>
    {toast && <div className={`toast ${toast.kind === "error" ? "error" : ""}`} role="status">{toast.kind === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}{toast.message}</div>}
  </div>;
}
