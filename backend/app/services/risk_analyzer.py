from app.schemas.requirement import RequirementAnalysis, RequirementInput
from app.schemas.testpack import GeneratedRisks, Question, Risk
from app.services.ai_service import LLMClient
from app.services.prompts import RISK_SYSTEM
from app.services.requirement_analyzer import analysis_context, requirement_block

SEVERITIES = ["Critical", "High", "Medium", "Low"]


def assess_risks(llm: LLMClient, req: RequirementInput, analysis: RequirementAnalysis) -> list[Risk]:
    user = f"{requirement_block(req)}\n\nAnalysis:\n{analysis_context(analysis)}"
    raw = llm.complete(RISK_SYSTEM, user, GeneratedRisks).risks
    seen: set[str] = set()
    risks: list[Risk] = []
    for r in raw:
        key = r.description.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        sev = r.severity.title() if r.severity.title() in SEVERITIES else "Medium"
        risks.append(Risk(id="R-000", **{**r.model_dump(), "severity": sev}))
    risks.sort(key=lambda r: SEVERITIES.index(r.severity))
    for i, r in enumerate(risks, 1):
        r.id = f"R-{i:03d}"
    return risks


def questions_from_analysis(analysis: RequirementAnalysis) -> list[Question]:
    return [Question(id=f"Q-{i:03d}", **q.model_dump()) for i, q in enumerate(analysis.open_questions, 1)]
