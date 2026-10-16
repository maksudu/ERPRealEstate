import asyncio
import logging
from datetime import date, timedelta
from typing import Dict, Any, List
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.sms import send_sms
from app.modules.installments.models import PDCVault, NI138LegalAction
from app.modules.crm.models import Customer

logger = logging.getLogger("erp.installments.tasks")


# ==============================================================================
# Async Implementation Functions (Reused by Celery & FastAPI Endpoints)
# ==============================================================================

async def execute_check_upcoming_pdc_cheques() -> Dict[str, Any]:
    """
    Finds all PDC cheques in sls_pdc_vault where:
      - maturity_date == today + 3 days
      - status in ('IN_VAULT', 'In_Vault')
      - sms_reminder_sent == False
    Sends statutory client notification SMS via Bangladesh SMS Gateway and marks sent.
    """
    today = date.today()
    target_maturity_date = today + timedelta(days=3)
    logger.info(f"🔍 [PDC TASK] Scanning sls_pdc_vault for cheques maturing on {target_maturity_date} (3 days ahead)...")

    dispatched_reminders: List[Dict[str, Any]] = []

    async with AsyncSessionLocal() as session:
        stmt = (
            select(PDCVault)
            .options(selectinload(PDCVault.customer), selectinload(PDCVault.booking))
            .where(
                and_(
                    PDCVault.maturity_date == target_maturity_date,
                    PDCVault.status.in_(["IN_VAULT", "In_Vault"]),
                    PDCVault.sms_reminder_sent.is_(False)
                )
            )
        )
        result = await session.execute(stmt)
        cheques = result.scalars().all()

        logger.info(f"📋 [PDC TASK] Found {len(cheques)} upcoming PDC cheque(s) requiring 3-day maturation alert.")

        for cheque in cheques:
            customer = cheque.customer
            phone = customer.primary_phone if customer else None
            customer_name = customer.full_name_en if customer else "Valued Client"
            amount_str = f"{float(cheque.cheque_amount):,.2f}"
            date_str = cheque.maturity_date.strftime("%d-%b-%Y")

            # Mandatory Bangladesh SMS Reminder Text
            sms_body = (
                f"Dear Client, your cheque #{cheque.cheque_number} of BDT {amount_str} "
                f"will be deposited on {date_str}. Please ensure sufficient balance. - Bengal Real Estate"
            )

            sms_result = {"success": False, "mode": "NO_PHONE"}
            if phone:
                sms_result = send_sms(recipient=phone, message=sms_body)
            else:
                logger.warning(f"⚠️ [PDC TASK] Cheque #{cheque.cheque_number} (ID: {cheque.id}) has no customer phone registered.")

            # Mark reminder sent to prevent duplicate SMS
            cheque.sms_reminder_sent = True
            dispatched_reminders.append({
                "cheque_id": cheque.id,
                "cheque_number": cheque.cheque_number,
                "customer_name": customer_name,
                "customer_phone": phone,
                "amount": float(cheque.cheque_amount),
                "maturity_date": str(cheque.maturity_date),
                "sms_dispatched": sms_result.get("success", False),
                "sms_mode": sms_result.get("mode", "UNKNOWN")
            })

        if cheques:
            await session.commit()
            logger.info(f"💾 [PDC TASK] Committed {len(cheques)} updated PDC records with sms_reminder_sent=True.")

    return {
        "status": "SUCCESS",
        "task_name": "check_upcoming_pdc_cheques_task",
        "target_maturity_date": str(target_maturity_date),
        "total_identified": len(dispatched_reminders),
        "reminders_dispatched": len(dispatched_reminders),
        "details": dispatched_reminders
    }


async def execute_check_statutory_ni138_deadlines() -> Dict[str, Any]:
    """
    Scans sls_ni138_legal_actions for open Section 138 legal notices where:
      - status == 'NOTICE_SERVED'
      - client_30day_settlement_deadline <= today
    The statutory 30-day settlement window has expired without settlement.
    Prompts the legal team to file a formal Criminal Court Case before the
    Chief Metropolitan Magistrate (CMM) or Chief Judicial Magistrate (CJM) court
    within the 30-day statutory limitation window (Section 142 NI Act 1881).
    """
    today = date.today()
    logger.info(f"⚖️ [NI 138 TASK] Scanning open Section 138 legal notices with settlement deadlines on or before {today}...")

    litigation_prompts: List[Dict[str, Any]] = []

    async with AsyncSessionLocal() as session:
        stmt = (
            select(NI138LegalAction)
            .options(
                selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.customer),
                selectinload(NI138LegalAction.pdc_cheque).selectinload(PDCVault.booking)
            )
            .where(
                and_(
                    NI138LegalAction.status == "NOTICE_SERVED",
                    NI138LegalAction.client_30day_settlement_deadline <= today
                )
            )
        )
        result = await session.execute(stmt)
        expired_actions = result.scalars().all()

        logger.info(f"⚖️ [NI 138 TASK] Identified {len(expired_actions)} expired 30-day statutory notice(s) requiring court litigation.")

        for action in expired_actions:
            cheque = action.pdc_cheque
            customer = cheque.customer if cheque else None
            customer_name = customer.full_name_en if customer else "N/A"
            customer_phone = customer.primary_phone if customer else "N/A"
            cheque_no = cheque.cheque_number if cheque else "N/A"
            cheque_amt = float(cheque.cheque_amount) if cheque else 0.0

            deadline = action.client_30day_settlement_deadline
            days_overdue = (today - deadline).days
            # Under Section 142(1)(b) NI Act 1881: Case must be filed within 30 days of cause of action
            limitation_deadline = deadline + timedelta(days=30)
            days_to_limitation = (limitation_deadline - today).days

            alert_header = (
                f"🚨 [NI ACT 138 CRIMINAL LITIGATION WARNING] "
                f"Notice ID #{action.id} | Cheque #{cheque_no} | BDT {cheque_amt:,.2f}"
            )
            alert_details = (
                f"Debtor: {customer_name} (Phone: {customer_phone})\n"
                f"Registered Post A/D: {action.registered_post_ad_no}\n"
                f"30-Day Settlement Deadline Expired On: {deadline} ({days_overdue} days ago)\n"
                f"Statutory Court Limitation Deadline: {limitation_deadline} ({days_to_limitation} days remaining)\n"
                f"Action Required: Immediately file Criminal Case (C.R. Case) before CMM/CJM Court under Section 138 NI Act 1881."
            )
            logger.warning(f"\n{alert_header}\n{alert_details}")

            # Send prompt SMS to legal team alert phone
            legal_phone = settings.LEGAL_TEAM_ALERT_PHONE
            sms_prompt = (
                f"LEGAL ALERT: 30-day settlement window expired on {deadline} for Cheque #{cheque_no} "
                f"(BDT {cheque_amt:,.2f}). Client: {customer_name}. File C.R. Case under Sec 138 NI Act immediately. "
                f"Limitation ends {limitation_deadline}. - Bengal Real Estate Legal Dept"
            )
            sms_res = send_sms(recipient=legal_phone, message=sms_prompt)

            # Update remarks in the database record with audit trail
            today_stamp = str(today)
            existing_remarks = action.remarks or ""
            if f"[STATUTORY LITIGATION ALERT - {today_stamp}]" not in existing_remarks:
                audit_note = (
                    f"\n[STATUTORY LITIGATION ALERT - {today_stamp}]: "
                    f"30-day statutory settlement window expired on {deadline}. "
                    f"Criminal liability attached under Section 138 NI Act 1881. "
                    f"Limitation deadline for filing C.R. Case in CMM Court is {limitation_deadline} "
                    f"({days_to_limitation} days remaining)."
                )
                action.remarks = f"{existing_remarks}{audit_note}".strip()

            litigation_prompts.append({
                "legal_action_id": action.id,
                "cheque_number": cheque_no,
                "cheque_amount": cheque_amt,
                "customer_name": customer_name,
                "customer_phone": customer_phone,
                "registered_post_ad_no": action.registered_post_ad_no,
                "settlement_deadline": str(deadline),
                "days_overdue": days_overdue,
                "limitation_deadline": str(limitation_deadline),
                "days_to_limitation": days_to_limitation,
                "legal_team_notified": sms_res.get("success", False)
            })

        if expired_actions:
            await session.commit()
            logger.info(f"💾 [NI 138 TASK] Committed {len(expired_actions)} updated NI 138 legal action records.")

    return {
        "status": "SUCCESS",
        "task_name": "check_statutory_ni138_deadlines_task",
        "scan_date": str(today),
        "total_expired_notices": len(litigation_prompts),
        "details": litigation_prompts
    }


_task_loop = None

def run_async_task(coro):
    """
    Executes an async coroutine within a persistent event loop per worker thread/process.
    Prevents closing the event loop which invalidates aiomysql database connection pools.
    """
    global _task_loop
    if _task_loop is None or _task_loop.is_closed():
        _task_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_task_loop)
    return _task_loop.run_until_complete(coro)


# ==============================================================================
# Celery Periodic Distributed Tasks
# ==============================================================================

@celery_app.task(name="app.modules.installments.tasks.check_upcoming_pdc_cheques_task", bind=True)
def check_upcoming_pdc_cheques_task(self=None) -> Dict[str, Any]:
    """
    Celery task running daily at 08:00 AM (Dhaka time):
    Finds all PDC cheques in sls_pdc_vault where maturity_date == today + 3 days
    and status in ('IN_VAULT', 'In_Vault').
    Sends SMS reminders to client phones via Bangladesh SMS Gateway.
    """
    logger.info("⏰ [CELERY BEAT 08:00 AM] Starting check_upcoming_pdc_cheques_task...")
    try:
        return run_async_task(execute_check_upcoming_pdc_cheques())
    except Exception as exc:
        logger.exception(f"❌ [CELERY TASK ERROR] check_upcoming_pdc_cheques_task failed: {exc}")
        raise exc


@celery_app.task(name="app.modules.installments.tasks.check_statutory_ni138_deadlines_task", bind=True)
def check_statutory_ni138_deadlines_task(self=None) -> Dict[str, Any]:
    """
    Celery task running daily at 09:00 AM (Dhaka time):
    Checks open Section 138 legal notices where the 30-day statutory settlement
    window has expired, and alerts legal counsel to file criminal court cases.
    """
    logger.info("⏰ [CELERY BEAT 09:00 AM] Starting check_statutory_ni138_deadlines_task...")
    try:
        return run_async_task(execute_check_statutory_ni138_deadlines())
    except Exception as exc:
        logger.exception(f"❌ [CELERY TASK ERROR] check_statutory_ni138_deadlines_task failed: {exc}")
        raise exc
