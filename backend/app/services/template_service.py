"""Excel requirement template: build the downloadable .xlsx and parse uploaded ones.

Columns mirror the iGreen backlog sheet (Item Type, Item Title, Item Desc, Parent,
Data Flow Diagram, Acceptance Criteria, Business Validation, Boundary Validation,
Integration Points, API Spec), plus an optional Requirement ID.
"""
import io

from fastapi import HTTPException
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill

# header text -> RequirementInput field
COLUMNS = [
    ("Requirement ID", "requirement_id"),
    ("Item Type", "source_type"),
    ("Item Title", "title"),
    ("Item Desc", "description"),
    ("Parent", "parent"),
    ("Data Flow Diagram", "data_flow_diagram"),
    ("Acceptance Criteria", "acceptance_criteria"),
    ("Business Validation", "business_validation"),
    ("Boundary Validation", "boundary_validation"),
    ("Integration Points", "integration_points"),
    ("API Spec", "api_spec"),
]
def _norm(h) -> str:
    return " ".join(("" if h is None else str(h)).replace("_", " ").split()).lower()


_BY_HEADER = {_norm(h): f for h, f in COLUMNS}
ITEM_TYPES = {"epic": "Epic", "feature": "Feature", "story": "Story", "task": "Task"}
MAX_ROWS = 500

SAMPLE_ROW = [
    "US-101", "Story", "User Login and Role-Based Page Access",
    "As a user, I want to log in securely to the system, so that I can access only the pages and features allowed for my role.",
    "Secure Login & Role-Based Navigation", "",
    "User must enter a valid username and password to access the system.\nSystem must display only the pages allowed for the role of the user.",
    "Only admin-issued usernames are valid; self-registration is not permitted.",
    "Username: text, mandatory.\nPassword: masked text, mandatory, minimum complexity enforced.",
    "Authentication Service integrates with the User/Role master and the system-wide Audit Log.", "",
]


def build_template() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Requirements"
    ws.append([h for h, _ in COLUMNS])
    ws.append(SAMPLE_ROW)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F3A5F")
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = 22 if col[0].column > 3 else 18
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _cell(v) -> str:
    return "" if v is None else str(v).strip()


def parse_template(filename: str, content: bytes, max_bytes: int) -> list[dict]:
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(415, "Unsupported file type. Upload an Excel (.xlsx) file.")
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
    try:
        wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        rows = wb[wb.sheetnames[0]].iter_rows(values_only=True)
        header = next(rows, None)
    except Exception:
        raise HTTPException(422, "Could not read the Excel file.")
    if not header:
        raise HTTPException(422, "The Excel file is empty.")
    idx = {_BY_HEADER[_norm(h)]: i for i, h in enumerate(header) if _norm(h) in _BY_HEADER}
    if "title" not in idx and "description" not in idx:
        raise HTTPException(422, "Header row must include 'Item Title' and/or 'Item Desc'.")
    out = []
    for n, r in enumerate(rows, start=2):  # n = spreadsheet row number
        item = {f: _cell(r[i]) if i < len(r) else "" for f, i in idx.items()}
        if not any(item.values()):
            continue
        item["source_type"] = ITEM_TYPES.get(item.get("source_type", "").lower(), "Story")
        if not item.get("requirement_id"):
            item["requirement_id"] = f"{item['source_type'][:1].upper()}-{n:03d}"  # e.g. S-004 = Story on row 4
        out.append(item)
        if len(out) >= MAX_ROWS:
            break
    if not out:
        raise HTTPException(422, "The Excel file has no data rows.")
    return out
