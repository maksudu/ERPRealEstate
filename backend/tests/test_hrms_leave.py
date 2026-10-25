import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.hrms.models import LeaveApplication, LeaveBalance, LeavePolicy
from app.modules.hrms.router import _require_leave_status, _validate_encashment_terms, router
from app.modules.hrms.schemas import LeaveApply, LeaveEncashmentCreate, LeaveUpdate


@pytest.mark.parametrize(
    ("status", "required", "allowed"),
    [
        ("PENDING_MANAGER", "PENDING_MANAGER", True),
        ("PENDING_MANAGER", "PENDING_HR", False),
        ("PENDING_HR", "PENDING_HR", True),
        ("APPROVED", "PENDING_HR", False),
        ("REJECTED", "PENDING_MANAGER", False),
        ("CANCELLED", "PENDING_MANAGER", False),
    ],
)
def test_leave_review_requires_current_workflow_stage(status, required, allowed):
    leave = LeaveApplication(status=status)
    if allowed:
        assert _require_leave_status(leave, required) is None
    else:
        with pytest.raises(HTTPException) as error:
            _require_leave_status(leave, required)
        assert error.value.status_code == 409


def leave_payload(**overrides):
    values = {
        "employee_id": 1,
        "leave_type_id": 2,
        "start_date": "2026-06-10",
        "end_date": "2026-06-11",
        "reason": "Annual family leave"
    }
    values.update(overrides)
    return values


def test_leave_apply_trims_reason_and_accepts_valid_request():
    request = LeaveApply(**leave_payload(reason="  Annual family leave  "))
    assert request.reason == "Annual family leave"


def test_leave_apply_rejects_whitespace_reason_with_actionable_validation():
    with pytest.raises(ValidationError, match="Leave reason is required"):
        LeaveApply(**leave_payload(reason=" \t  "))


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"start_date": "2026-06-12", "end_date": "2026-06-11"}, "End date must be on or after"),
        ({"start_date": "2026-12-31", "end_date": "2027-01-01"}, "single leave year"),
    ],
)
def test_leave_apply_rejects_invalid_date_ranges(overrides, message):
    with pytest.raises(ValidationError, match=message):
        LeaveApply(**leave_payload(**overrides))


def test_leave_update_rejects_whitespace_reason():
    with pytest.raises(ValidationError, match="Leave reason is required"):
        LeaveUpdate(reason="   ")


def test_encashment_terms_accept_within_eligibility_and_cap():
    policy = LeavePolicy(is_active=True, encashment_allowed=True, max_encashment_days=5)
    balance = LeaveBalance(available_days=6)
    _validate_encashment_terms(policy, balance, 2, 2)


def test_encashment_request_requires_positive_days_and_trimmed_reason():
    request = LeaveEncashmentCreate(
        employee_id=1,
        leave_type_id=2,
        year=2026,
        days="1.5",
        reason="  Employee request  "
    )
    assert request.days == 1.5
    assert request.reason == "Employee request"
    with pytest.raises(ValidationError):
        LeaveEncashmentCreate(
            employee_id=1,
            leave_type_id=2,
            year=2026,
            days=0,
            reason="Employee request"
        )
    with pytest.raises(ValidationError, match="Encashment reason is required"):
        LeaveEncashmentCreate(
            employee_id=1,
            leave_type_id=2,
            year=2026,
            days=1,
            reason="   "
        )


@pytest.mark.parametrize(
    ("policy", "balance", "days", "already", "message"),
    [
        (LeavePolicy(is_active=True, encashment_allowed=False, max_encashment_days=5), LeaveBalance(available_days=5), 1, 0, "not enabled"),
        (LeavePolicy(is_active=True, encashment_allowed=True, max_encashment_days=5), LeaveBalance(available_days=1), 2, 0, "Insufficient available"),
        (LeavePolicy(is_active=True, encashment_allowed=True, max_encashment_days=5), LeaveBalance(available_days=5), 2, 4, "annual cap"),
    ],
)
def test_encashment_terms_reject_policy_balance_and_cap_violations(policy, balance, days, already, message):
    with pytest.raises(HTTPException, match=message):
        _validate_encashment_terms(policy, balance, days, already)


def test_leave_workflow_endpoints_are_registered():
    registered = {(route.path, tuple(sorted(route.methods or []))) for route in router.routes}
    assert ("/hrms/leave-applications", ("POST",)) in registered
    assert ("/hrms/holidays/{holiday_id}", ("GET",)) in registered
    assert ("/hrms/leave-encashments", ("GET",)) in registered
    assert ("/hrms/leave-encashments/{encashment_id}/approve", ("POST",)) in registered
