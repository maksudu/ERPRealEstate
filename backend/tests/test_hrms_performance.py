from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.hrms.models import PerformanceRecord
from app.modules.hrms.performance_api import PERFORMANCE_TYPES, resolve_transition, validate_performance_type
from app.modules.hrms.router import router
from app.modules.hrms.schemas import PerformanceRecordCreate, PerformanceRecordUpdate


@pytest.mark.parametrize("record_type", sorted(PERFORMANCE_TYPES))
def test_all_performance_workspaces_are_supported(record_type):
    validate_performance_type(record_type)


def test_unknown_performance_workspace_is_rejected():
    with pytest.raises(HTTPException) as error:
        validate_performance_type("payroll")
    assert error.value.status_code == 404


def test_performance_payload_validates_fiscal_year_using_july_to_june_dates():
    payload = PerformanceRecordCreate(
        title="Safety inspection KPI",
        fiscal_year="2026-27",
        period_start=date(2026, 7, 1),
        period_end=date(2027, 6, 30),
        details={"weight_pct": 25},
    )
    assert payload.fiscal_year == "2026-27"
    assert payload.details == {"weight_pct": 25}

    with pytest.raises(ValidationError, match="July"):
        PerformanceRecordCreate(
            title="Out of year review",
            fiscal_year="2026-27",
            period_start=date(2027, 7, 1),
        )


def test_performance_scores_are_bounded_to_five():
    with pytest.raises(ValidationError):
        PerformanceRecordCreate(title="Review", score=5.1)


def test_salary_recommendation_approval_only_changes_workflow_state():
    assert resolve_transition("SUBMITTED", "APPROVE", creator_id=12, actor_id=27) == "APPROVED"


@pytest.mark.parametrize("action", ["APPROVE", "REJECT", "RETURN"])
def test_submitter_cannot_review_own_record(action):
    with pytest.raises(HTTPException) as error:
        resolve_transition("SUBMITTED", action, creator_id=12, actor_id=12)
    assert error.value.status_code == 403


def test_approval_requires_authenticated_reviewer_and_submitted_record():
    with pytest.raises(HTTPException) as unauthenticated:
        resolve_transition("SUBMITTED", "APPROVE", creator_id=None, actor_id=None)
    assert unauthenticated.value.status_code == 401

    with pytest.raises(HTTPException) as invalid_state:
        resolve_transition("DRAFT", "APPROVE", creator_id=12, actor_id=27)
    assert invalid_state.value.status_code == 409


def test_performance_api_and_table_are_registered():
    paths = {(route.path, tuple(route.methods or ())) for route in router.routes}
    assert ("/hrms/performance/{record_type}", ("GET",)) in paths
    assert ("/hrms/performance/{record_type}", ("POST",)) in paths
    assert ("/hrms/performance/{record_type}/{record_id}", ("GET",)) in paths
    assert ("/hrms/performance/{record_type}/{record_id}", ("PUT",)) in paths
    assert ("/hrms/performance/{record_type}/{record_id}/transition", ("POST",)) in paths
    assert PerformanceRecord.__tablename__ == "hr_performance_records"
    assert {"record_type", "employee_id", "status", "fiscal_year", "details"}.issubset(
        PerformanceRecord.__table__.columns.keys()
    )


def test_update_schema_remains_partial():
    update = PerformanceRecordUpdate(details={"trainer": "HR Academy"})
    assert update.model_dump(exclude_unset=True) == {"details": {"trainer": "HR Academy"}}
