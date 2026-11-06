from app.schemas.testpack import PackData

GAP_KEY = {
    "Functional requirement": "uncovered_requirements",
    "Acceptance criterion": "uncovered_acceptance_criteria",
    "Business rule": "uncovered_business_rules",
    "Regression impact": "regression_gaps",
}


def build_traceability(data: PackData) -> dict:
    a = data.analysis
    items = (
        [(i.id, "Functional requirement", i.text) for i in a.functional_requirements]
        + [(i.id, "Acceptance criterion", i.text) for i in a.acceptance_criteria]
        + [(b.id, "Business rule", b.text) for b in a.business_rules]
        + [(i.id, "Regression impact", i.text) for i in a.regression_impacts]
    )
    by_item: dict[str, list] = {iid: [] for iid, _, _ in items}
    unmapped = []
    for tc in data.test_cases:
        mapped = [c for c in tc.covers if c in by_item]
        for c in mapped:
            by_item[c].append(tc)
        if not mapped:
            unmapped.append(tc.id)

    rows = []
    gaps: dict[str, list[str]] = {v: [] for v in GAP_KEY.values()}
    for iid, kind, text in items:
        cases = by_item[iid]
        if not cases:
            status, coverage = "Not covered", "None"
            gaps[GAP_KEY[kind]].append(iid)
        elif all(c.status == "Pass" for c in cases):
            status, coverage = "Validated", "Full"
        elif any(c.status == "Fail" for c in cases):
            status, coverage = "Failing", "Mapped"
        else:
            status, coverage = "Mapped", "Mapped"
        rows.append(
            {
                "requirement_id": iid,
                "type": kind,
                "requirement": text,
                "test_case_ids": [c.id for c in cases],
                "coverage": coverage,
                "status": status,
            }
        )
    total = len(items)
    mapped_n = sum(1 for r in rows if r["test_case_ids"])
    validated_n = sum(1 for r in rows if r["status"] == "Validated")
    return {
        "source_requirement_id": data.requirement.requirement_id,
        "rows": rows,
        "unmapped_test_cases": unmapped,
        "gaps": gaps,
        "summary": {
            "total_items": total,
            "mapped": mapped_n,
            "validated": validated_n,
            "mapped_coverage_pct": round(100 * mapped_n / total, 1) if total else 0.0,
            "validated_coverage_pct": round(100 * validated_n / total, 1) if total else 0.0,
        },
    }
