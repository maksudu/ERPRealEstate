from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.dialects import mysql

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.hrms import reports_router
from app.modules.hrms.models import Employee, HRReportExportAudit
from app.modules.hrms.reports_schemas import ReportFilters
from app.modules.hrms.reports_service import (
    REPORT_TITLES,
    ReportId,
    _employee_clauses,
    _employee_from,
    get_report_rows,
    has_report_access,
    turnover_rate,
)


def _fake_db():
    return SimpleNamespace(add=Mock(), commit=AsyncMock(), rollback=AsyncMock(), execute=AsyncMock())


def _client(db, user):
    app = FastAPI()
    app.include_router(reports_router.router)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_twelve_requested_reports_have_persisted_report_identifiers():
    requested = {
        "employee-master", "employee-directory", "employee-headcount", "new-joining",
        "resignation-separation", "employee-transfer", "promotion-increment", "document-expiry",
        "recruitment", "employee-turnover", "manpower-allocation", "employee-loan-advance",
    }
    assert requested.issubset({report.value for report in ReportId})
    assert all(report in REPORT_TITLES for report in ReportId)


def test_bangladesh_financial_year_expands_to_july_through_june():
    filters = ReportFilters(financial_year="2025-2026")
    assert filters.start_date == date(2025, 7, 1)
    assert filters.end_date == date(2026, 6, 30)
    with pytest.raises(ValueError):
        ReportFilters(financial_year="2025-2027")


@pytest.mark.parametrize(
    ("exits", "average", "expected"),
    [(2, 20, 10.0), (0, 0, None), (1, None, None), (0, 15, 0.0)],
)
def test_turnover_rate_uses_average_headcount_and_missing_baseline(exits, average, expected):
    assert turnover_rate(exits, average) == expected


def test_employee_query_scope_and_dimension_joins_are_organization_bound():
    joins, *_ = _employee_from()
    sql = str(select(Employee.id).select_from(joins).where(*_employee_clauses(42, ReportFilters(company_id=7))))
    assert "hr_employees.organization_id = :organization_id_1" in sql
    assert "rpt_employee_department.organization_id = hr_employees.organization_id" in sql
    assert "rpt_employee_designation.organization_id = hr_employees.organization_id" in sql
    assert "rpt_employee_branch_company.organization_id = hr_employees.organization_id" in sql


@pytest.mark.asyncio
async def test_every_report_query_branch_compiles_for_mysql():
    class Result:
        def scalar_one(self):
            return 0

        def mappings(self):
            return self

        def scalars(self):
            return self

        def all(self):
            return []

    class CompileSession:
        async def execute(self, statement):
            statement.compile(dialect=mysql.dialect())
            return Result()

    for report in ReportId:
        await get_report_rows(CompileSession(), report, 21, ReportFilters(), 25, 0)


def test_paginated_rows_use_authenticated_tenant_filters_and_pagination(monkeypatch):
    db = _fake_db()
    user = SimpleNamespace(id=5, organization_id=21, is_group_admin=False)
    captured = {}

    async def fake_rows(_db, report, org_id, filters, limit, offset):
        captured.update(report=report, org_id=org_id, filters=filters, limit=limit, offset=offset)
        return ([{"key": "employee_code", "label": "Employee ID"}], [{"employee_code": "E-1"}], 9)

    monkeypatch.setattr(reports_router, "get_report_rows", fake_rows)
    with _client(db, user) as client:
        response = client.get(
            "/reports/employee-master/rows",
            params={"search": "E-1", "start_date": "2025-07-01", "limit": 2, "offset": 4, "organization_id": 999},
        )
    assert response.status_code == 200
    assert captured["org_id"] == 21
    assert captured["filters"].start_date == date(2025, 7, 1)
    assert (captured["limit"], captured["offset"]) == (2, 4)
    assert response.json()["total"] == 9


@pytest.mark.parametrize(
    ("file_format", "media_type", "signature"),
    [
        ("csv", "text/csv", "Employee ID"),
        ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "PK"),
        ("pdf", "application/pdf", "%PDF"),
        ("print", "text/html", "<!doctype html>"),
    ],
)
def test_export_formats_are_server_generated_and_audited(monkeypatch, file_format, media_type, signature):
    db = _fake_db()
    user = SimpleNamespace(id=5, organization_id=21, is_group_admin=False)

    async def fake_rows(_db, _report, _org_id, _filters, limit, offset):
        return ([{"key": "employee_code", "label": "Employee ID"}], [{"employee_code": "EMP-01"}], 1)

    monkeypatch.setattr(reports_router, "get_report_rows", fake_rows)
    with _client(db, user) as client:
        response = client.get(f"/reports/employee-master/export?format={file_format}")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(media_type)
    assert response.content.lstrip(b"\xef\xbb\xbf").startswith(signature.encode())
    audit = db.add.call_args.args[0]
    assert isinstance(audit, HRReportExportAudit)
    assert audit.allowed is True
    assert audit.outcome == "SUCCESS"
    assert audit.row_count == 1
    assert "content-disposition" in response.headers
    db.commit.assert_awaited_once()


def test_denied_sensitive_export_is_audited_without_storing_search_text(monkeypatch):
    db = _fake_db()
    user = SimpleNamespace(id=5, organization_id=21, is_group_admin=False)
    monkeypatch.setattr(reports_router, "has_report_access", AsyncMock(return_value=False))
    with _client(db, user) as client:
        response = client.get(
            "/reports/employee-loan-advance/export?format=csv",
            params={"search": "raw-bank-account-value"},
        )
    assert response.status_code == 403
    audit = db.add.call_args.args[0]
    assert audit.report_type == "employee-loan-advance"
    assert audit.allowed is False
    assert audit.outcome == "DENIED"
    assert audit.reason == "HR report access is required"
    assert "raw-bank-account-value" not in str(audit.filters)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_sensitive_access_fails_closed_for_unassigned_user():
    db = _fake_db()
    db.execute.return_value = SimpleNamespace(scalar_one_or_none=lambda: None)
    user = SimpleNamespace(id=7, organization_id=21, is_group_admin=False)
    assert await has_report_access(db, user) is False


def test_sensitive_exports_require_authentication():
    app = FastAPI()
    app.include_router(reports_router.router)
    with TestClient(app) as client:
        response = client.get("/reports/employee-loan-advance/export?format=csv")
    assert response.status_code == 401
