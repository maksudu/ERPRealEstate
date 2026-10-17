import pytest
from decimal import Decimal
from sqlalchemy import select
from tests.conftest import TestSessionLocal
from app.modules.governance.models import (
    ApprovalPolicy,
    ApprovalPolicyRule,
    ApprovalRequest,
    ApprovalStep,
    ApprovalAuditLog,
    GovernanceNotification
)
from app.modules.governance.services import GovernanceEngineService
from app.modules.governance.schemas import ApprovalRequestCreate, ApprovalActionRequest


@pytest.mark.asyncio
async def test_discount_policy_chain_evaluation():
    """
    Test dynamic threshold chains for Discount Approval:
    - 2.0% discount -> 1 Tier (Sales Manager)
    - 5.0% discount -> 2 Tiers (Sales Manager -> Head of Sales)
    - 9.0% discount -> 3 Tiers (Sales Manager -> Head of Sales -> Managing Director)
    """
    async with TestSessionLocal() as session:
        # 1. 2.0% discount
        payload_2pct = ApprovalRequestCreate(
            document_type="DISCOUNT_APPROVAL",
            document_id="101",
            document_reference_no="BK-TEST-0001",
            maker_user_name="Sales Executive A",
            financial_amount=Decimal("2.00")
        )
        req_2pct = await GovernanceEngineService.evaluate_and_create_request(session, payload_2pct)
        assert req_2pct.total_tiers == 1
        assert req_2pct.status == "PENDING"
        assert req_2pct.current_tier == 1

        # 2. 5.0% discount
        payload_5pct = ApprovalRequestCreate(
            document_type="DISCOUNT_APPROVAL",
            document_id="102",
            document_reference_no="BK-TEST-0002",
            maker_user_name="Sales Executive B",
            financial_amount=Decimal("5.00")
        )
        req_5pct = await GovernanceEngineService.evaluate_and_create_request(session, payload_5pct)
        assert req_5pct.total_tiers == 2

        # 3. 9.0% discount
        payload_9pct = ApprovalRequestCreate(
            document_type="DISCOUNT_APPROVAL",
            document_id="103",
            document_reference_no="BK-TEST-0003",
            maker_user_name="Sales Executive C",
            financial_amount=Decimal("9.00")
        )
        req_9pct = await GovernanceEngineService.evaluate_and_create_request(session, payload_9pct)
        assert req_9pct.total_tiers == 3

        await session.commit()


@pytest.mark.asyncio
async def test_po_financial_limits_chain_evaluation():
    """
    Test PO Financial Authority thresholds:
    - < 1 Lakh (e.g. 50,000 BDT) -> 1 Tier (Project Engineer)
    - 1 to 10 Lakh (e.g. 500,000 BDT) -> 2 Tiers (Project Engineer -> Procurement Head)
    - > 10 Lakh (e.g. 2,000,000 BDT) -> 3 Tiers (Project Engineer -> Procurement Head -> COO/MD)
    """
    async with TestSessionLocal() as session:
        # Tier 1 PO
        po_50k = ApprovalRequestCreate(
            document_type="PURCHASE_ORDER",
            document_id="201",
            document_reference_no="PO-TEST-50K",
            maker_user_name="Procurement Officer 1",
            financial_amount=Decimal("50000.00")
        )
        req_50k = await GovernanceEngineService.evaluate_and_create_request(session, po_50k)
        assert req_50k.total_tiers == 1

        # Tier 2 PO
        po_500k = ApprovalRequestCreate(
            document_type="PURCHASE_ORDER",
            document_id="202",
            document_reference_no="PO-TEST-500K",
            maker_user_name="Procurement Officer 2",
            financial_amount=Decimal("500000.00")
        )
        req_500k = await GovernanceEngineService.evaluate_and_create_request(session, po_500k)
        assert req_500k.total_tiers == 2

        # Tier 3 PO
        po_2m = ApprovalRequestCreate(
            document_type="PURCHASE_ORDER",
            document_id="203",
            document_reference_no="PO-TEST-2M",
            maker_user_name="Procurement Officer 3",
            financial_amount=Decimal("2000000.00")
        )
        req_2m = await GovernanceEngineService.evaluate_and_create_request(session, po_2m)
        assert req_2m.total_tiers == 3

        await session.commit()


@pytest.mark.asyncio
async def test_cancellation_mandatory_3tier():
    """
    Test Customer Booking Cancellation & Refund policy:
    Mandatory 3 tiers: Accounts Auditor -> Head of Sales -> Managing Director.
    """
    async with TestSessionLocal() as session:
        payload = ApprovalRequestCreate(
            document_type="BOOKING_CANCELLATION",
            document_id="301",
            document_reference_no="CAN-TEST-001",
            maker_user_name="Customer Care Agent",
            financial_amount=Decimal("1500000.00")
        )
        req = await GovernanceEngineService.evaluate_and_create_request(session, payload)
        assert req.total_tiers == 3

        # Verify steps roles
        steps = (await session.execute(
            select(ApprovalStep).where(ApprovalStep.request_id == req.id).order_by(ApprovalStep.tier_level)
        )).scalars().all()
        assert len(steps) == 3
        assert steps[0].required_role == "ACCOUNTS_MANAGER"
        assert steps[1].required_role == "HEAD_OF_SALES"
        assert steps[2].required_role == "MANAGING_DIRECTOR"

        await session.commit()


@pytest.mark.asyncio
async def test_maker_checker_step_approval_progression():
    """
    Tests sequential advancement and digital signature stamping:
    1. Maker raises request with 2 tiers.
    2. Tier 1 approves -> request stays PENDING, advances to Tier 2.
    3. Tier 2 approves -> request becomes fully APPROVED.
    """
    async with TestSessionLocal() as session:
        payload = ApprovalRequestCreate(
            document_type="PURCHASE_ORDER",
            document_id="401",
            document_reference_no="PO-PROGRESSION-TEST",
            maker_user_name="Procurement Officer Test",
            financial_amount=Decimal("750000.00") # 2 tiers
        )
        req = await GovernanceEngineService.evaluate_and_create_request(session, payload)
        await session.flush()

        steps = (await session.execute(
            select(ApprovalStep).where(ApprovalStep.request_id == req.id).order_by(ApprovalStep.tier_level)
        )).scalars().all()
        assert len(steps) == 2

        # Step 1 Approval
        action_step1 = ApprovalActionRequest(
            action="APPROVE",
            comments="Site physical demand verified.",
            approver_name="Engr. Farhan",
            ip_address="192.168.1.101"
        )
        req, step1 = await GovernanceEngineService.process_step_action(
            session, req.id, steps[0].id, action_step1
        )
        assert step1.status == "APPROVED"
        assert step1.verification_hash is not None
        assert req.status == "PENDING"
        assert req.current_tier == 2

        # Step 2 Approval (Final Tier)
        action_step2 = ApprovalActionRequest(
            action="APPROVE",
            comments="Comparative statement vendor approved.",
            approver_name="Zubair Alam (Procurement Head)",
            ip_address="192.168.1.102"
        )
        req, step2 = await GovernanceEngineService.process_step_action(
            session, req.id, steps[1].id, action_step2
        )
        assert step2.status == "APPROVED"
        assert step2.verification_hash is not None
        assert req.status == "APPROVED" # Entire request is now complete!
        assert req.final_action_timestamp is not None

        await session.commit()


@pytest.mark.asyncio
async def test_maker_checker_rejection_flow():
    """
    Tests rejection immediately halting the chain and notifying Maker.
    """
    async with TestSessionLocal() as session:
        payload = ApprovalRequestCreate(
            document_type="DISCOUNT_APPROVAL",
            document_id="501",
            document_reference_no="BK-REJECT-TEST",
            maker_user_name="Sales Rep X",
            financial_amount=Decimal("4.50")
        )
        req = await GovernanceEngineService.evaluate_and_create_request(session, payload)
        await session.flush()

        step1 = (await session.execute(
            select(ApprovalStep).where(ApprovalStep.request_id == req.id, ApprovalStep.tier_level == 1)
        )).scalar_one()

        reject_action = ApprovalActionRequest(
            action="REJECT",
            comments="Insufficient down payment. 4.5% discount exceeds commercial margin threshold.",
            approver_name="Sales Manager",
            ip_address="192.168.1.55"
        )
        req, step1 = await GovernanceEngineService.process_step_action(
            session, req.id, step1.id, reject_action
        )
        assert step1.status == "REJECTED"
        assert req.status == "REJECTED"

        # Check audit log
        audit = (await session.execute(
            select(ApprovalAuditLog).where(
                ApprovalAuditLog.request_id == req.id,
                ApprovalAuditLog.action == "REJECTED"
            )
        )).scalar_one_or_none()
        assert audit is not None
        assert "commercial margin threshold" in audit.comment

        await session.commit()


@pytest.mark.asyncio
async def test_maker_checker_correction_requested_flow():
    """
    Tests Request Correction flow allowing Maker amendment.
    """
    async with TestSessionLocal() as session:
        payload = ApprovalRequestCreate(
            document_type="BOOKING_CANCELLATION",
            document_id="601",
            document_reference_no="CAN-CORRECTION-TEST",
            maker_user_name="Customer Care Y",
            financial_amount=Decimal("1200000.00")
        )
        req = await GovernanceEngineService.evaluate_and_create_request(session, payload)
        await session.flush()

        step1 = (await session.execute(
            select(ApprovalStep).where(ApprovalStep.request_id == req.id, ApprovalStep.tier_level == 1)
        )).scalar_one()

        correction_action = ApprovalActionRequest(
            action="REQUEST_CORRECTION",
            comments="Please attach the signed cancellation letter and money receipt vouchers.",
            approver_name="Senior Accounts Auditor",
            ip_address="192.168.1.66"
        )
        req, step1 = await GovernanceEngineService.process_step_action(
            session, req.id, step1.id, correction_action
        )
        assert step1.status == "CORRECTION_REQUESTED"
        assert req.status == "CORRECTION_REQUESTED"

        # Check notification
        notif = (await session.execute(
            select(GovernanceNotification).where(
                GovernanceNotification.request_id == req.id,
                GovernanceNotification.title.ilike("%Correction Needed%")
            )
        )).scalar_one_or_none()
        assert notif is not None

        await session.commit()
