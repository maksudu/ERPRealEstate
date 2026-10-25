from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.modules.hrms.reports_service import ReportId


class ReportFilters(BaseModel):
    search: str | None = Field(None, max_length=120)
    company_id: int | None = Field(None, ge=1)
    branch_id: int | None = Field(None, ge=1)
    department_id: int | None = Field(None, ge=1)
    designation_id: int | None = Field(None, ge=1)
    project_id: int | None = Field(None, ge=1)
    tower_id: int | None = Field(None, ge=1)
    employee_id: int | None = Field(None, ge=1)
    shift_id: int | None = Field(None, ge=1)
    leave_type_id: int | None = Field(None, ge=1)
    status: str | None = Field(None, max_length=32)
    employment_type: str | None = Field(None, max_length=32)
    separation_type: str | None = Field(None, max_length=50)
    revision_type: str | None = Field(None, max_length=32)
    document_type: str | None = Field(None, max_length=80)
    recruitment_type: str | None = Field(None, max_length=32)
    period_code: str | None = Field(None, max_length=30)
    cost_center: str | None = Field(None, max_length=64)
    financial_year: str | None = Field(None, pattern=r"^\d{4}-\d{4}$")
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_range(self):
        if self.financial_year:
            start_year, end_year = (int(part) for part in self.financial_year.split("-"))
            if end_year != start_year + 1:
                raise ValueError("Bangladesh financial year must cover July through June.")
            if self.start_date is None:
                self.start_date = date(start_year, 7, 1)
            if self.end_date is None:
                self.end_date = date(end_year, 6, 30)
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        return self


class ReportColumn(BaseModel):
    key: str
    label: str


class ReportPage(BaseModel):
    report_id: ReportId
    title: str
    description: str
    columns: list[ReportColumn]
    rows: list[dict[str, Any]]
    total: int
    limit: int
    offset: int


class ReportMetadata(BaseModel):
    id: ReportId
    title: str
    description: str
    filters: list[str]
    sensitive: bool
    source_note: str | None = None


ExportFormat = Literal["csv", "xlsx", "pdf"]
