import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.sanitize import clean_text
from app.core.security import User, get_current_user, require_role
from app.database.session import get_db
from app.models.models import AuditLogRow, PackRow, PackVersionRow
from app.schemas.requirement import RequirementAnalysis, RequirementInput
from app.schemas.testpack import (
    ApproveRequest, ExportRequest, GenerateRequest, ManualCaseIn, PackData, PackOut, PackSummary, RegenerateRequest, TestCasePatch,
)
from app.services import export_service, pack_service, requirement_analyzer
from app.services.ai_service import AIUnavailable, get_llm
from app.services.document_parser import extract_text
from app.services.traceability import build_traceability

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

viewer = Depends(get_current_user)
editor = Depends(require_role("editor"))
admin = Depends(require_role("admin"))


def llm_or_503():
    try:
        return get_llm()
    except AIUnavailable as exc:
        raise HTTPException(503, str(exc))


def ai_call(fn, *args):
    try:
        return fn(*args)
    except AIUnavailable as exc:
        log.error("AI failure: %s", exc)
        raise HTTPException(502, str(exc))


@router.get("/health")
def health(settings: Settings = Depends(get_settings)):
    return {"status": "ok", "ai_configured": bool(settings.anthropic_api_key), "model": settings.anthropic_model, "auth_enabled": settings.auth_enabled}


@router.get("/me")
def me(user: User = viewer):
    return {"name": user.name, "role": user.role}


# ---- Requirements ----
@router.post("/requirements/analyze", response_model=RequirementAnalysis)
def analyze(req: RequirementInput, _: User = editor):
    return ai_call(requirement_analyzer.analyze_requirement, llm_or_503(), req)


@router.post("/requirements/extract")
async def extract(file: UploadFile = File(...), _: User = editor, settings: Settings = Depends(get_settings)):
    limit = settings.max_upload_mb * 1024 * 1024
    content = await file.read(limit + 1)
    text = extract_text(file.filename or "", content, limit)
    return {"filename": file.filename, "text": clean_text(text, 20000)}


# ---- Test packs ----
@router.post("/test-pack/generate", response_model=PackOut, status_code=201)
def generate(body: GenerateRequest, db: Session = Depends(get_db), user: User = editor):
    row = ai_call(pack_service.generate_pack, db, llm_or_503(), body.requirement, body.analysis, body.categories, user.name)
    return pack_service.out_of(row)


@router.get("/test-pack", response_model=list[PackSummary])
def list_packs(db: Session = Depends(get_db), _: User = viewer, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    rows = db.execute(select(PackRow).order_by(PackRow.updated_at.desc()).limit(limit).offset(offset)).scalars().all()
    return [pack_service.summary_of(r) for r in rows]


@router.get("/test-pack/{pack_id}", response_model=PackOut)
def get_pack(pack_id: str, db: Session = Depends(get_db), _: User = viewer,
             page: int = Query(1, ge=1), page_size: int = Query(500, ge=1, le=1000)):
    out = pack_service.out_of(pack_service.get_row(db, pack_id))
    start = (page - 1) * page_size
    out.data.test_cases = out.data.test_cases[start:start + page_size]
    return out


@router.put("/test-pack/{pack_id}", response_model=PackOut)
def put_pack(pack_id: str, data: PackData, db: Session = Depends(get_db), user: User = editor):
    return pack_service.out_of(pack_service.replace_pack(db, pack_service.get_row(db, pack_id), data, user.name))


@router.delete("/test-pack/{pack_id}", status_code=204)
def delete_pack(pack_id: str, db: Session = Depends(get_db), user: User = admin):
    row = pack_service.get_row(db, pack_id)
    pack_service.audit(db, pack_id, user.name, "delete_pack", row.title)
    for v in db.execute(select(PackVersionRow).where(PackVersionRow.pack_id == pack_id)).scalars():
        db.delete(v)
    db.delete(row)
    db.commit()
    return Response(status_code=204)


@router.post("/test-pack/{pack_id}/regenerate", response_model=PackOut)
def regenerate(pack_id: str, body: RegenerateRequest, db: Session = Depends(get_db), user: User = editor):
    row = pack_service.get_row(db, pack_id)
    return pack_service.out_of(ai_call(pack_service.regenerate, db, llm_or_503(), row, body.categories, body.overwrite_edited, body.confirm_approved, user.name))


@router.post("/test-pack/{pack_id}/test-cases", response_model=PackOut, status_code=201)
def add_case(pack_id: str, body: ManualCaseIn, db: Session = Depends(get_db), user: User = editor):
    return pack_service.out_of(pack_service.add_manual_case(db, pack_service.get_row(db, pack_id), body, user.name))


@router.patch("/test-pack/{pack_id}/test-cases/{case_id}", response_model=PackOut)
def edit_case(pack_id: str, case_id: str, body: TestCasePatch, db: Session = Depends(get_db), user: User = editor):
    return pack_service.out_of(pack_service.update_case(db, pack_service.get_row(db, pack_id), case_id, body, user.name))


@router.patch("/test-pack/{pack_id}/test-cases/{case_id}/execution", response_model=PackOut)
def execute_case(pack_id: str, case_id: str, body: TestCasePatch, db: Session = Depends(get_db), user: User = editor):
    return pack_service.out_of(pack_service.update_case(db, pack_service.get_row(db, pack_id), case_id, body, user.name, execution_only=True))


@router.delete("/test-pack/{pack_id}/test-cases/{case_id}", response_model=PackOut)
def remove_case(pack_id: str, case_id: str, db: Session = Depends(get_db), user: User = editor):
    return pack_service.out_of(pack_service.delete_case(db, pack_service.get_row(db, pack_id), case_id, user.name))


@router.post("/test-pack/{pack_id}/approve", response_model=PackOut)
def approve(pack_id: str, body: ApproveRequest, db: Session = Depends(get_db), user: User = admin):
    return pack_service.out_of(pack_service.set_approval(db, pack_service.get_row(db, pack_id), body.approved, user.name))


@router.get("/test-pack/{pack_id}/versions")
def versions(pack_id: str, db: Session = Depends(get_db), _: User = viewer):
    row = pack_service.get_row(db, pack_id)
    snaps = db.execute(select(PackVersionRow).where(PackVersionRow.pack_id == pack_id).order_by(PackVersionRow.version)).scalars().all()
    return {"current": row.version, "versions": [{"version": s.version, "note": s.note, "created_at": s.created_at.isoformat()} for s in snaps]}


@router.get("/test-pack/{pack_id}/compare")
def compare(pack_id: str, a: int, b: int, db: Session = Depends(get_db), _: User = viewer):
    return pack_service.compare_versions(db, pack_service.get_row(db, pack_id), a, b)


@router.get("/test-pack/{pack_id}/audit")
def audit_log(pack_id: str, db: Session = Depends(get_db), _: User = viewer):
    pack_service.get_row(db, pack_id)
    rows = db.execute(select(AuditLogRow).where(AuditLogRow.pack_id == pack_id).order_by(AuditLogRow.id.desc()).limit(200)).scalars().all()
    return [{"user": r.user, "action": r.action, "detail": r.detail, "at": r.created_at.isoformat()} for r in rows]


@router.get("/test-pack/{pack_id}/traceability")
def traceability(pack_id: str, db: Session = Depends(get_db), _: User = viewer):
    return build_traceability(PackData(**pack_service.get_row(db, pack_id).data))


@router.post("/test-pack/{pack_id}/export")
def export(pack_id: str, body: ExportRequest, db: Session = Depends(get_db), user: User = viewer):
    row = pack_service.get_row(db, pack_id)
    meta = {"id": row.id, "status": row.status, "version": row.version, "exported_at": datetime.now(timezone.utc).isoformat()}
    content = export_service.export(body.format, PackData(**row.data), meta)
    safe = "".join(ch for ch in (row.requirement_id or row.id[:8]) if ch.isalnum() or ch in "-_") or "pack"
    return Response(content, media_type=export_service.MEDIA[body.format],
                    headers={"Content-Disposition": f'attachment; filename="AI-Test-Pack-{safe}.{body.format}"'})


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), _: User = viewer):
    return pack_service.dashboard(db)
