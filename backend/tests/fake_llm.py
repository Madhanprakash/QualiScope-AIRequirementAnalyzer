"""Deterministic stand-in for the LLM, used ONLY by automated tests / e2e harness."""
from app.schemas.requirement import (
    Ambiguity, BusinessRule, Item, OpenQuestion, RequirementAnalysis,
)
from app.schemas.testpack import GeneratedCase, GeneratedCases, GeneratedRisk, GeneratedRisks


class FakeLLM:
    def __init__(self):
        self.calls = []

    def complete(self, system, user, schema):
        self.calls.append(schema.__name__)
        if schema is RequirementAnalysis:
            return RequirementAnalysis(
                summary="Admin edits delivery completion date.", business_objective="Keep delivery records accurate.",
                actors=["Admin"], entities=["Delivery"], workflows=["Edit date"],
                functional_requirements=[Item(id="x", text="Admin can modify completion date")],
                acceptance_criteria=[Item(id="x", text="Date persists after save")],
                business_rules=[BusinessRule(id="x", text="Only Admin may edit", basis="stated"),
                                BusinessRule(id="x", text="No edits after invoicing", basis="inferred")],
                mandatory_validations=["Valid date"], dependencies=["Billing"], integration_points=["Delivery API"],
                regression_impacts=[Item(id="x", text="Delivery reports")],
                ambiguities=[Ambiguity(statement="modify", issue="Which statuses?")],
                open_questions=[OpenQuestion(question="Can date change after invoicing?", category="Workflow",
                                             why_needed="Financial impact", provisional_assumption="")],
                potential_risks=["Unauthorized change"],
            )
        if schema is GeneratedCases:
            cat = user.split("\n", 1)[0].replace("Category: ", "").strip()
            cases = [
                GeneratedCase(module="Delivery", scenario=f"{cat} scenario {i}", test_type=cat.title(), priority="High",
                              preconditions="Logged in", steps=["Open record", "Change date", "Save"], test_data="2026-01-31",
                              expected_result="Date saved", covers=["FR-001", "BR-001", "ZZ-999"] if i == 1 else ["AC-001", "RI-001"],
                              is_assumption=i == 2, assumption_note="TBC" if i == 2 else "")
                for i in (1, 2)
            ]
            cases.append(cases[0].model_copy())  # duplicate to exercise dedup
            return GeneratedCases(test_cases=cases)
        if schema is GeneratedRisks:
            return GeneratedRisks(risks=[
                GeneratedRisk(category="Security", description="Direct API access", severity="Low", likelihood="Medium", impact="Data tampering", mitigation="Server-side authz"),
                GeneratedRisk(category="Business", description="Post-invoice edits", severity="critical", likelihood="High", impact="Billing mismatch", mitigation="Lock after invoice"),
                GeneratedRisk(category="Business", description="post-invoice edits", severity="High", likelihood="High", impact="dup", mitigation="dup"),
            ])
        raise AssertionError(schema)
