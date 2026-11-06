import React, { useEffect, useState } from "react";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { api, errorMessage, saveBlob } from "../services/api";
import { useApp } from "../hooks/useApp";
import { NoPack, PageHeading, Spinner } from "../components/common";

const FORMATS = [
  { id: "xlsx", label: "Excel workbook (13 sheets)", icon: FileSpreadsheet },
  { id: "csv", label: "CSV (all test cases)", icon: FileText },
  { id: "pdf", label: "PDF report", icon: FileText },
  { id: "json", label: "JSON (pack + traceability)", icon: FileJson }
];

export default function ReportsPage({ go }) {
  const { pack, notify } = useApp();
  const [busy, setBusy] = useState("");
  const [audit, setAudit] = useState([]);
  useEffect(() => { if (pack) api.audit(pack.id).then(setAudit).catch(() => setAudit([])); }, [pack?.id, pack?.version]);
  if (!pack) return <NoPack go={go} />;

  async function download(fmt) {
    setBusy(fmt);
    try { const { blob, name } = await api.exportPack(pack.id, fmt); saveBlob(blob, name); notify(`Exported ${name}`); }
    catch (e) {
      let msg = errorMessage(e);
      try { msg = JSON.parse(await e.response.data.text()).detail || msg; } catch { /* keep */ }
      notify(msg, "error");
    } finally { setBusy(""); }
  }

  return <>
    <PageHeading kicker="REPORTS" title="Reports &" accent="export" subtitle="Download the consolidated AI Test Pack." />
    <section className="export-grid">
      {FORMATS.map(f => { const Icon = f.icon; return <div className="panel export-card" key={f.id}><Icon size={22} /><h3>{f.label}</h3>
        <button className="primary-button" disabled={!!busy} onClick={() => download(f.id)} aria-label={`Export ${f.id.toUpperCase()}`}><Download size={14} /> Export {f.id.toUpperCase()}</button>{busy === f.id && <Spinner label="Preparing..." />}</div>; })}
    </section>
    <section className="panel pad"><h3>Audit log</h3>
      <div className="table-wrap"><table><thead><tr><th>WHEN</th><th>USER</th><th>ACTION</th><th>DETAIL</th></tr></thead><tbody>
        {audit.map((a, i) => <tr key={i}><td>{new Date(a.at).toLocaleString()}</td><td>{a.user}</td><td>{a.action}</td><td className="expected">{a.detail}</td></tr>)}
      </tbody></table>{audit.length === 0 && <div className="empty-state">No audit entries.</div>}</div>
    </section>
  </>;
}
