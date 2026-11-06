import csv
import io
import json

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.schemas.testpack import Category, PackData
from app.services.traceability import build_traceability

CASE_COLS = [
    ("Test Case ID", "id"), ("Requirement ID", "requirement_id"), ("Module", "module"), ("Test Scenario", "scenario"),
    ("Test Type", "test_type"), ("Priority", "priority"), ("Preconditions", "preconditions"), ("Test Steps", "steps"),
    ("Test Data", "test_data"), ("Expected Result", "expected_result"), ("Actual Result", "actual_result"),
    ("Status", "status"), ("Remarks", "remarks"), ("Covers", "covers"), ("Assumption", "assumption_note"),
]

CATEGORY_SHEETS = [
    (Category.functional, "Functional Scenarios"), (Category.positive, "Positive Test Cases"),
    (Category.negative, "Negative Test Cases"), (Category.boundary, "Boundary Test Cases"),
    (Category.role, "Role & Permission Cases"), (Category.integration, "Integration Impacts"),
    (Category.data, "Data Combinations"), (Category.regression, "Regression Impact"),
]

_FORMULA_CHARS = ("=", "+", "-", "@")


def _safe(v):
    """Neutralise spreadsheet formula injection in exported text."""
    if isinstance(v, str) and v.startswith(_FORMULA_CHARS):
        return "'" + v
    return v


def _case_value(tc, key):
    v = getattr(tc, key)
    if key == "steps":
        return "\n".join(f"{i}. {s}" for i, s in enumerate(v, 1))
    if key == "covers":
        return ", ".join(v)
    return v


def case_rows(data: PackData) -> list[list]:
    return [[_case_value(tc, k) for _, k in CASE_COLS] for tc in data.test_cases]


def _sheet(wb: Workbook, title: str, headers: list[str], rows: list[list]):
    ws = wb.create_sheet(title[:31])
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="0B1420")
        c.alignment = Alignment(vertical="center", wrap_text=True)
    for r in rows:
        ws.append([_safe(v) for v in r])
    for i, h in enumerate(headers, 1):
        width = max([len(str(h))] + [min(len(str(r[i - 1])), 60) for r in rows if i - 1 < len(r)] or [10])
        ws.column_dimensions[get_column_letter(i)].width = min(max(width + 2, 12), 62)
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    return ws


def to_xlsx(data: PackData, meta: dict) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Executive Summary"
    cases = data.test_cases
    trace = build_traceability(data)
    summary = [
        ("Requirement ID", data.requirement.requirement_id), ("Title", data.requirement.title),
        ("Source type", data.requirement.source_type.value), ("Pack status", meta.get("status", "")),
        ("Version", meta.get("version", "")), ("Summary", data.analysis.summary),
        ("Total test cases", len(cases)),
    ]
    for cat, label in CATEGORY_SHEETS:
        summary.append((label, sum(1 for t in cases if t.category == cat)))
    summary += [
        ("Risks identified", len(data.risks)), ("Open business questions", len(data.questions)),
        ("Mapped coverage %", trace["summary"]["mapped_coverage_pct"]),
        ("Validated coverage %", trace["summary"]["validated_coverage_pct"]),
        ("Note", "AI-generated draft. Assumptions are flagged and must be confirmed with the business."),
    ]
    ws.append(["Item", "Value"])
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="0B1420")
    for k, v in summary:
        ws.append([k, _safe(v)])
    ws.column_dimensions["A"].width = 30
    ws.column_dimensions["B"].width = 90

    a = data.analysis
    analysis_rows = (
        [["Summary", "", a.summary], ["Business objective", "", a.business_objective]]
        + [["Actor", "", x] for x in a.actors] + [["Entity", "", x] for x in a.entities]
        + [["Workflow", "", x] for x in a.workflows]
        + [["Functional requirement", i.id, i.text] for i in a.functional_requirements]
        + [["Acceptance criterion", i.id, i.text] for i in a.acceptance_criteria]
        + [["Business rule (" + b.basis + ")", b.id, b.text] for b in a.business_rules]
        + [["Mandatory validation", "", x] for x in a.mandatory_validations]
        + [["Dependency", "", x] for x in a.dependencies] + [["Integration point", "", x] for x in a.integration_points]
        + [["Regression impact", i.id, i.text] for i in a.regression_impacts]
        + [["Ambiguity", "", f"{x.statement} - {x.issue}"] for x in a.ambiguities]
    )
    _sheet(wb, "Requirement Analysis", ["Type", "ID", "Detail"], analysis_rows)
    headers = [h for h, _ in CASE_COLS]
    for cat, label in CATEGORY_SHEETS:
        _sheet(wb, label, headers, [[_case_value(t, k) for _, k in CASE_COLS] for t in cases if t.category == cat])
    _sheet(wb, "Risk Register", ["ID", "Category", "Severity", "Likelihood", "Description", "Impact", "Mitigation"],
           [[r.id, r.category, r.severity, r.likelihood, r.description, r.impact, r.mitigation] for r in data.risks])
    _sheet(wb, "Open Questions", ["ID", "Category", "Question", "Why clarification is needed", "Provisional assumption"],
           [[q.id, q.category, q.question, q.why_needed, q.provisional_assumption] for q in data.questions])
    _sheet(wb, "Traceability Matrix", ["Requirement ID", "Type", "Requirement", "Test Case IDs", "Coverage", "Status"],
           [[r["requirement_id"], r["type"], r["requirement"], ", ".join(r["test_case_ids"]), r["coverage"], r["status"]] for r in trace["rows"]])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def to_csv(data: PackData) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Category"] + [h for h, _ in CASE_COLS])
    for tc in data.test_cases:
        w.writerow([tc.category.value] + [_safe(_case_value(tc, k)) for _, k in CASE_COLS])
    return buf.getvalue().encode("utf-8-sig")


def to_json(data: PackData, meta: dict) -> bytes:
    payload = {"meta": meta, "pack": json.loads(data.model_dump_json()), "traceability": build_traceability(data)}
    return json.dumps(payload, indent=2).encode("utf-8")


def to_pdf(data: PackData, meta: dict) -> bytes:
    from xml.sax.saxutils import escape

    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from reportlab.lib import colors

    styles = getSampleStyleSheet()
    small = styles["BodyText"].clone("small")
    small.fontSize = 7
    small.leading = 9

    def p(t):
        return Paragraph(escape(str(t or "")).replace("\n", "<br/>"), small)

    def table(headers, rows, widths):
        t = Table([[p(h) for h in headers]] + [[p(c) for c in r] for r in rows], colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d9e2ee")), ("GRID", (0, 0), (-1, -1), 0.25, colors.grey), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        return t

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    el = [Paragraph("QualiScope AI Test Pack", styles["Title"]),
          Paragraph(escape(f"{data.requirement.requirement_id} {data.requirement.title} - v{meta.get('version')} ({meta.get('status')})"), styles["Heading3"]),
          Paragraph(escape(data.analysis.summary), styles["BodyText"]), Spacer(1, 8)]
    for cat, label in CATEGORY_SHEETS:
        rows = [[t.id, t.scenario, t.priority, "\n".join(f"{i}. {s}" for i, s in enumerate(t.steps, 1)), t.expected_result, t.status]
                for t in data.test_cases if t.category == cat]
        if rows:
            el += [Paragraph(label, styles["Heading2"]), table(["ID", "Scenario", "Priority", "Steps", "Expected result", "Status"], rows, [60, 190, 45, 230, 190, 45])]
    el.append(PageBreak())
    el += [Paragraph("Risk Register", styles["Heading2"]),
           table(["ID", "Category", "Severity", "Description", "Mitigation"], [[r.id, r.category, r.severity, r.description, r.mitigation] for r in data.risks], [40, 90, 55, 320, 255])]
    el += [Paragraph("Open Questions", styles["Heading2"]),
           table(["ID", "Category", "Question", "Why needed"], [[q.id, q.category, q.question, q.why_needed] for q in data.questions], [40, 90, 330, 300])]
    tr = build_traceability(data)
    el += [Paragraph("Traceability Matrix", styles["Heading2"]),
           table(["ID", "Type", "Requirement", "Test cases", "Status"], [[r["requirement_id"], r["type"], r["requirement"], ", ".join(r["test_case_ids"]), r["status"]] for r in tr["rows"]], [45, 90, 330, 220, 60])]
    doc.build(el)
    return buf.getvalue()


MEDIA = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv; charset=utf-8",
    "pdf": "application/pdf",
    "json": "application/json",
}


def export(fmt: str, data: PackData, meta: dict) -> bytes:
    if fmt == "xlsx":
        return to_xlsx(data, meta)
    if fmt == "csv":
        return to_csv(data)
    if fmt == "pdf":
        return to_pdf(data, meta)
    return to_json(data, meta)
