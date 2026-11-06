import json

from app.core.sanitize import clean_text
from app.schemas.requirement import RequirementAnalysis, RequirementInput
from app.services.ai_service import LLMClient
from app.services.prompts import ANALYSIS_SYSTEM


def requirement_block(req: RequirementInput) -> str:
    fields = {
        "source_type": req.source_type.value,
        "requirement_id": req.requirement_id,
        "title": req.title,
        "description": req.description,
        "parent": req.parent,
        "data_flow_diagram": req.data_flow_diagram,
        "acceptance_criteria": req.acceptance_criteria,
        "business_validation": req.business_validation,
        "boundary_validation": req.boundary_validation,
        "integration_points": req.integration_points,
        "api_spec": req.api_spec,
    }
    body = "\n".join(f"{k}: {clean_text(v) or '(not provided)'}" for k, v in fields.items())
    return f"<source>\n{body}\n</source>"


def analyze_requirement(llm: LLMClient, req: RequirementInput) -> RequirementAnalysis:
    return normalize_analysis(llm.complete(ANALYSIS_SYSTEM, requirement_block(req), RequirementAnalysis))


def normalize_analysis(a: RequirementAnalysis) -> RequirementAnalysis:
    """Guarantee unique, well-formed ids on extracted items."""
    for items, prefix in ((a.functional_requirements, "FR"), (a.acceptance_criteria, "AC"), (a.regression_impacts, "RI")):
        for i, it in enumerate(items, 1):
            it.id = f"{prefix}-{i:03d}"
    for i, br in enumerate(a.business_rules, 1):
        br.id = f"BR-{i:03d}"
        br.basis = "stated" if br.basis.lower().startswith("stat") else "inferred"
    return a


def analysis_context(a: RequirementAnalysis) -> str:
    return json.dumps(a.model_dump(), indent=1)
