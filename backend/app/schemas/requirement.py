from enum import Enum

from pydantic import BaseModel, Field, model_validator


class SourceType(str, Enum):
    epic = "Epic"
    feature = "Feature"
    story = "Story"
    task = "Task"
    requirement = "Requirement"
    user_story = "User Story"
    change_request = "Change Request"
    functional_requirement = "Functional Requirement"
    acceptance_criteria = "Acceptance Criteria"


class RequirementInput(BaseModel):
    # Fields mirror the iGreen backlog columns: Item Type, Item Title, Item Desc, Parent,
    # Data Flow Diagram, Acceptance Criteria, Business Validation, Boundary Validation,
    # Integration Points, API Spec.
    source_type: SourceType = SourceType.story
    requirement_id: str = Field(default="", max_length=100)
    title: str = Field(default="", max_length=300)
    description: str = Field(default="", max_length=20000)
    parent: str = Field(default="", max_length=300)
    data_flow_diagram: str = Field(default="", max_length=20000)
    acceptance_criteria: str = Field(default="", max_length=10000)
    business_validation: str = Field(default="", max_length=10000)
    boundary_validation: str = Field(default="", max_length=10000)
    integration_points: str = Field(default="", max_length=10000)
    api_spec: str = Field(default="", max_length=20000)

    @model_validator(mode="after")
    def _has_content(self):
        body = " ".join([self.title, self.description, self.acceptance_criteria]).strip()
        if len(body) < 10:
            raise ValueError("Provide a title, description or acceptance criteria (at least 10 characters).")
        return self


# ---- AI analysis output (also used as the LLM structured-output schema) ----
class Item(BaseModel):
    id: str
    text: str


class BusinessRule(BaseModel):
    id: str
    text: str
    basis: str  # "stated" when explicit in the source, "inferred" when implied and needing confirmation


class Ambiguity(BaseModel):
    statement: str
    issue: str


class OpenQuestion(BaseModel):
    question: str
    category: str
    why_needed: str
    provisional_assumption: str  # empty string when none is needed


class RequirementAnalysis(BaseModel):
    summary: str
    business_objective: str
    actors: list[str]
    entities: list[str]
    workflows: list[str]
    functional_requirements: list[Item]
    acceptance_criteria: list[Item]
    business_rules: list[BusinessRule]
    mandatory_validations: list[str]
    dependencies: list[str]
    integration_points: list[str]
    regression_impacts: list[Item]
    ambiguities: list[Ambiguity]
    open_questions: list[OpenQuestion]
    potential_risks: list[str]
