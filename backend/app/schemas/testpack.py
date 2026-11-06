from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.requirement import OpenQuestion, RequirementAnalysis, RequirementInput


class Category(str, Enum):
    functional = "functional"
    positive = "positive"
    negative = "negative"
    boundary = "boundary"
    role = "role"
    integration = "integration"
    data = "data"
    regression = "regression"


CATEGORY_PREFIX = {
    Category.functional: "FUN",
    Category.positive: "POS",
    Category.negative: "NEG",
    Category.boundary: "BND",
    Category.role: "ROLE",
    Category.integration: "INT",
    Category.data: "DATA",
    Category.regression: "REG",
}

PRIORITIES = ["Critical", "High", "Medium", "Low"]
STATUSES = ["Not Run", "Pass", "Fail", "Blocked"]


# ---- LLM output shapes ----
class GeneratedCase(BaseModel):
    module: str
    scenario: str
    test_type: str
    priority: str
    preconditions: str
    steps: list[str]
    test_data: str
    expected_result: str
    covers: list[str]  # ids of functional requirements, acceptance criteria, business rules or regression impacts
    is_assumption: bool  # True when the expected result depends on unconfirmed behaviour
    assumption_note: str


class GeneratedCases(BaseModel):
    test_cases: list[GeneratedCase]


class GeneratedRisk(BaseModel):
    category: str
    description: str
    severity: str
    likelihood: str
    impact: str
    mitigation: str


class GeneratedRisks(BaseModel):
    risks: list[GeneratedRisk]


# ---- Persisted shapes ----
class TestCase(BaseModel):
    __test__ = False
    id: str
    requirement_id: str = ""
    module: str = ""
    scenario: str
    category: Category
    test_type: str = ""
    priority: str = "Medium"
    preconditions: str = ""
    steps: list[str] = Field(default_factory=list)
    test_data: str = ""
    expected_result: str = ""
    actual_result: str = ""
    status: str = "Not Run"
    remarks: str = ""
    covers: list[str] = Field(default_factory=list)
    is_assumption: bool = False
    assumption_note: str = ""
    origin: str = "ai"  # ai | manual
    edited: bool = False
    approved: bool = False


class Risk(GeneratedRisk):
    id: str


class Question(OpenQuestion):
    id: str


class PackData(BaseModel):
    requirement: RequirementInput
    analysis: RequirementAnalysis
    test_cases: list[TestCase] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    questions: list[Question] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class PackSummary(BaseModel):
    id: str
    requirement_id: str
    title: str
    status: str
    version: int
    test_case_count: int
    risk_count: int
    question_count: int
    created_at: str
    updated_at: str


class PackOut(PackSummary):
    data: PackData


class GenerateRequest(BaseModel):
    requirement: RequirementInput
    analysis: RequirementAnalysis | None = None
    categories: list[Category] | None = None


class RegenerateRequest(BaseModel):
    categories: list[Category] = Field(min_length=1)
    overwrite_edited: bool = False
    confirm_approved: bool = False


class TestCasePatch(BaseModel):
    __test__ = False
    requirement_id: str | None = None
    module: str | None = None
    scenario: str | None = None
    test_type: str | None = None
    priority: str | None = None
    preconditions: str | None = None
    steps: list[str] | None = None
    test_data: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    status: str | None = None
    remarks: str | None = None
    covers: list[str] | None = None


class ManualCaseIn(TestCasePatch):
    __test__ = False
    scenario: str = Field(min_length=3)
    category: Category


class ExportRequest(BaseModel):
    format: str = Field(pattern="^(xlsx|csv|pdf|json)$")


class ApproveRequest(BaseModel):
    approved: bool = True
