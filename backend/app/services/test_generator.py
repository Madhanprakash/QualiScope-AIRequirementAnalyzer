import re
from concurrent.futures import ThreadPoolExecutor

from app.schemas.requirement import RequirementAnalysis, RequirementInput
from app.schemas.testpack import CATEGORY_PREFIX, PRIORITIES, Category, GeneratedCase, GeneratedCases, TestCase
from app.services.ai_service import LLMClient
from app.services.prompts import CATEGORY_GUIDE, GENERATION_SYSTEM
from app.services.requirement_analyzer import analysis_context, requirement_block


def valid_ids(a: RequirementAnalysis) -> set[str]:
    return {i.id for i in a.functional_requirements + a.acceptance_criteria + a.regression_impacts} | {
        b.id for b in a.business_rules
    }


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def generate_category(llm: LLMClient, req: RequirementInput, analysis: RequirementAnalysis, cat: Category) -> list[GeneratedCase]:
    user = (
        f"Category: {cat.value}\nGuidance: {CATEGORY_GUIDE[cat.value]}\n\n"
        f"{requirement_block(req)}\n\nRequirement analysis (use these ids in `covers`):\n{analysis_context(analysis)}"
    )
    return llm.complete(GENERATION_SYSTEM, user, GeneratedCases).test_cases


def build_cases(
    cat: Category,
    generated: list[GeneratedCase],
    req: RequirementInput,
    analysis: RequirementAnalysis,
    existing: list[TestCase],
) -> list[TestCase]:
    """Validate, deduplicate and assign unique ids (stage 8)."""
    ids = valid_ids(analysis)
    prefix = f"TC-{CATEGORY_PREFIX[cat]}-"
    used = {t.id for t in existing}
    seen = {_norm(t.scenario) for t in existing if t.category == cat}
    counter = 0
    out: list[TestCase] = []
    for g in generated:
        key = _norm(g.scenario)
        if not key or key in seen or not g.steps or not g.expected_result.strip():
            continue
        seen.add(key)
        while True:
            counter += 1
            tc_id = f"{prefix}{counter:03d}"
            if tc_id not in used:
                used.add(tc_id)
                break
        out.append(
            TestCase(
                id=tc_id,
                requirement_id=req.requirement_id,
                module=g.module or req.parent,
                scenario=g.scenario.strip(),
                category=cat,
                test_type=g.test_type or cat.value.title(),
                priority=g.priority if g.priority in PRIORITIES else "Medium",
                preconditions=g.preconditions,
                steps=[s.strip() for s in g.steps if s.strip()],
                test_data=g.test_data,
                expected_result=g.expected_result.strip(),
                covers=sorted({c for c in g.covers if c in ids}),
                is_assumption=g.is_assumption,
                assumption_note=g.assumption_note,
            )
        )
    return out


def generate_all(
    llm: LLMClient, req: RequirementInput, analysis: RequirementAnalysis, categories: list[Category], existing: list[TestCase]
) -> list[TestCase]:
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda c: generate_category(llm, req, analysis, c), categories))
    cases: list[TestCase] = []
    for cat, gen in zip(categories, results):
        cases.extend(build_cases(cat, gen, req, analysis, existing + cases))
    return cases
