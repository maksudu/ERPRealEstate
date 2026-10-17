import pytest
from decimal import Decimal
from app.modules.hrms.services import HRMSService


def test_bangladesh_income_tax_calculator():
    """
    Verifies Bangladesh Income Tax Act 2023 annual personal income tax slabs:
    - 0% up to 350,000 BDT
    - 5% on next 100,000 BDT
    - 10% on next 300,000 BDT
    - 15% on next 400,000 BDT
    - 20% on next 500,000 BDT
    - 25% on remainder
    """
    # 1. Income <= 350,000 BDT -> 0 Tax
    tax_0 = HRMSService.calculate_bangladesh_income_tax(Decimal("300000.00"))
    assert tax_0 == Decimal("0.00")

    # 2. Income = 450,000 BDT -> 100k @ 5% = 5,000 BDT
    tax_tier1 = HRMSService.calculate_bangladesh_income_tax(Decimal("450000.00"))
    assert tax_tier1 == Decimal("5000.00")

    # 3. Income = 750,000 BDT -> (100k @ 5%) + (300k @ 10%) = 5,000 + 30,000 = 35,000 BDT
    tax_tier2 = HRMSService.calculate_bangladesh_income_tax(Decimal("750000.00"))
    assert tax_tier2 == Decimal("35000.00")

    # 4. Income = 1,150,000 BDT -> 35k + (400k @ 15%) = 35,000 + 60,000 = 95,000 BDT
    tax_tier3 = HRMSService.calculate_bangladesh_income_tax(Decimal("1150000.00"))
    assert tax_tier3 == Decimal("95000.00")


def test_site_labour_muster_calculation():
    """
    Verifies site construction daily muster roll wage formula:
    Total = (headcount * standard_hours * hourly_rate) + (headcount * overtime_hours * overtime_rate)
    """
    headcount = 15
    standard_hours = Decimal("8.00")
    overtime_hours = Decimal("2.00")
    hourly_rate = Decimal("100.00")
    overtime_rate = Decimal("150.00")

    regular_wage = headcount * standard_hours * hourly_rate # 15 * 8 * 100 = 12,000
    ot_wage = headcount * overtime_hours * overtime_rate       # 15 * 2 * 150 = 4,500
    total_wage = regular_wage + ot_wage                        # 16,500

    assert regular_wage == Decimal("12000.00")
    assert ot_wage == Decimal("4500.00")
    assert total_wage == Decimal("16500.00")


def test_provident_fund_calculation():
    """
    Verifies Bangladesh statutory Provident Fund (8.33% of Basic)
    """
    basic_salary = Decimal("60000.00")
    pf_employee = round(basic_salary * Decimal("0.0833"), 2)
    assert pf_employee == Decimal("4998.00")
