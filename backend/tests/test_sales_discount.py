import pytest

def compute_discount_matrix(base_price: float, discount_amount: float):
    """
    Simulates the core business rule from sales/router.py:
    - Discount <= 1.0%: Sales Manager Approval (auto-approved)
    - 1.0% < Discount <= 3.0%: Director Approval required
    - Discount > 3.0%: Managing Director (MD) Approval required
    """
    if discount_amount > base_price:
        raise ValueError("Discount cannot exceed base unit price.")

    discount_percent = (discount_amount / base_price * 100.0) if base_price > 0 else 0.0

    if discount_percent <= 0.0:
        approval_status = "APPROVED"
        approval_tier = "NONE"
    elif discount_percent <= 1.0:
        approval_status = "APPROVED"
        approval_tier = "SALES_MANAGER"
    elif discount_percent <= 3.0:
        approval_status = "PENDING_APPROVAL"
        approval_tier = "DIRECTOR"
    else:
        approval_status = "PENDING_APPROVAL"
        approval_tier = "MANAGING_DIRECTOR"

    return {
        "discount_percent": round(discount_percent, 2),
        "approval_status": approval_status,
        "approval_tier": approval_tier
    }


def test_discount_manager_tier():
    """
    Test 0.8% discount on 1.5 Crore unit:
    Base: 15,000,000 BDT
    Discount: 120,000 BDT (0.8%)
    Tier: SALES_MANAGER (Auto-Approved)
    """
    res = compute_discount_matrix(base_price=15000000.0, discount_amount=120000.0)
    assert res["discount_percent"] == 0.80
    assert res["approval_status"] == "APPROVED"
    assert res["approval_tier"] == "SALES_MANAGER"


def test_discount_director_tier():
    """
    Test 2.5% discount on 1.5 Crore unit:
    Base: 15,000,000 BDT
    Discount: 375,000 BDT (2.5%)
    Tier: DIRECTOR (Requires Director 1-Tap Biometric Approval)
    """
    res = compute_discount_matrix(base_price=15000000.0, discount_amount=375000.0)
    assert res["discount_percent"] == 2.50
    assert res["approval_status"] == "PENDING_APPROVAL"
    assert res["approval_tier"] == "DIRECTOR"


def test_discount_managing_director_tier():
    """
    Test 5.0% discount on 1.5 Crore unit:
    Base: 15,000,000 BDT
    Discount: 750,000 BDT (5.0%)
    Tier: MANAGING_DIRECTOR (Requires MD 1-Tap Biometric Approval)
    """
    res = compute_discount_matrix(base_price=15000000.0, discount_amount=750000.0)
    assert res["discount_percent"] == 5.00
    assert res["approval_status"] == "PENDING_APPROVAL"
    assert res["approval_tier"] == "MANAGING_DIRECTOR"


def test_discount_exceeding_base_price_rejected():
    """
    Discounts greater than the base unit price must raise an exception.
    """
    with pytest.raises(ValueError) as exc_info:
        compute_discount_matrix(base_price=10000000.0, discount_amount=12000000.0)
    assert "Discount cannot exceed base unit price" in str(exc_info.value)
