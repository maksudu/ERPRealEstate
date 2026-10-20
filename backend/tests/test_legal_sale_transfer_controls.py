from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.legal.router import (
    _append_sale_agreement_version,
    _validate_sale_transfer_data,
    _validate_sale_transfer_source,
)


@pytest.fixture
def authorized_legal_user():
    return SimpleNamespace(
        id=1,
        username="legal-admin",
        full_name_en="Legal Admin",
        is_group_admin=True,
        project_assignments=[],
    )


def executed_agreement():
    return {
        "document_control_type": "AGREEMENT",
        "booking_id": 2401,
        "customer_id": 501,
        "execution_status": "EXECUTED",
        "customer_signature_date": "2026-09-30",
        "customer_signatory_name": "Buyer One",
        "developer_signature_date": "2026-09-30",
        "developer_signatory_name": "Company Signatory",
        "legal_review_status": "APPROVED",
        "legal_reviewer_identity": "Legal Reviewer",
        "authorized_approver": "legal-admin",
        "authorized_decision": "APPROVED",
        "approval_authorized": True,
        "document_reference": "vault://signed-agreement-1",
        "checksum": "sha256:abc123",
        "agreed_price_bdt": 12500000,
        "agreement_version_history": [],
        "agreement_version_number": 1,
    }


def test_unsigned_agreement_cannot_be_marked_executed(authorized_legal_user):
    payload = {"document_control_type": "AGREEMENT", "execution_status": "EXECUTED"}
    with pytest.raises(HTTPException) as raised:
        _validate_sale_transfer_data(payload, authorized_legal_user)
    assert raised.value.status_code == 422
    assert "cannot be marked executed" in raised.value.detail


def test_executed_agreement_requires_authorized_execution_evidence(authorized_legal_user):
    payload = executed_agreement()
    _validate_sale_transfer_data(payload, authorized_legal_user)

    payload["checksum"] = ""
    with pytest.raises(HTTPException) as raised:
        _validate_sale_transfer_data(payload, authorized_legal_user)
    assert raised.value.status_code == 422


def test_executed_agreement_terms_cannot_be_overwritten(authorized_legal_user):
    data = executed_agreement()
    existing = SimpleNamespace(area="sale_transfer", data=data, project_id=10, reference_no="AGR-1")
    changed = {**data, "agreed_price_bdt": 13000000}

    with pytest.raises(HTTPException) as raised:
        _validate_sale_transfer_data(changed, authorized_legal_user, existing=existing, project_id=10)

    assert raised.value.status_code == 409
    assert "immutable" in raised.value.detail


def test_draft_contract_edits_create_a_version_snapshot():
    old = {
        "document_control_type": "AGREEMENT",
        "agreement_version_number": 3,
        "agreement_version_history": [{"version_number": 1}, {"version_number": 2}],
        "agreed_price_bdt": 10000000,
        "sale_agreement_number": "AGR-2026-001",
    }
    existing = SimpleNamespace(data=old, project_id=10, reference_no="AGR-2026-001")

    updated = _append_sale_agreement_version(
        existing,
        {**old, "agreed_price_bdt": 11000000, "previous_versions_summary": "client supplied"},
        "legal-admin",
        10,
    )

    assert updated["agreement_version_number"] == 4
    assert [row["version_number"] for row in updated["agreement_version_history"]] == [1, 2, 3]
    assert updated["agreement_version_history"][-1]["snapshot"]["agreed_price_bdt"] == 10000000
    assert "previous_versions_summary" not in updated


def test_controlled_request_requires_legal_and_finance_review_before_approval(authorized_legal_user):
    request = {
        "document_control_type": "TRANSFER_REQUEST",
        "source_agreement_record_id": 99,
        "request_owner": "Legal Officer",
        "request_summary": "Buyer substitution request",
        "transfer_workflow_stage": "AUTHORIZED_DECISION",
        "legal_reviewer_identity": "Legal Reviewer",
        "legal_review_status": "APPROVED",
        "financial_clearance_required": True,
        "authorized_approver": "legal-admin",
        "authorized_decision": "APPROVED",
        "approval_authorized": True,
    }

    with pytest.raises(HTTPException) as raised:
        _validate_sale_transfer_data(request, authorized_legal_user)
    assert raised.value.status_code == 422
    assert "financial clearance" in raised.value.detail

    request.update({
        "financial_clearance_status": "CLEARED",
        "financial_clearance_reviewer": "Finance Reviewer",
        "financial_clearance_date": "2026-10-01",
    })
    _validate_sale_transfer_data(request, authorized_legal_user)


def test_rejected_controlled_request_requires_authorized_decision(authorized_legal_user):
    request = {
        "document_control_type": "CANCELLATION_SETTLEMENT",
        "source_agreement_record_id": 99,
        "request_owner": "Legal Officer",
        "request_summary": "Cancellation request review",
        "transfer_workflow_stage": "REJECTED",
        "legal_reviewer_identity": "Legal Reviewer",
        "legal_review_status": "REJECTED",
    }

    with pytest.raises(HTTPException) as raised:
        _validate_sale_transfer_data(request, authorized_legal_user)

    assert raised.value.status_code == 422
    assert "authorized approval or rejection" in raised.value.detail


class FakeDatabase:
    def __init__(self, record):
        self.record = record

    async def get(self, _model, record_id):
        return self.record if self.record.id == record_id else None


@pytest.mark.asyncio
async def test_controlled_request_must_keep_source_booking_and_project():
    source = SimpleNamespace(
        id=99,
        area="sale_transfer",
        project_id=10,
        data={"document_control_type": "AGREEMENT", "execution_status": "EXECUTED", "booking_id": 2401},
    )
    database = FakeDatabase(source)
    request = {
        "document_control_type": "CANCELLATION_SETTLEMENT",
        "source_agreement_record_id": 99,
        "booking_id": 2401,
    }

    await _validate_sale_transfer_source(database, request, None, 10)
    request["booking_id"] = 2402
    with pytest.raises(HTTPException) as raised:
        await _validate_sale_transfer_source(database, request, None, 10)
    assert raised.value.status_code == 422
    assert "ledger booking remains linked" in raised.value.detail
