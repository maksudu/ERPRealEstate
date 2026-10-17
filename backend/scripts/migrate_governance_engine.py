import asyncio
import hashlib
import json
import os
import sys
from decimal import Decimal
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath("backend"))
from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal, engine, Base
import app.modules.lookups.models
import app.modules.auth.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.inventory.models
import app.modules.crm.models
import app.modules.sales.models
import app.modules.installments.models
import app.modules.construction.models
import app.modules.procurement.models
import app.modules.accounts.models
import app.modules.handover.models
import app.modules.operations.models
import app.modules.hrms.models
import app.modules.tax.models
import app.modules.governance.models
from app.modules.governance.models import (
    ApprovalPolicy,
    ApprovalPolicyRule,
    ApprovalRequest,
    ApprovalStep,
    ApprovalAuditLog,
    GovernanceNotification
)
from app.modules.lookups.models import LookupCategory, LookupItem


async def migrate_and_seed_governance():
    print("[INFO] Initializing Governance & Maker-Checker Tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[SUCCESS] Governance tables created successfully.")

    async with AsyncSessionLocal() as session:
        # 1. Seed Dynamic Lookup Categories for Governance
        print("[INFO] Seeding Lookup Categories for Governance Engine...")
        lookup_data = [
            {
                "category_code": "APPROVAL_DOC_TYPE",
                "category_name": "Governance Document Types",
                "description": "Document categories supported by multi-tier Maker-Checker engine",
                "items": [
                    {"code": "DISCOUNT_APPROVAL", "name_en": "Sales Discount Approval", "name_bn": "বিক্রয় ডিসকাউন্ট অনুমোদন", "badge": "#3B82F6", "sort": 1},
                    {"code": "PURCHASE_ORDER", "name_en": "Purchase Order (PO)", "name_bn": "ক্রয় আদেশ (পিও)", "badge": "#10B981", "sort": 2},
                    {"code": "BOOKING_CANCELLATION", "name_en": "Booking Cancellation & Refund", "name_bn": "বুকিং বাতিল ও অর্থ ফেরত", "badge": "#EF4444", "sort": 3},
                    {"code": "CONTRACTOR_RA_BILL", "name_en": "Contractor Running Account (RA) Bill", "name_bn": "ঠিকাদার আরএ বিল", "badge": "#8B5CF6", "sort": 4},
                    {"code": "MATERIAL_REQUISITION", "name_en": "Material Requisition (PR)", "name_bn": "উপকরণ চাহিদা (পিআর)", "badge": "#F59E0B", "sort": 5},
                    {"code": "JOURNAL_VOUCHER", "name_en": "Financial Journal Voucher", "name_bn": "জাবেদা ভাউচার অনুমোদন", "badge": "#6366F1", "sort": 6},
                ]
            },
            {
                "category_code": "GOVERNANCE_ROLE",
                "category_name": "Governance Approver Roles",
                "description": "Authorizing roles within the Maker-Checker governance structure",
                "items": [
                    {"code": "PROJECT_ENGINEER", "name_en": "Project Site Engineer", "name_bn": "সাইট ইঞ্জিনিয়ার", "badge": "#0284C7", "sort": 1},
                    {"code": "PROCUREMENT_HEAD", "name_en": "Head of Procurement", "name_bn": "ক্রয় বিভাগ প্রধান", "badge": "#059669", "sort": 2},
                    {"code": "SALES_MANAGER", "name_en": "Sales Manager", "name_bn": "বিক্রয় ব্যবস্থাপক", "badge": "#2563EB", "sort": 3},
                    {"code": "HEAD_OF_SALES", "name_en": "Head of Sales & Marketing", "name_bn": "বিক্রয় প্রধান", "badge": "#7C3AED", "sort": 4},
                    {"code": "ACCOUNTS_MANAGER", "name_en": "Accounts & Finance Manager", "name_bn": "হিসাব ব্যবস্থাপক", "badge": "#D97706", "sort": 5},
                    {"code": "CHIEF_OPERATING_OFFICER", "name_en": "Chief Operating Officer (COO)", "name_bn": "চিফ অপারেটিং অফিসার", "badge": "#DC2626", "sort": 6},
                    {"code": "MANAGING_DIRECTOR", "name_en": "Managing Director (MD)", "name_bn": "ব্যবস্থাপনা পরিচালক", "badge": "#9333EA", "sort": 7},
                ]
            },
            {
                "category_code": "APPROVAL_ACTION_STATUS",
                "category_name": "Approval Tier Statuses",
                "description": "Status cycle for individual maker-checker authorization tiers",
                "items": [
                    {"code": "PENDING", "name_en": "Pending Review", "name_bn": "পর্যালোচনা পেন্ডিং", "badge": "#F59E0B", "sort": 1},
                    {"code": "APPROVED", "name_en": "Approved & Authorized", "name_bn": "অনুমোদিত", "badge": "#10B981", "sort": 2},
                    {"code": "REJECTED", "name_en": "Rejected", "name_bn": "বাতিল", "badge": "#EF4444", "sort": 3},
                    {"code": "CORRECTION_REQUESTED", "name_en": "Correction Requested", "name_bn": "সংশোধন অনুরোধ", "badge": "#8B5CF6", "sort": 4},
                ]
            }
        ]

        for cat_data in lookup_data:
            existing_cat = (await session.execute(
                select(LookupCategory).where(LookupCategory.category_code == cat_data["category_code"])
            )).scalar_one_or_none()

            if not existing_cat:
                cat = LookupCategory(
                    category_code=cat_data["category_code"],
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_active=True
                )
                session.add(cat)
                await session.flush()
                for item_data in cat_data["items"]:
                    item = LookupItem(
                        category_id=cat.id,
                        item_code=item_data["code"],
                        item_name_en=item_data["name_en"],
                        item_name_bn=item_data["name_bn"],
                        color_badge=item_data["badge"],
                        sort_order=item_data["sort"],
                        is_active=True
                    )
                    session.add(item)
            else:
                for item_data in cat_data["items"]:
                    existing_item = (await session.execute(
                        select(LookupItem).where(
                            LookupItem.category_id == existing_cat.id,
                            LookupItem.item_code == item_data["code"]
                        )
                    )).scalar_one_or_none()
                    if not existing_item:
                        item = LookupItem(
                            category_id=existing_cat.id,
                            item_code=item_data["code"],
                            item_name_en=item_data["name_en"],
                            item_name_bn=item_data["name_bn"],
                            color_badge=item_data["badge"],
                            sort_order=item_data["sort"],
                            is_active=True
                        )
                        session.add(item)

        await session.flush()
        print("[SUCCESS] Lookups seeded.")

        # 2. Seed Configurable Approval Chains (PROMPT 08 requirements)
        print("[INFO] Seeding Configurable Approval Policies...")
        
        # Policy 1: Sales Discount Approval
        discount_pol = (await session.execute(
            select(ApprovalPolicy).where(ApprovalPolicy.policy_code == "POL_DISCOUNT_TIER")
        )).scalar_one_or_none()

        if not discount_pol:
            discount_pol = ApprovalPolicy(
                policy_code="POL_DISCOUNT_TIER",
                policy_name="Customer Booking Discount Policy",
                document_type="DISCOUNT_APPROVAL",
                description="Threshold-based sales discount governance (1-3% Sales Mgr, 3-7% Head of Sales, >7% MD)",
                is_active=True
            )
            session.add(discount_pol)
            await session.flush()

            rules = [
                ApprovalPolicyRule(
                    policy_id=discount_pol.id,
                    tier_level=1,
                    tier_name="Sales Manager Initial Authorization",
                    min_threshold=Decimal("1.00"),
                    max_threshold=Decimal("3.00"),
                    required_role="SALES_MANAGER",
                    is_mandatory=True,
                    sla_hours=12,
                    auto_escalate=False
                ),
                ApprovalPolicyRule(
                    policy_id=discount_pol.id,
                    tier_level=2,
                    tier_name="Head of Sales Commercial Approval",
                    min_threshold=Decimal("3.01"),
                    max_threshold=Decimal("7.00"),
                    required_role="HEAD_OF_SALES",
                    is_mandatory=True,
                    sla_hours=24,
                    auto_escalate=True
                ),
                ApprovalPolicyRule(
                    policy_id=discount_pol.id,
                    tier_level=3,
                    tier_name="Managing Director Final Ratification",
                    min_threshold=Decimal("7.01"),
                    max_threshold=None, # Unbounded > 7%
                    required_role="MANAGING_DIRECTOR",
                    is_mandatory=True,
                    sla_hours=48,
                    auto_escalate=False
                ),
            ]
            session.add_all(rules)

        # Policy 2: Purchase Order Financial Approval
        po_pol = (await session.execute(
            select(ApprovalPolicy).where(ApprovalPolicy.policy_code == "POL_PO_TIER")
        )).scalar_one_or_none()

        if not po_pol:
            po_pol = ApprovalPolicy(
                policy_code="POL_PO_TIER",
                policy_name="Procurement Purchase Order Financial Authority",
                document_type="PURCHASE_ORDER",
                description="PO Financial limits (< 1 Lakh Project Engineer, 1-10 Lakh Procurement Head, > 10 Lakh COO/MD)",
                is_active=True
            )
            session.add(po_pol)
            await session.flush()

            po_rules = [
                ApprovalPolicyRule(
                    policy_id=po_pol.id,
                    tier_level=1,
                    tier_name="Site Project Engineer Technical Sanction",
                    min_threshold=Decimal("0.00"),
                    max_threshold=Decimal("100000.00"), # < 1 Lakh BDT
                    required_role="PROJECT_ENGINEER",
                    is_mandatory=True,
                    sla_hours=12
                ),
                ApprovalPolicyRule(
                    policy_id=po_pol.id,
                    tier_level=2,
                    tier_name="Procurement Head Commercial Clearance",
                    min_threshold=Decimal("100000.01"),
                    max_threshold=Decimal("1000000.00"), # 1 to 10 Lakh BDT
                    required_role="PROCUREMENT_HEAD",
                    is_mandatory=True,
                    sla_hours=24
                ),
                ApprovalPolicyRule(
                    policy_id=po_pol.id,
                    tier_level=3,
                    tier_name="COO / Managing Director Executive Sign-off",
                    min_threshold=Decimal("1000000.01"),
                    max_threshold=None, # > 10 Lakh BDT
                    required_role="CHIEF_OPERATING_OFFICER",
                    is_mandatory=True,
                    sla_hours=48
                ),
            ]
            session.add_all(po_rules)

        # Policy 3: Customer Booking Cancellation & Refund
        cancel_pol = (await session.execute(
            select(ApprovalPolicy).where(ApprovalPolicy.policy_code == "POL_CANCELLATION_REFUND")
        )).scalar_one_or_none()

        if not cancel_pol:
            cancel_pol = ApprovalPolicy(
                policy_code="POL_CANCELLATION_REFUND",
                policy_name="Customer Allotment Cancellation & Refund Governance",
                document_type="BOOKING_CANCELLATION",
                description="Mandatory 3-tier sequential review (Accounts Deduction Audit + Head of Sales Clearance + MD Refund Sign-off)",
                is_active=True
            )
            session.add(cancel_pol)
            await session.flush()

            cancel_rules = [
                ApprovalPolicyRule(
                    policy_id=cancel_pol.id,
                    tier_level=1,
                    tier_name="Accounts Auditor (Collections & Statutory Deduction Audit)",
                    min_threshold=Decimal("0.00"),
                    max_threshold=None,
                    required_role="ACCOUNTS_MANAGER",
                    is_mandatory=True,
                    sla_hours=24
                ),
                ApprovalPolicyRule(
                    policy_id=cancel_pol.id,
                    tier_level=2,
                    tier_name="Head of Sales (Unit Repossession & Relisting Sanction)",
                    min_threshold=Decimal("0.00"),
                    max_threshold=None,
                    required_role="HEAD_OF_SALES",
                    is_mandatory=True,
                    sla_hours=24
                ),
                ApprovalPolicyRule(
                    policy_id=cancel_pol.id,
                    tier_level=3,
                    tier_name="Managing Director (Final Refund Disbursement Approval)",
                    min_threshold=Decimal("0.00"),
                    max_threshold=None,
                    required_role="MANAGING_DIRECTOR",
                    is_mandatory=True,
                    sla_hours=48
                ),
            ]
            session.add_all(cancel_rules)

        # Policy 4: Contractor RA Bill
        ra_pol = (await session.execute(
            select(ApprovalPolicy).where(ApprovalPolicy.policy_code == "POL_RA_BILL")
        )).scalar_one_or_none()

        if not ra_pol:
            ra_pol = ApprovalPolicy(
                policy_code="POL_RA_BILL",
                policy_name="Contractor Running Account (RA) Billing Verification",
                document_type="CONTRACTOR_RA_BILL",
                description="Multi-tier RA Bill review with JMS joint measurement check and tax deduction audit",
                is_active=True
            )
            session.add(ra_pol)
            await session.flush()

            ra_rules = [
                ApprovalPolicyRule(
                    policy_id=ra_pol.id,
                    tier_level=1,
                    tier_name="Project Site Engineer (Physical Quantity Check)",
                    min_threshold=Decimal("0.00"),
                    max_threshold=None,
                    required_role="PROJECT_ENGINEER",
                    is_mandatory=True,
                    sla_hours=24
                ),
                ApprovalPolicyRule(
                    policy_id=ra_pol.id,
                    tier_level=2,
                    tier_name="Accounts Manager (TDS/VDS & Retention Audit)",
                    min_threshold=Decimal("0.00"),
                    max_threshold=None,
                    required_role="ACCOUNTS_MANAGER",
                    is_mandatory=True,
                    sla_hours=24
                ),
            ]
            session.add_all(ra_rules)

        await session.flush()
        print("[SUCCESS] Policies and Rules configured.")

        # 3. Seed Realistic Runtime Approval Requests & Timelines
        existing_req = (await session.execute(
            select(ApprovalRequest).where(ApprovalRequest.request_number == "REQ-2026-0001")
        )).scalar_one_or_none()

        if not existing_req:
            print("[INFO] Seeding Demo Approval Requests & Timeline Audits...")
            
            # Request 1: 5.5% Special Festive Discount on Flat 7A (Pending Tier 2: Head of Sales)
            req1 = ApprovalRequest(
                request_number="REQ-2026-0001",
                document_type="DISCOUNT_APPROVAL",
                document_id="1",
                document_reference_no="BK-2026-0089",
                maker_user_name="Tanvir Ahmed (Senior Sales Executive)",
                maker_notes="Customer Dr. Kamal Hossain is paying 40% upfront down payment by pay order. Special 5.5% festival discount requested.",
                financial_amount=Decimal("5.50"),
                total_tiers=2,
                current_tier=2,
                status="PENDING",
                document_summary={
                    "customer_name": "Dr. Kamal Hossain",
                    "unit_no": "Tower B - Flat 7A (2,150 SFT)",
                    "base_price": 23650000.0,
                    "discount_percent": 5.5,
                    "discount_amount": 1300750.0,
                    "net_contract_value": 22349250.0
                }
            )
            session.add(req1)
            await session.flush()

            # Step 1: Sales Manager Approved
            step1_1 = ApprovalStep(
                request_id=req1.id,
                tier_level=1,
                tier_name="Sales Manager Initial Authorization",
                required_role="SALES_MANAGER",
                assigned_user_name="Rafiqul Islam",
                status="APPROVED",
                action_by_user_name="Rafiqul Islam (Sales Manager)",
                action_timestamp=datetime.now(timezone.utc),
                action_ip_address="192.168.1.45",
                comments="40% upfront down payment verified with bank pay order copy. Recommended for commercial clearance.",
                verification_hash=hashlib.sha256(b"REQ-2026-0001-STEP-1-APPROVED").hexdigest(),
                notification_sent_web=True,
                notification_sent_email=True
            )
            # Step 2: Head of Sales Pending
            step1_2 = ApprovalStep(
                request_id=req1.id,
                tier_level=2,
                tier_name="Head of Sales Commercial Approval",
                required_role="HEAD_OF_SALES",
                assigned_user_name="Nasir Uddin (Head of Sales)",
                status="PENDING",
                notification_sent_web=True,
                notification_sent_mobile=True,
                notification_sent_email=True
            )
            session.add_all([step1_1, step1_2])

            # Audit Logs for Req 1
            audit1_1 = ApprovalAuditLog(
                request_id=req1.id,
                action="SUBMITTED",
                performed_by_name="Tanvir Ahmed",
                ip_address="192.168.1.88",
                comment="Submitted 5.5% discount approval request for Booking BK-2026-0089."
            )
            audit1_2 = ApprovalAuditLog(
                request_id=req1.id,
                step_id=1,
                action="APPROVED",
                performed_by_name="Rafiqul Islam (Sales Manager)",
                ip_address="192.168.1.45",
                comment="Tier 1 approved. Forwarded to Head of Sales Nasir Uddin."
            )
            session.add_all([audit1_1, audit1_2])

            # Request 2: Purchase Order PO-2026-0012 for 1,850,000 BDT (Pending Tier 3: COO/MD)
            req2 = ApprovalRequest(
                request_number="REQ-2026-0002",
                document_type="PURCHASE_ORDER",
                document_id="2",
                document_reference_no="PO-2026-0012",
                maker_user_name="Mahmudul Hasan (Procurement Officer)",
                maker_notes="Bulk order of 500 Bags OPC-52.5 Cement from Meghna Cement Mills Ltd for Level 4 casting.",
                financial_amount=Decimal("1850000.00"),
                total_tiers=3,
                current_tier=3,
                status="PENDING",
                document_summary={
                    "vendor_name": "Meghna Cement Mills Ltd",
                    "material_name": "OPC Cement Grade 52.5N",
                    "ordered_quantity": "500 Bags",
                    "unit_price": 540.0,
                    "total_amount": 1850000.0,
                    "delivery_schedule": "5 Days delivery to Banani Lakeview site"
                }
            )
            session.add(req2)
            await session.flush()

            step2_1 = ApprovalStep(
                request_id=req2.id,
                tier_level=1,
                tier_name="Site Project Engineer Technical Sanction",
                required_role="PROJECT_ENGINEER",
                assigned_user_name="Engr. Farhan",
                status="APPROVED",
                action_by_user_name="Engr. Farhan",
                action_timestamp=datetime.now(timezone.utc),
                action_ip_address="10.0.4.12",
                comments="BOQ budget headroom verified. Technical specifications conform to ASTM C150 Type 1.",
                verification_hash=hashlib.sha256(b"REQ-2026-0002-STEP-1-APPROVED").hexdigest(),
                notification_sent_web=True
            )
            step2_2 = ApprovalStep(
                request_id=req2.id,
                tier_level=2,
                tier_name="Procurement Head Commercial Clearance",
                required_role="PROCUREMENT_HEAD",
                assigned_user_name="Zubair Alam",
                status="APPROVED",
                action_by_user_name="Zubair Alam (Head of Procurement)",
                action_timestamp=datetime.now(timezone.utc),
                action_ip_address="192.168.1.10",
                comments="Comparative statement CS-2026-0008 reviewed. Vendor is lowest bidder with 45-day credit terms.",
                verification_hash=hashlib.sha256(b"REQ-2026-0002-STEP-2-APPROVED").hexdigest(),
                notification_sent_web=True,
                notification_sent_email=True
            )
            step2_3 = ApprovalStep(
                request_id=req2.id,
                tier_level=3,
                tier_name="COO / Managing Director Executive Sign-off",
                required_role="CHIEF_OPERATING_OFFICER",
                assigned_user_name="Barrister Mahin (Chief Operating Officer)",
                status="PENDING",
                notification_sent_web=True,
                notification_sent_mobile=True,
                notification_sent_email=True
            )
            session.add_all([step2_1, step2_2, step2_3])

            # Request 3: Customer Booking Cancellation & Refund CAN-2026-0005 (Pending Tier 1: Accounts)
            req3 = ApprovalRequest(
                request_number="REQ-2026-0003",
                document_type="BOOKING_CANCELLATION",
                document_id="1",
                document_reference_no="CAN-2026-0005",
                maker_user_name="Sharmin Sultana (Customer Care Manager)",
                maker_notes="Buyer relocation abroad. Statutory REHAB 10% deduction applied, net refund BDT 2,700,000 requested.",
                financial_amount=Decimal("2700000.00"),
                total_tiers=3,
                current_tier=1,
                status="PENDING",
                document_summary={
                    "customer_name": "Monirul Islam",
                    "booking_no": "BK-2025-0142",
                    "total_paid": 3000000.0,
                    "statutory_forfeiture_pct": 10.0,
                    "forfeiture_deduction": 300000.0,
                    "net_refund_amount": 2700000.0,
                    "refund_instrument": "PDC Cheque #991024 / Eastern Bank"
                }
            )
            session.add(req3)
            await session.flush()

            step3_1 = ApprovalStep(
                request_id=req3.id,
                tier_level=1,
                tier_name="Accounts Auditor (Collections & Statutory Deduction Audit)",
                required_role="ACCOUNTS_MANAGER",
                assigned_user_name="Khorshed Alam (Senior Accounts Officer)",
                status="PENDING",
                notification_sent_web=True,
                notification_sent_email=True
            )
            step3_2 = ApprovalStep(
                request_id=req3.id,
                tier_level=2,
                tier_name="Head of Sales (Unit Repossession & Relisting Sanction)",
                required_role="HEAD_OF_SALES",
                assigned_user_name="Nasir Uddin (Head of Sales)",
                status="PENDING",
                notification_sent_web=True
            )
            step3_3 = ApprovalStep(
                request_id=req3.id,
                tier_level=3,
                tier_name="Managing Director (Final Refund Disbursement Approval)",
                required_role="MANAGING_DIRECTOR",
                assigned_user_name="Managing Director (Board)",
                status="PENDING",
                notification_sent_web=True,
                notification_sent_mobile=True,
                notification_sent_email=True
            )
            session.add_all([step3_1, step3_2, step3_3])

            # Seed Notifications
            notifs = [
                GovernanceNotification(
                    recipient_user_id=1,
                    request_id=req1.id,
                    channel="WEB",
                    title="Action Required: 5.5% Discount Approval (Flat 7A)",
                    body="Dr. Kamal Hossain booking discount requires Head of Sales authorization.",
                    action_url="/governance/approvals?id=1",
                    status="DELIVERED"
                ),
                GovernanceNotification(
                    recipient_user_id=1,
                    request_id=req2.id,
                    channel="MOBILE_PUSH",
                    title="COO Sign-off Required: PO-2026-0012 (BDT 1,850,000)",
                    body="500 Bags OPC Cement procurement approved by Engr Farhan & Head of Procurement.",
                    action_url="/governance/approvals?id=2",
                    status="DELIVERED"
                ),
                GovernanceNotification(
                    recipient_user_id=1,
                    request_id=req3.id,
                    channel="EMAIL",
                    title="Urgent: Booking Cancellation Refund Audit CAN-2026-0005",
                    body="BDT 2,700,000 refund request awaiting Accounts verification.",
                    action_url="/governance/approvals?id=3",
                    status="DELIVERED"
                ),
            ]
            session.add_all(notifs)

        await session.commit()
        print("[SUCCESS] Governance migration & demo seeding successfully completed.")


if __name__ == "__main__":
    asyncio.run(migrate_and_seed_governance())
