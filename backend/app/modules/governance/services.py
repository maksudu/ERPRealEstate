import hashlib
import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.governance.models import (
    ApprovalPolicy,
    ApprovalPolicyRule,
    ApprovalRequest,
    ApprovalStep,
    ApprovalAuditLog,
    GovernanceNotification
)
from app.modules.governance.schemas import ApprovalRequestCreate, ApprovalActionRequest


class GovernanceEngineService:
    @staticmethod
    async def get_applicable_policy(
        session: AsyncSession, document_type: str, project_id: Optional[int] = None
    ) -> Optional[ApprovalPolicy]:
        """
        Locates the active approval policy for a document type.
        Prioritizes project-specific policies over global policies.
        """
        query = (
            select(ApprovalPolicy)
            .where(
                ApprovalPolicy.document_type == document_type,
                ApprovalPolicy.is_active == True
            )
        )
        if project_id:
            query = query.where(
                or_(ApprovalPolicy.project_id == project_id, ApprovalPolicy.project_id.is_(None))
            ).order_by(ApprovalPolicy.project_id.desc().nullslast())
        else:
            query = query.where(ApprovalPolicy.project_id.is_(None))

        result = await session.execute(query)
        return result.scalars().first()

    @staticmethod
    async def evaluate_and_create_request(
        session: AsyncSession, payload: ApprovalRequestCreate
    ) -> ApprovalRequest:
        """
        Dynamic Policy Chain Evaluation & Request Generation:
        1. Evaluates active policies and threshold rules for document_type.
        2. Determines the ordered sequence of required tiers.
        3. Instantiates ApprovalRequest and ApprovalStep entities.
        4. Logs the SUBMITTED audit record and emits multi-channel notifications.
        """
        policy = await GovernanceEngineService.get_applicable_policy(
            session, payload.document_type, payload.project_id
        )

        amount = Decimal(str(payload.financial_amount))

        applicable_rules: List[ApprovalPolicyRule] = []

        if policy:
            # Query active rules ordered by tier_level
            rules_query = (
                select(ApprovalPolicyRule)
                .where(ApprovalPolicyRule.policy_id == policy.id)
                .order_by(ApprovalPolicyRule.tier_level.asc())
            )
            rules_res = await session.execute(rules_query)
            all_rules = rules_res.scalars().all()

            if payload.document_type == "DISCOUNT_APPROVAL":
                # Discount policy rules:
                # Tier 1 (1-3%): Sales Manager
                # Tier 2 (3.01-7%): Head of Sales
                # Tier 3 (>7%): Managing Director
                # A discount of 5% requires Tier 1 + Tier 2. A discount of 8% requires Tier 1 + Tier 2 + Tier 3.
                for r in all_rules:
                    if amount >= r.min_threshold:
                        applicable_rules.append(r)
                    elif not applicable_rules:
                        applicable_rules.append(r)
            elif payload.document_type == "PURCHASE_ORDER":
                # PO financial limits:
                # < 1 Lakh: Tier 1 (Project Engineer)
                # 1 to 10 Lakh: Tier 1 + Tier 2 (Procurement Head)
                # > 10 Lakh: Tier 1 + Tier 2 + Tier 3 (COO/MD)
                for r in all_rules:
                    applicable_rules.append(r)
                    if r.max_threshold is not None and amount <= r.max_threshold:
                        break
            elif payload.document_type == "BOOKING_CANCELLATION":
                # Mandatory sequential 3-tier
                applicable_rules = list(all_rules)
            else:
                for r in all_rules:
                    if r.min_threshold <= amount and (r.max_threshold is None or amount <= r.max_threshold):
                        applicable_rules.append(r)

        if not applicable_rules:
            # Fallback default tier if no specific rule matched
            fallback_role = "SALES_MANAGER" if "DISCOUNT" in payload.document_type else "MANAGING_DIRECTOR"
            req_count = (await session.execute(select(func.count(ApprovalRequest.id)))).scalar() or 0
            req_num = f"REQ-2026-{req_count + 1:04d}"
            req = ApprovalRequest(
                request_number=req_num,
                document_type=payload.document_type,
                document_id=payload.document_id,
                document_reference_no=payload.document_reference_no,
                project_id=payload.project_id,
                maker_user_name=payload.maker_user_name,
                maker_notes=payload.maker_notes,
                financial_amount=amount,
                total_tiers=1,
                current_tier=1,
                status="PENDING",
                document_summary=payload.document_summary
            )
            session.add(req)
            await session.flush()

            step = ApprovalStep(
                request_id=req.id,
                tier_level=1,
                tier_name="Executive Authorization",
                required_role=fallback_role,
                status="PENDING",
                notification_sent_web=True
            )
            session.add(step)

            audit = ApprovalAuditLog(
                request_id=req.id,
                action="SUBMITTED",
                performed_by_name=payload.maker_user_name,
                comment=f"Created request {req_num} for {payload.document_reference_no}"
            )
            session.add(audit)
            await session.flush()
            return req

        req_count = (await session.execute(select(func.count(ApprovalRequest.id)))).scalar() or 0
        req_num = f"REQ-2026-{req_count + 1:04d}"

        req = ApprovalRequest(
            request_number=req_num,
            document_type=payload.document_type,
            document_id=payload.document_id,
            document_reference_no=payload.document_reference_no,
            project_id=payload.project_id,
            maker_user_name=payload.maker_user_name,
            maker_notes=payload.maker_notes,
            financial_amount=amount,
            total_tiers=len(applicable_rules),
            current_tier=1,
            status="PENDING",
            document_summary=payload.document_summary
        )
        session.add(req)
        await session.flush()

        for idx, rule in enumerate(applicable_rules, 1):
            step = ApprovalStep(
                request_id=req.id,
                tier_level=idx,
                tier_name=rule.tier_name,
                required_role=rule.required_role,
                assigned_user_id=rule.approver_user_id,
                status="PENDING",
                notification_sent_web=True,
                notification_sent_mobile=(idx == 1),
                notification_sent_email=(idx == 1)
            )
            session.add(step)

        # Audit Log
        audit = ApprovalAuditLog(
            request_id=req.id,
            action="SUBMITTED",
            performed_by_name=payload.maker_user_name,
            comment=f"Submitted {payload.document_type} ({payload.document_reference_no}) requiring {len(applicable_rules)}-tier approval."
        )
        session.add(audit)

        # Multi-Channel Notification for Tier 1 Approvers
        first_rule = applicable_rules[0]
        notif = GovernanceNotification(
            recipient_user_id=first_rule.approver_user_id or 1,
            request_id=req.id,
            channel="WEB",
            title=f"New Approval Required: {payload.document_reference_no}",
            body=f"{payload.maker_user_name} raised {payload.document_type} requiring your {first_rule.tier_name}.",
            action_url=f"/governance/approvals?id={req.id}",
            status="DELIVERED"
        )
        session.add(notif)

        await session.flush()
        return req

    @staticmethod
    async def process_step_action(
        session: AsyncSession,
        request_id: int,
        step_id: int,
        payload: ApprovalActionRequest
    ) -> Tuple[ApprovalRequest, ApprovalStep]:
        """
        Executes Approve, Reject, or Request Correction on a specific tier step.
        Generates SHA-256 digital stamp, updates request current_tier, and appends audit trail.
        """
        step = (await session.execute(
            select(ApprovalStep).where(
                ApprovalStep.id == step_id,
                ApprovalStep.request_id == request_id
            )
        )).scalar_one_or_none()

        if not step:
            raise HTTPException(status_code=404, detail="Approval step not found.")

        req = (await session.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == request_id)
        )).scalar_one_or_none()

        if not req:
            raise HTTPException(status_code=404, detail="Approval request not found.")

        if step.status != "PENDING":
            raise HTTPException(
                status_code=400,
                detail=f"This step has already been acted upon (Status: {step.status})."
            )

        now_utc = datetime.now(timezone.utc)
        action_upper = payload.action.upper()

        # Compute SHA-256 digital verification hash for non-repudiation
        hash_payload = f"{req.request_number}:{step.id}:{action_upper}:{payload.approver_name}:{now_utc.isoformat()}"
        step.verification_hash = hashlib.sha256(hash_payload.encode()).hexdigest()
        step.action_by_user_name = payload.approver_name
        step.action_timestamp = now_utc
        step.action_ip_address = payload.ip_address
        step.comments = payload.comments

        if action_upper == "APPROVE":
            step.status = "APPROVED"

            if req.current_tier < req.total_tiers:
                # Advance to next tier
                req.current_tier += 1
                # Trigger notification for next tier
                next_step = (await session.execute(
                    select(ApprovalStep).where(
                        ApprovalStep.request_id == req.id,
                        ApprovalStep.tier_level == req.current_tier
                    )
                )).scalar_one_or_none()

                if next_step:
                    next_step.notification_sent_web = True
                    next_notif = GovernanceNotification(
                        recipient_user_id=next_step.assigned_user_id or 1,
                        request_id=req.id,
                        channel="WEB",
                        title=f"Pending Tier {req.current_tier} Approval: {req.document_reference_no}",
                        body=f"Step {step.tier_level} approved by {payload.approver_name}. Your authorization is required.",
                        action_url=f"/governance/approvals?id={req.id}",
                        status="DELIVERED"
                    )
                    session.add(next_notif)

                # Audit Log
                audit = ApprovalAuditLog(
                    request_id=req.id,
                    step_id=step.id,
                    action="APPROVED",
                    performed_by_name=payload.approver_name,
                    ip_address=payload.ip_address,
                    comment=f"Tier {step.tier_level} ({step.tier_name}) approved. Advanced to Tier {req.current_tier}. Comments: {payload.comments or 'None'}"
                )
                session.add(audit)
            else:
                # Final tier completed -> Entire request is fully APPROVED
                req.status = "APPROVED"
                req.final_action_timestamp = now_utc

                audit = ApprovalAuditLog(
                    request_id=req.id,
                    step_id=step.id,
                    action="FINAL_APPROVED",
                    performed_by_name=payload.approver_name,
                    ip_address=payload.ip_address,
                    comment=f"Final Tier {step.tier_level} approved. Document {req.document_reference_no} is fully authorized. Comments: {payload.comments or 'None'}"
                )
                session.add(audit)

                # Final approval notification to Maker
                done_notif = GovernanceNotification(
                    recipient_user_id=req.maker_user_id or 1,
                    request_id=req.id,
                    channel="EMAIL",
                    title=f"Document Approved: {req.document_reference_no}",
                    body=f"Your {req.document_type} has received all required authorizations and is now ACTIVE.",
                    action_url=f"/governance/approvals?id={req.id}",
                    status="DELIVERED"
                )
                session.add(done_notif)

        elif action_upper == "REJECT":
            step.status = "REJECTED"
            req.status = "REJECTED"
            req.final_action_timestamp = now_utc

            audit = ApprovalAuditLog(
                request_id=req.id,
                step_id=step.id,
                action="REJECTED",
                performed_by_name=payload.approver_name,
                ip_address=payload.ip_address,
                comment=f"Tier {step.tier_level} rejected. Document {req.document_reference_no} cancelled. Reason: {payload.comments or 'No reason provided'}"
            )
            session.add(audit)

            reject_notif = GovernanceNotification(
                recipient_user_id=req.maker_user_id or 1,
                request_id=req.id,
                channel="WEB",
                title=f"Document Rejected: {req.document_reference_no}",
                body=f"Your {req.document_type} was rejected by {payload.approver_name}. Reason: {payload.comments}",
                action_url=f"/governance/approvals?id={req.id}",
                status="DELIVERED"
            )
            session.add(reject_notif)

        elif action_upper == "REQUEST_CORRECTION":
            step.status = "CORRECTION_REQUESTED"
            req.status = "CORRECTION_REQUESTED"

            audit = ApprovalAuditLog(
                request_id=req.id,
                step_id=step.id,
                action="CORRECTION_REQUESTED",
                performed_by_name=payload.approver_name,
                ip_address=payload.ip_address,
                comment=f"Tier {step.tier_level} requested corrections: {payload.comments}"
            )
            session.add(audit)

            corr_notif = GovernanceNotification(
                recipient_user_id=req.maker_user_id or 1,
                request_id=req.id,
                channel="WEB",
                title=f"Correction Needed: {req.document_reference_no}",
                body=f"{payload.approver_name} requested amendments: {payload.comments}",
                action_url=f"/governance/approvals?id={req.id}",
                status="DELIVERED"
            )
            session.add(corr_notif)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported action: {payload.action}")

        await session.flush()
        return req, step
