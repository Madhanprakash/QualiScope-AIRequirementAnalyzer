import React, { useState } from "react";
import { AlertTriangle, HelpCircle, Lightbulb, ShieldAlert, ShieldCheck } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { NoPack, PriorityBadge } from "../components/common";
import { Alert, Badge, Card, CardHeader, CardSection, EmptyState, FilterChips, PageHeader, StatCard, Table } from "../components/ui";
import "./RisksPage.css";

const LEVELS = ["All", "Critical", "High", "Medium", "Low"];

export default function RisksPage({ go }) {
  const { pack } = useApp();
  const [severity, setSeverity] = useState("All");
  if (!pack) return <NoPack go={go} />;

  const { risks, questions } = pack.data;
  const count = level => (level === "All" ? risks.length : risks.filter(r => r.severity === level).length);
  const shown = risks.filter(r => severity === "All" || r.severity === severity);
  const assumptions = questions.filter(q => q.provisional_assumption).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><ShieldAlert size={14} aria-hidden="true" /> Risk</>}
        title="Risk analysis"
        description="Identified risks with severity, likelihood, impact and mitigation, plus the business questions that still need an answer."
      />

      <div className="stat-grid">
        <StatCard icon={ShieldAlert} label="Risks identified" value={risks.length} hint={`${pack.requirement_id || "Pack"} · v${pack.version}`} />
        <StatCard icon={AlertTriangle} label="Critical & high" value={count("Critical") + count("High")} tone="danger" hint="Prioritise in test design" />
        <StatCard icon={HelpCircle} label="Open questions" value={questions.length} tone="warning" hint="Need BA/PO clarification" />
        <StatCard icon={Lightbulb} label="Provisional assumptions" value={assumptions} tone="info" hint="Unconfirmed until answered" />
      </div>

      <Card flush>
        <CardHeader title="Risk register" description="Filter by severity to focus the review." />
        <CardSection className="risks__toolbar">
          <FilterChips
            label="Filter by severity"
            items={LEVELS.map(level => ({ id: level, label: level, count: count(level) }))}
            value={severity}
            onChange={setSeverity}
          />
        </CardSection>
        {shown.length ? (
          <Table label="Risk register" minWidth={980}>
            <thead>
              <tr>
                <th>ID</th><th>Category</th><th>Severity</th><th>Likelihood</th><th>Description</th><th>Impact</th><th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id}>
                  <td className="cell-id">{r.id}</td>
                  <td>{r.category}</td>
                  <td><PriorityBadge value={r.severity} /></td>
                  <td>{r.likelihood}</td>
                  <td className="cell-primary">{r.description}</td>
                  <td className="cell-wide">{r.impact}</td>
                  <td className="cell-wide cell-muted">{r.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState compact icon={ShieldCheck} title="No risks at this severity" description="Choose another severity to see the rest of the register." />
        )}
      </Card>

      <Card>
        <CardHeader
          eyebrow="Open business questions"
          title={`Clarifications needed (${questions.length})`}
          description="Resolve these with the BA/PO before approving the test pack."
        />
        {questions.length ? (
          <ol className="risks__questions">
            {questions.map(q => (
              <li key={q.id} className="risks__question">
                <span className="risks__question-id">{q.id}</span>
                <div className="risks__question-body">
                  <p className="risks__question-title">{q.question}</p>
                  <p className="risks__question-why">Why: {q.why_needed}</p>
                  {q.provisional_assumption && (
                    <Alert tone="warning" className="risks__question-assumption">
                      Provisional assumption (unconfirmed): {q.provisional_assumption}
                    </Alert>
                  )}
                </div>
                <Badge>{q.category}</Badge>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState compact icon={ShieldCheck} title="No open questions" description="Every point in the requirement was clear enough to test." />
        )}
      </Card>
    </div>
  );
}
