from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List, Dict, Any

from app.modules.hrms.models import (
    Department, Designation, Employee, SiteLabourContractor,
    LabourMusterRoll, Attendance, LeaveApplication, PayrollRun, Payslip
)
from app.modules.accounts.models import Voucher, JournalEntry, ChartOfAccount
from app.modules.projects.models import Project


class HRMSService:

    @staticmethod
    def calculate_bangladesh_income_tax(annual_taxable_income: Decimal) -> Decimal:
        """
        Calculates annual personal income tax under Bangladesh Income Tax Act 2023:
        - 1st 350,000 BDT: 0%
        - Next 100,000 BDT: 5%
        - Next 300,000 BDT: 10%
        - Next 400,000 BDT: 15%
        - Next 500,000 BDT: 20%
        - Balance: 25%
        """
        income = float(annual_taxable_income)
        if income <= 350000:
            return Decimal("0.00")

        tax = 0.0
        income -= 350000

        # Tier 1: Next 100k @ 5%
        tier1 = min(income, 100000)
        tax += tier1 * 0.05
        income -= tier1

        if income > 0:
            # Tier 2: Next 300k @ 10%
            tier2 = min(income, 300000)
            tax += tier2 * 0.10
            income -= tier2

        if income > 0:
            # Tier 3: Next 400k @ 15%
            tier3 = min(income, 400000)
            tax += tier3 * 0.15
            income -= tier3

        if income > 0:
            # Tier 4: Next 500k @ 20%
            tier4 = min(income, 500000)
            tax += tier4 * 0.20
            income -= tier4

        if income > 0:
            # Tier 5: Balance @ 25%
            tax += income * 0.25

        # Minimum tax rule for Dhaka/Chittagong City Corporation: 5,000 BDT/yr
        if tax > 0 and tax < 5000:
            tax = 5000.0

        return Decimal(str(round(tax, 2)))

    @classmethod
    async def generate_monthly_payroll(
        cls, db: AsyncSession, organization_id: int, month: int, year: int, project_id: Optional[int] = None, user_id: Optional[int] = None
    ) -> PayrollRun:
        """
        Generates full monthly payroll batch for corporate staff or specific construction project site staff.
        """
        # Query active employees matching the project criteria
        query = select(Employee).where(
            and_(
                Employee.organization_id == organization_id,
                Employee.status == "ACTIVE"
            )
        )
        if project_id:
            query = query.where(Employee.assigned_project_id == project_id)
        else:
            query = query.where(Employee.assigned_project_id.is_(None))

        result = await db.execute(query)
        employees = result.scalars().all()

        payroll_run = PayrollRun(
            organization_id=organization_id,
            month=month,
            year=year,
            project_id=project_id,
            total_gross=Decimal("0.00"),
            total_deductions=Decimal("0.00"),
            total_net=Decimal("0.00"),
            status="DRAFT",
            created_by_id=user_id
        )
        db.add(payroll_run)
        await db.flush()

        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_net = Decimal("0.00")

        for emp in employees:
            basic = emp.basic_salary or Decimal("0.00")
            house_rent = emp.house_rent_allowance or Decimal("0.00")
            medical = emp.medical_allowance or Decimal("0.00")
            conveyance = emp.conveyance_allowance or Decimal("0.00")
            hazard = emp.site_hazard_allowance or Decimal("0.00")
            mobile = emp.mobile_allowance or Decimal("0.00")

            gross = basic + house_rent + medical + conveyance + hazard + mobile

            # Overtime: 0 by default, can be fetched from attendance
            ot_amount = Decimal("0.00")

            # Provident Fund: 8.33% of Basic
            pf = Decimal("0.00")
            if emp.is_pf_eligible and basic > 0:
                pf = round(basic * Decimal("0.0833"), 2)

            # Income Tax TDS: Annualized gross -> slab / 12
            tax_tds = Decimal("0.00")
            if emp.is_tax_eligible and gross > 0:
                annual_gross = gross * Decimal("12.0")
                annual_tax = cls.calculate_bangladesh_income_tax(annual_gross)
                tax_tds = round(annual_tax / Decimal("12.0"), 2)

            deductions = pf + tax_tds
            net = (gross + ot_amount) - deductions

            payslip = Payslip(
                payroll_run_id=payroll_run.id,
                employee_id=emp.id,
                basic_salary=basic,
                house_rent=house_rent,
                medical=medical,
                conveyance=conveyance,
                site_hazard_allowance=hazard,
                mobile_allowance=mobile,
                overtime_hours=Decimal("0.00"),
                overtime_amount=ot_amount,
                sales_commission=Decimal("0.00"),
                festival_bonus=Decimal("0.00"),
                gross_earnings=gross,
                pf_deduction=pf,
                tax_tds_deduction=tax_tds,
                advance_salary_deduction=Decimal("0.00"),
                loan_emi_deduction=Decimal("0.00"),
                total_deductions=deductions,
                net_payable=net,
                payment_status="PENDING"
            )
            db.add(payslip)

            total_gross += gross
            total_deductions += deductions
            total_net += net

        payroll_run.total_gross = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_net = total_net

        await db.commit()
        await db.refresh(payroll_run)
        return payroll_run

    @classmethod
    async def disburse_payroll_with_accounting_entry(
        cls, db: AsyncSession, organization_id: int, payroll_run_id: int, user_id: Optional[int] = None
    ) -> PayrollRun:
        """
        Disburses payroll and automatically generates double-entry voucher in General Ledger:
        DEBIT: Project Labour / Corporate Salary Expense (Cost Center)
        CREDIT: Bank Account / Salary Payable
        """
        q = select(PayrollRun).where(PayrollRun.id == payroll_run_id)
        res = await db.execute(q)
        payroll_run = res.scalar_one_or_none()
        if not payroll_run:
            raise ValueError("Payroll run not found")

        # Find or use standard accounts for Salary Expense and Bank
        acc_q = select(ChartOfAccount).where(
            and_(
                ChartOfAccount.organization_id == organization_id,
                ChartOfAccount.account_type == "Expense"
            )
        ).limit(1)
        expense_acc_res = await db.execute(acc_q)
        expense_acc = expense_acc_res.scalar_one_or_none()

        bank_q = select(ChartOfAccount).where(
            and_(
                ChartOfAccount.organization_id == organization_id,
                ChartOfAccount.account_type == "Asset"
            )
        ).limit(1)
        bank_acc_res = await db.execute(bank_q)
        bank_acc = bank_acc_res.scalar_one_or_none()

        voucher_id = None
        if expense_acc and bank_acc:
            voucher_no = f"JV-PAYROLL-{payroll_run.year}-{payroll_run.month:02d}-{payroll_run.id}"
            narration = f"Disbursement of Payroll for {payroll_run.month:02d}/{payroll_run.year} - Net: BDT {payroll_run.total_net:,.2f}"
            if payroll_run.project_id:
                narration += f" (Site Staff Project #{payroll_run.project_id})"

            voucher = Voucher(
                organization_id=organization_id,
                project_id=payroll_run.project_id,
                voucher_number=voucher_no,
                voucher_type="Bank_Payment",
                voucher_date=date.today(),
                narration=narration,
                total_debit_amount=payroll_run.total_gross,
                total_credit_amount=payroll_run.total_gross,
                status="Posted"
            )
            db.add(voucher)
            await db.flush()

            # Debit Expense
            debit_entry = JournalEntry(
                organization_id=organization_id,
                voucher_id=voucher.id,
                account_id=expense_acc.id,
                project_id=payroll_run.project_id,
                debit_amount=payroll_run.total_gross,
                credit_amount=Decimal("0.00"),
                narration=f"Gross Salary Expense ({payroll_run.month:02d}/{payroll_run.year})"
            )
            # Credit Bank
            credit_entry = JournalEntry(
                organization_id=organization_id,
                voucher_id=voucher.id,
                account_id=bank_acc.id,
                project_id=payroll_run.project_id,
                debit_amount=Decimal("0.00"),
                credit_amount=payroll_run.total_gross,
                narration=f"Bank Disbursal for Payroll ({payroll_run.month:02d}/{payroll_run.year})"
            )
            db.add_all([debit_entry, credit_entry])
            voucher_id = voucher.id

        payroll_run.status = "DISBURSED"
        payroll_run.disbursement_date = date.today()
        payroll_run.voucher_id = voucher_id
        payroll_run.approved_by_id = user_id

        # Update all payslips to PAID
        payslip_q = select(Payslip).where(Payslip.payroll_run_id == payroll_run.id)
        payslip_res = await db.execute(payslip_q)
        for ps in payslip_res.scalars().all():
            ps.payment_status = "PAID"

        await db.commit()
        await db.refresh(payroll_run)
        return payroll_run

    @classmethod
    async def get_cockpit_stats(cls, db: AsyncSession, organization_id: int) -> Dict[str, Any]:
        """
        Computes real-time executive HR cockpit KPI metrics.
        """
        # Headcount stats
        total_emp_q = select(func.count(Employee.id)).where(
            and_(Employee.organization_id == organization_id, Employee.status == "ACTIVE")
        )
        total_emp = (await db.execute(total_emp_q)).scalar() or 0

        corp_q = select(func.count(Employee.id)).where(
            and_(
                Employee.organization_id == organization_id,
                Employee.status == "ACTIVE",
                Employee.workforce_category == "CORPORATE"
            )
        )
        corp_count = (await db.execute(corp_q)).scalar() or 0

        site_q = select(func.count(Employee.id)).where(
            and_(
                Employee.organization_id == organization_id,
                Employee.status == "ACTIVE",
                Employee.workforce_category != "CORPORATE"
            )
        )
        site_count = (await db.execute(site_q)).scalar() or 0

        # Today's attendance stats
        today = date.today()
        att_q = select(Attendance.status, func.count(Attendance.id)).where(
            and_(
                Attendance.organization_id == organization_id,
                Attendance.punch_date == today
            )
        ).group_by(Attendance.status)
        att_res = await db.execute(att_q)
        att_counts = dict(att_res.all())

        present = att_counts.get("PRESENT", 0)
        late = att_counts.get("LATE", 0)
        absent = att_counts.get("ABSENT", 0)
        on_leave = att_counts.get("LEAVE", 0)

        rate = 0.0
        if total_emp > 0:
            rate = round(((present + late) / total_emp) * 100, 1)

        # Contractor and site labour stats
        con_q = select(func.count(SiteLabourContractor.id)).where(
            and_(SiteLabourContractor.organization_id == organization_id, SiteLabourContractor.is_active == True)
        )
        active_contractors = (await db.execute(con_q)).scalar() or 0

        muster_q = select(
            func.sum(LabourMusterRoll.headcount),
            func.sum(LabourMusterRoll.total_amount)
        ).where(
            and_(
                LabourMusterRoll.organization_id == organization_id,
                LabourMusterRoll.muster_date == today
            )
        )
        muster_res = (await db.execute(muster_q)).first()
        today_muster_count = (muster_res[0] if muster_res and muster_res[0] else 0)
        today_muster_expense = Decimal(str(muster_res[1])) if muster_res and muster_res[1] else Decimal("0.00")

        # Monthly payroll liability
        pay_liability_q = select(
            func.sum(Employee.basic_salary + Employee.house_rent_allowance + Employee.medical_allowance + Employee.conveyance_allowance + Employee.site_hazard_allowance + Employee.mobile_allowance)
        ).where(
            and_(Employee.organization_id == organization_id, Employee.status == "ACTIVE")
        )
        monthly_liability = (await db.execute(pay_liability_q)).scalar() or Decimal("0.00")

        return {
            "total_employees": total_emp,
            "corporate_headcount": corp_count,
            "site_engineering_headcount": site_count,
            "today_present": present,
            "today_late": late,
            "today_absent": absent,
            "today_on_leave": on_leave,
            "attendance_rate_percent": rate,
            "active_labour_contractors": active_contractors,
            "today_site_labour_count": today_muster_count,
            "today_site_labour_expense": today_muster_expense,
            "monthly_payroll_liability": monthly_liability
        }
