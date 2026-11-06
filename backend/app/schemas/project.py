from pydantic import BaseModel, Field, field_validator


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    code: str = Field(default="", max_length=30)
    description: str = Field(default="", max_length=2000)

    @field_validator("name", "code", "description")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        if not v:
            raise ValueError("Project name is required.")
        return v


class ProjectOut(BaseModel):
    id: str
    name: str
    code: str
    description: str
    pack_count: int
    created_at: str
    updated_at: str
