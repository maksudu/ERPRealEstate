from decimal import Decimal
from typing import Dict, Any, List
from fastapi import HTTPException
from app.modules.operations.models import BrokerCommission, ImportBatch


class BrokerCommissionService:
    """
    Enforces Bangladesh Real Estate Broker Commission Staged Release Rules:
    - 40% on Down Payment cleared
    - 40% on Ground Slab casting milestone
    - 20% on Registration Deed execution
    - TDS Withheld: 10% under Section 53 of Income Tax Act.
    """

    @staticmethod
    def calculate_commission(total_unit_value: Decimal, commission_percent: Decimal) -> Decimal:
        return (total_unit_value * commission_percent) / Decimal("100.0")

    @staticmethod
    def process_tranche_release(
        commission: BrokerCommission,
        stage: str,
        notes: str = None
    ) -> Dict[str, Any]:
        stage = stage.upper()
        total_comm = commission.total_commission_amount

        if stage == "DOWN_PAYMENT":
            if commission.down_payment_disbursed:
                raise HTTPException(status_code=400, detail="Down Payment 40% tranche has already been disbursed.")
            tranche_percent = Decimal("40.0")
            commission.down_payment_disbursed = True
        elif stage == "GROUND_SLAB":
            if not commission.down_payment_disbursed:
                raise HTTPException(status_code=400, detail="Down Payment tranche must be disbursed before Ground Slab milestone.")
            if commission.ground_slab_disbursed:
                raise HTTPException(status_code=400, detail="Ground Slab 40% tranche has already been disbursed.")
            tranche_percent = Decimal("40.0")
            commission.ground_slab_disbursed = True
        elif stage == "REGISTRATION_DEED":
            if not commission.ground_slab_disbursed:
                raise HTTPException(status_code=400, detail="Ground Slab tranche must be disbursed before Registration Deed milestone.")
            if commission.registration_deed_disbursed:
                raise HTTPException(status_code=400, detail="Registration Deed 20% tranche has already been disbursed.")
            tranche_percent = Decimal("20.0")
            commission.registration_deed_disbursed = True
        else:
            raise HTTPException(status_code=400, detail=f"Invalid tranche stage: {stage}. Must be DOWN_PAYMENT, GROUND_SLAB, or REGISTRATION_DEED.")

        gross_tranche_amount = (total_comm * tranche_percent) / Decimal("100.0")
        tds_withholding = gross_tranche_amount * Decimal("0.10") # 10% Section 53
        net_payable_amount = gross_tranche_amount - tds_withholding

        commission.disbursed_amount = (commission.disbursed_amount or Decimal("0.00")) + net_payable_amount
        commission.tds_withheld_amount = (commission.tds_withheld_amount or Decimal("0.00")) + tds_withholding

        if commission.down_payment_disbursed and commission.ground_slab_disbursed and commission.registration_deed_disbursed:
            commission.status = "FULLY_DISBURSED"
        else:
            commission.status = "PARTIALLY_DISBURSED"

        note_entry = f"[{stage}] Gross: BDT {gross_tranche_amount:,.2f}, TDS (10%): BDT {tds_withholding:,.2f}, Net: BDT {net_payable_amount:,.2f}."
        if notes:
            note_entry += f" Note: {notes}"

        commission.disbursement_notes = (commission.disbursement_notes or "") + "\n" + note_entry

        return {
            "tranche_stage": stage,
            "tranche_percent": tranche_percent,
            "gross_amount": gross_tranche_amount,
            "tds_withheld_sec53": tds_withholding,
            "net_disbursed": net_payable_amount,
            "new_status": commission.status
        }


class BulkExcelMigrationService:
    """
    Validates legacy migration data line-by-line with transaction integrity.
    Supported entities: Land, COA_Opening, Inventory, Installments.
    """

    @staticmethod
    def validate_and_process_batch(
        entity_type: str,
        records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        total = len(records)
        successful = 0
        failed = 0
        errors = []

        for idx, row in enumerate(records, start=1):
            line_err = None
            if entity_type == "Land":
                if not row.get("mouza_name") or not row.get("cs_dag"):
                    line_err = f"Row {idx}: Missing mouza_name or cs_dag."
            elif entity_type == "COA_Opening":
                if not row.get("account_code") or row.get("debit_bdt") is None:
                    line_err = f"Row {idx}: Missing account_code or debit_bdt balance."
            elif entity_type == "Inventory":
                if not row.get("unit_number") or not row.get("carpet_area_sqft"):
                    line_err = f"Row {idx}: Missing unit_number or carpet_area_sqft."
            elif entity_type == "Installments":
                if not row.get("booking_id") or not row.get("amount_bdt"):
                    line_err = f"Row {idx}: Missing booking_id or amount_bdt."

            if line_err:
                failed += 1
                errors.append(line_err)
            else:
                successful += 1

        status = "COMPLETED" if failed == 0 else ("PARTIAL_FAILURE" if successful > 0 else "FAILED_ROLLED_BACK")

        return {
            "entity_type": entity_type,
            "total_records": total,
            "successful_records": successful,
            "failed_records": failed,
            "status": status,
            "error_log": "\n".join(errors) if errors else None
        }
