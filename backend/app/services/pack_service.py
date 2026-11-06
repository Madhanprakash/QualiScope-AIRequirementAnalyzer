"""Persistence + orchestration for test packs."""
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.sanitize import injection_suspected
from app.models.models import AuditLogRow, PackRow, PackVersionRow
from app.schemas.requirement import RequirementAnalysis, RequirementInput
from app.schemas.testpack import (
    CATEGORY_PREFIX, PRIORITIES, STATUSES, Category, ManualCaseIn, PackData, PackOut, PackSummary, TestCase, TestCasePatch,
)
from app.services import requirement_analyzer, risk_analyzer, test_generator
from app.services.ai_service import LLMClient


def audit(db: Session, pack_id: str, user: str, action: str, detail: str = "") -> None:
    db.add(AuditLogRow(pack_id=pack_id, user=user, action=action, detail=detail[:2000]))


def summary_of(row: PackRow) -> PackSummary:
    d = row.data
    return PackSummary(
        id=row.id, project_id=row.project_id or "", requirement_id=row.requirement_id, title=row.title, status=row.status, version=row.version,
        test_case_count=len(d.get("test_cases", [])), risk_count=len(d.get("risks", [])), question_count=len(d.get("questions", [])),
        created_at=row.created_at.isoformat(), updated_at=row.updated_at.isoformat(),
    )


def out_of(row: PackRow) -> PackOut:
    return PackOut(**summary_of(row).model_dump(), data=PackData(**row.data))


def get_row(db: Session, pack_id: str) -> PackRow:
    row = db.get(PackRow, pack_id)
    if not row:
        raise HTTPException(404, "Test pack not found")
    return row


def save(db: Session, row: PackRow, data: PackData, user: str, action: str, detail: str = "", snapshot: bool = True) -> PackRow:
    if snapshot:
        db.add(PackVersionRow(pack_id=row.id, version=row.version, note=f"{action}: {detail}"[:300], data=row.data))
        row.version += 1
    row.data = data.model_dump(mode="json")
    audit(db, row.id, user, action, detail)
    db.commit()
    db.refresh(row)
    return row


def _guard_mutable(row: PackRow) -> None:
    if row.status == "approved":
        raise HTTPException(409, "Pack is approved. Revoke approval before editing.")


def generate_pack(
    db: Session, llm: LLMClient, req: RequirementInput, analysis: RequirementAnalysis | None,
    categories: list[Category] | None, user: str, project_id: str,
) -> PackRow:
    analysis = analysis or requirement_analyzer.analyze_requirement(llm, req)
    cats = categories or list(Category)
    cases = test_generator.generate_all(llm, req, analysis, cats, [])
    risks = risk_analyzer.assess_risks(llm, req, analysis)
    warnings = []
    if injection_suspected(req.description, req.acceptance_criteria, req.business_validation, req.boundary_validation,
                           req.integration_points, req.api_spec, req.data_flow_diagram):
        warnings.append("Input contains text resembling prompt-injection instructions; it was treated as data only. Review the output carefully.")
    empty = [c.value for c in cats if not any(t.category == c for t in cases)]
    if empty:
        warnings.append("No cases were produced for: " + ", ".join(empty))
    data = PackData(requirement=req, analysis=analysis, test_cases=cases, risks=risks,
                    questions=risk_analyzer.questions_from_analysis(analysis), warnings=warnings)
    row = PackRow(id=str(uuid.uuid4()), project_id=project_id, requirement_id=req.requirement_id, title=req.title or req.description[:80],
                  status="draft", version=1, data=data.model_dump(mode="json"))
    db.add(row)
    audit(db, row.id, user, "generate", f"{len(cases)} cases, {len(risks)} risks")
    db.commit()
    db.refresh(row)
    return row


def regenerate(db: Session, llm: LLMClient, row: PackRow, cats: list[Category], overwrite_edited: bool, confirm_approved: bool, user: str) -> PackRow:
    if row.status == "approved" and not confirm_approved:
        raise HTTPException(409, "Pack is approved. Set confirm_approved=true to regenerate.")
    data = PackData(**row.data)
    protected = lambda t: t.category in cats and (t.edited or t.approved or t.origin == "manual")
    keep = [t for t in data.test_cases if t.category not in cats or (protected(t) and not overwrite_edited)]
    fresh = test_generator.generate_all(llm, data.requirement, data.analysis, cats, keep)
    data.test_cases = sorted(keep + fresh, key=lambda t: (list(Category).index(t.category), t.id))
    if row.status == "approved":
        row.status = "draft"
    return save(db, row, data, user, "regenerate", ", ".join(c.value for c in cats))


def _validate_case_fields(p: TestCasePatch) -> None:
    if p.priority is not None and p.priority not in PRIORITIES:
        raise HTTPException(422, f"priority must be one of {PRIORITIES}")
    if p.status is not None and p.status not in STATUSES:
        raise HTTPException(422, f"status must be one of {STATUSES}")


def update_case(db: Session, row: PackRow, case_id: str, patch: TestCasePatch, user: str, execution_only: bool = False) -> PackRow:
    _validate_case_fields(patch)
    data = PackData(**row.data)
    tc = next((t for t in data.test_cases if t.id == case_id), None)
    if not tc:
        raise HTTPException(404, "Test case not found")
    changes = patch.model_dump(exclude_none=True)
    exec_fields = {"actual_result", "status", "remarks"}
    if execution_only and not set(changes) <= exec_fields:
        raise HTTPException(422, "Only execution fields can be updated here")
    if not execution_only:
        _guard_mutable(row)
    for k, v in changes.items():
        setattr(tc, k, v)
    if set(changes) - exec_fields:
        tc.edited = True
    return save(db, row, data, user, "execute" if execution_only else "edit_case", f"{case_id}: {', '.join(changes)}", snapshot=not execution_only)


def add_manual_case(db: Session, row: PackRow, body: ManualCaseIn, user: str) -> PackRow:
    _guard_mutable(row)
    _validate_case_fields(body)
    data = PackData(**row.data)
    prefix = f"TC-{CATEGORY_PREFIX[body.category]}-"
    n = 1 + max([int(t.id.rsplit("-", 1)[1]) for t in data.test_cases if t.id.startswith(prefix) and t.id.rsplit("-", 1)[1].isdigit()] or [0])
    fields = body.model_dump(exclude_none=True)
    fields.pop("category")
    tc = TestCase(id=f"{prefix}{n:03d}", category=body.category, origin="manual", edited=True,
                  requirement_id=body.requirement_id or data.requirement.requirement_id, **fields)
    data.test_cases.append(tc)
    return save(db, row, data, user, "add_case", tc.id)


def delete_case(db: Session, row: PackRow, case_id: str, user: str) -> PackRow:
    _guard_mutable(row)
    data = PackData(**row.data)
    if not any(t.id == case_id for t in data.test_cases):
        raise HTTPException(404, "Test case not found")
    data.test_cases = [t for t in data.test_cases if t.id != case_id]
    return save(db, row, data, user, "delete_case", case_id)


def set_approval(db: Session, row: PackRow, approved: bool, user: str) -> PackRow:
    data = PackData(**row.data)
    for t in data.test_cases:
        t.approved = approved
    row.status = "approved" if approved else "draft"
    return save(db, row, data, user, "approve" if approved else "revoke_approval", "", snapshot=True)


def replace_pack(db: Session, row: PackRow, data: PackData, user: str) -> PackRow:
    _guard_mutable(row)
    ids = [t.id for t in data.test_cases]
    if len(ids) != len(set(ids)):
        raise HTTPException(422, "Duplicate test case IDs are not allowed")
    row.requirement_id, row.title = data.requirement.requirement_id, data.requirement.title or row.title
    return save(db, row, data, user, "update_pack", f"{len(ids)} cases")


def compare_versions(db: Session, row: PackRow, a: int, b: int) -> dict:
    def load(v: int) -> dict:
        if v == row.version:
            return row.data
        snap = db.execute(select(PackVersionRow).where(PackVersionRow.pack_id == row.id, PackVersionRow.version == v)).scalars().first()
        if not snap:
            raise HTTPException(404, f"Version {v} not found")
        return snap.data

    ca = {t["id"]: t for t in load(a)["test_cases"]}
    cb = {t["id"]: t for t in load(b)["test_cases"]}
    changed = [i for i in ca.keys() & cb.keys() if ca[i] != cb[i]]
    return {"from": a, "to": b, "added": sorted(cb.keys() - ca.keys()), "removed": sorted(ca.keys() - cb.keys()),
            "changed": [{"id": i, "fields": [k for k in cb[i] if ca[i].get(k) != cb[i][k]]} for i in sorted(changed)]}


def dashboard(db: Session, project_id: str | None = None) -> dict:
    q = select(PackRow)
    if project_id:
        q = q.where(PackRow.project_id == project_id)
    rows = db.execute(q).scalars().all()
    by_cat = {c.value: 0 for c in Category}
    risks = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    statuses = {s: 0 for s in STATUSES}
    questions = 0
    cases_total = 0
    for r in rows:
        d = r.data
        questions += len(d.get("questions", []))
        for t in d.get("test_cases", []):
            cases_total += 1
            by_cat[t["category"]] = by_cat.get(t["category"], 0) + 1
            statuses[t.get("status", "Not Run")] = statuses.get(t.get("status", "Not Run"), 0) + 1
        for k in d.get("risks", []):
            risks[k["severity"]] = risks.get(k["severity"], 0) + 1
    return {
        "requirements_analyzed": len(rows), "total_test_cases": cases_total, "by_category": by_cat,
        "risks_by_severity": risks, "total_risks": sum(risks.values()), "open_questions": questions,
        "execution_status": statuses, "approved_packs": sum(1 for r in rows if r.status == "approved"),
        "recent": [summary_of(r).model_dump() for r in sorted(rows, key=lambda r: r.updated_at, reverse=True)[:5]],
    }


def count_packs(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(PackRow)) or 0
