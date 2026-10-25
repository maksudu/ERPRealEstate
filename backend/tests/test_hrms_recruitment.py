import pytest
from fastapi import HTTPException

from app.modules.hrms.models import RecruitmentRecord
from app.modules.hrms.router import RECRUITMENT_RECORD_TYPES, _validate_recruitment_type, router
from app.modules.hrms.schemas import RecruitmentRecordCreate, RecruitmentRecordUpdate


@pytest.mark.parametrize("record_type", sorted(RECRUITMENT_RECORD_TYPES))
def test_recruitment_workspaces_are_registered(record_type):
    _validate_recruitment_type(record_type)


def test_unknown_recruitment_workspace_is_rejected():
    with pytest.raises(HTTPException) as error:
        _validate_recruitment_type("made-up")
    assert error.value.status_code == 404


def test_recruitment_schemas_default_and_preserve_payload():
    create = RecruitmentRecordCreate(title="Senior Engineer")
    assert create.status == "DRAFT"
    assert create.details == {}

    update = RecruitmentRecordUpdate(details={"experience": 6})
    assert update.model_dump(exclude_unset=True) == {"details": {"experience": 6}}


def test_recruitment_api_and_table_are_registered():
    paths = {(route.path, tuple(route.methods or ())) for route in router.routes}
    assert ("/hrms/recruitment/{record_type}", ("GET",)) in paths
    assert ("/hrms/recruitment/{record_type}", ("POST",)) in paths
    assert ("/hrms/recruitment/{record_type}/{record_id}", ("PUT",)) in paths
    assert ("/hrms/recruitment/{record_type}/{record_id}", ("DELETE",)) in paths
    assert RecruitmentRecord.__tablename__ == "hr_recruitment_records"
    assert {"record_type", "code", "title", "department", "status", "details"}.issubset(
        RecruitmentRecord.__table__.columns.keys()
    )


def test_offer_to_onboarding_workspaces_are_registered():
    assert {
        "offer-letters",
        "appointment-letters",
        "joining-checklist",
        "onboarding",
    }.issubset(RECRUITMENT_RECORD_TYPES)
