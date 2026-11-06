import React, { useEffect, useState } from "react";
import { Download, FileDown, FileJson, FileSpreadsheet, FileText, History, Rows3 } from "lucide-react";
import { api, errorMessage, saveBlob } from "../services/api";
import { useApp } from "../hooks/useApp";
import { NoPack, StatusBadge } from "../components/common";
import { Avatar, Badge, Button, Card, CardFooter, CardHeader, EmptyState, PageHeader, Table } from "../components/ui";
import "./ReportsPage.css";

const FORMATS = [
  { id: "xlsx", label: "Excel workbook", description: "13 sheets including test cases, risks and traceability", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", description: "All test cases in one flat file", icon: Rows3 },
  { id: "pdf", label: "PDF report", description: "Printable report for review and approval", icon: FileText },
  { id: "json", label: "JSON", description: "Pack data and traceability for tooling", icon: FileJson }
];

const ACTION_TONE = {
  generate: "accent", regenerate: "accent", execute: "info",
  approve: "success", revoke_approval: "warning", delete_case: "danger", delete_pack: "danger"
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "revoke_approval" -> "Revoke approval", "draft" -> "Draft" */
const humanize = value => {
  const text = String(value || "").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

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

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><FileDown size={14} aria-hidden="true" /> Reports</>}
        title="Reports and export"
        description="Download the consolidated AI Test Pack in the format your team needs."
        meta={
          <>
            <StatusBadge value={humanize(pack.status)} />
            <span className="text-sm muted">
              {pack.requirement_id || "Pack"} · v{pack.version} · {plural(pack.test_case_count, "test case")} · {plural(pack.risk_count, "risk")} · {plural(pack.question_count, "open question")}
            </span>
          </>
        }
      />

      <div className="reports__formats">
        {FORMATS.map(f => {
          const Icon = f.icon;
          return (
            <Card key={f.id} className="reports__format">
              <div className="reports__head">
                <span className="reports__icon"><Icon size={20} aria-hidden="true" /></span>
                <CardHeader title={f.label} description={f.description} />
                <Badge className="mono">.{f.id}</Badge>
              </div>
              <Button
                variant={f.id === "xlsx" ? "primary" : "secondary"}
                icon={Download}
                block
                loading={busy === f.id}
                disabled={!!busy}
                onClick={() => download(f.id)}
                aria-label={`Export ${f.id.toUpperCase()}`}
              >
                {busy === f.id ? "Preparing…" : "Export"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card flush>
        <CardHeader title="Audit log" description="Changes to this test pack, newest first." />
        {audit.length ? (
          <>
            <Table label="Audit log" minWidth={760}>
              <thead>
                <tr>
                  <th>When</th><th>User</th><th>Action</th><th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td className="cell-tight tabular"><time dateTime={a.at}>{new Date(a.at).toLocaleString()}</time></td>
                    <td className="cell-tight">
                      <span className="row"><Avatar name={a.user || ""} size="sm" />{a.user}</span>
                    </td>
                    <td className="cell-tight"><Badge tone={ACTION_TONE[a.action] || "neutral"}>{humanize(a.action)}</Badge></td>
                    <td className="cell-wide cell-muted">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <CardFooter><span>{plural(audit.length, "entry", "entries")}</span></CardFooter>
          </>
        ) : (
          <EmptyState
            compact
            icon={History}
            title="No audit entries yet"
            description="Changes to this pack will be listed here."
          />
        )}
      </Card>
    </div>
  );
}
